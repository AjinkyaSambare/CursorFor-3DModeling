"""Simple Manim rendering service that actually executes Manim commands."""

import os
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Tuple
import uuid
import logging

logger = logging.getLogger(__name__)

class ManimRenderer:
    """Service for rendering Manim animations."""
    
    def __init__(self):
        self.manim_env = "/Users/Ajinkya25/Documents/Projects/3D-Modeling/manim_env/bin/python"
        self.storage_dir = Path("storage/videos")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
    async def render_scene(self, scene_code: str, scene_name: str = "AnimationScene") -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Render a Manim scene from code.
        
        Args:
            scene_code: Python code containing Manim scene
            scene_name: Name of the Scene class to render
            
        Returns:
            Tuple of (success, video_path, error_message)
        """
        temp_dir = None
        try:
            # Create temporary directory
            temp_dir = tempfile.mkdtemp(prefix="manim_render_")
            temp_file = Path(temp_dir) / "scene.py"
            
            # Write code to file
            temp_file.write_text(scene_code)
            
            # Run Manim
            cmd = [
                self.manim_env, "-m", "manim",
                "-qm",  # medium quality
                "--format", "mp4",
                "--disable_caching",
                str(temp_file),
                scene_name
            ]
            
            logger.info(f"Executing Manim command: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60  # 60 second timeout
            )
            
            if result.returncode == 0:
                # Manim outputs to backend/media/videos/scene/720p30/{scene_name}.mp4
                backend_media_dir = Path("media/videos/scene/720p30")
                expected_video = backend_media_dir / f"{scene_name}.mp4"
                
                if expected_video.exists():
                    # Copy video to storage
                    video_id = str(uuid.uuid4())
                    output_path = self.storage_dir / f"{video_id}.mp4"
                    shutil.copy2(expected_video, output_path)
                    
                    # Clean up the original
                    expected_video.unlink()
                    
                    logger.info(f"Video rendered successfully: {output_path}")
                    return True, str(output_path), None
                else:
                    error_msg = f"Manim completed but video not found at {expected_video}"
                    logger.error(error_msg)
                    return False, None, error_msg
            else:
                error_msg = f"Manim rendering failed:\n{result.stderr}"
                logger.error(error_msg)
                return False, None, error_msg
                
        except subprocess.TimeoutExpired:
            error_msg = "Manim rendering timed out after 60 seconds"
            logger.error(error_msg)
            return False, None, error_msg
        except Exception as e:
            error_msg = f"Unexpected error during rendering: {str(e)}"
            logger.error(error_msg)
            return False, None, error_msg
        finally:
            # Cleanup
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
    
    def validate_scene_code(self, scene_code: str) -> Tuple[bool, Optional[str]]:
        """
        Validate that the scene code has basic Manim structure.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not scene_code.strip():
            return False, "Scene code cannot be empty"
            
        if "from manim import" not in scene_code and "import manim" not in scene_code:
            return False, "Scene code must import Manim"
            
        if "class" not in scene_code or "Scene" not in scene_code:
            return False, "Scene code must contain a Scene class"
            
        if "def construct" not in scene_code:
            return False, "Scene class must have a construct method"
            
        return True, None
    
    def extract_scene_class_name(self, scene_code: str) -> str:
        """Extract the Scene class name from the code."""
        import re
        
        # Look for class definitions that inherit from Scene
        pattern = r'class\s+(\w+)\s*\([^)]*Scene[^)]*\):'
        matches = re.findall(pattern, scene_code)
        
        if matches:
            return matches[0]  # Return the first Scene class found
        
        # Fallback to looking for any class that contains Scene in the name
        pattern = r'class\s+(\w*Scene\w*)\s*\([^)]*\):'
        matches = re.findall(pattern, scene_code)
        
        if matches:
            return matches[0]
        
        # Default fallback
        return "AnimationScene"