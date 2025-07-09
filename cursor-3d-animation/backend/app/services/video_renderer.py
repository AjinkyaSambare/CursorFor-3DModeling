import logging
import asyncio
import subprocess
from pathlib import Path
from typing import Optional
import uuid
import os
import tempfile

from app.core.config import settings
from app.models.scene import Scene, AnimationLibrary, SceneStatus

logger = logging.getLogger(__name__)

class VideoRenderer:
    def __init__(self):
        self.temp_dir = settings.TEMP_DIR
        self.videos_dir = settings.VIDEOS_DIR
        self._ensure_directories()
    
    def _ensure_directories(self):
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.videos_dir.mkdir(parents=True, exist_ok=True)
    
    async def render_scene(self, scene: Scene) -> str:
        """Render a scene to video using Manim"""
        logger.info(f"Rendering scene {scene.id} with {scene.library}")
        
        if scene.library == AnimationLibrary.MANIM:
            return await self._render_manim(scene)
        else:
            raise ValueError(f"Unsupported library: {scene.library}")
    
    
    async def _render_manim(self, scene: Scene) -> str:
        """Render Manim scene using the existing Manim setup"""
        script_path = self.temp_dir / f"{scene.id}.py"
        video_path = self.videos_dir / f"{scene.id}.mp4"
        
        try:
            # Write Python script
            with open(script_path, 'w') as f:
                f.write(scene.generated_code)
            
            # Run Manim
            manim_path = Path("/Users/Ajinkya25/Documents/Projects/3D-Modeling/manim_env/bin/manim")
            cmd = [
                str(manim_path),
                "-qh",  # High quality
                "--format=mp4",
                f"--output_file={scene.id}",
                f"--media_dir={self.videos_dir}",
                str(script_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode()
                
                # Check for common LaTeX-related errors
                if "latex" in error_msg.lower() or "tex" in error_msg.lower():
                    raise RuntimeError(
                        "Animation contains LaTeX dependencies that are not available. "
                        "Please try a simpler animation using basic shapes and text."
                    )
                elif "FileNotFoundError" in error_msg and "latex" in error_msg:
                    raise RuntimeError(
                        "LaTeX not installed. Please use simple animations without mathematical notation."
                    )
                else:
                    raise RuntimeError(f"Manim rendering failed: {error_msg}")
            
            # Find the generated video
            import glob
            video_files = glob.glob(f"{self.videos_dir}/**/{scene.id}.mp4", recursive=True)
            
            if video_files:
                # Move to standard location
                source_path = Path(video_files[0])
                if source_path != video_path:
                    source_path.rename(video_path)
                return str(video_path)
            else:
                raise RuntimeError("Video file not found after rendering")
                
        finally:
            # Cleanup
            if script_path.exists():
                script_path.unlink()
    
    
    
    
    
