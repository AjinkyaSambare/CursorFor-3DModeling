import logging
import asyncio
import subprocess
from pathlib import Path
from typing import Optional, List
import tempfile
import shutil
import uuid

from app.core.config import settings
from app.models.scene import Scene, AnimationLibrary, SceneStatus

logger = logging.getLogger(__name__)

class RenderService:
    def __init__(self):
        self.temp_dir = settings.TEMP_DIR
        self.videos_dir = settings.VIDEOS_DIR
        self._ensure_directories()
    
    def _ensure_directories(self):
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.videos_dir.mkdir(parents=True, exist_ok=True)
    
    async def render_scene(self, scene: Scene) -> str:
        """Render a scene to video based on its library type"""
        if scene.library == AnimationLibrary.MANIM:
            return await self._render_manim(scene)
        else:
            raise ValueError(f"Unsupported library: {scene.library}")
    
    async def _render_manim(self, scene: Scene) -> str:
        """Render Manim scene"""
        script_path = self.temp_dir / f"{scene.id}.py"
        video_path = self.videos_dir / f"{scene.id}.mp4"
        
        try:
            # Write Python script
            with open(script_path, 'w') as f:
                f.write(scene.generated_code)
            
            # Run Manim
            cmd = [
                str(settings.BASE_DIR.parent / "manim_env" / "bin" / "manim"),
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
                raise RuntimeError(f"Manim rendering failed: {stderr.decode()}")
            
            # Find the generated video
            import glob
            video_files = glob.glob(f"{self.videos_dir}/**/{scene.id}.mp4", recursive=True)
            
            if video_files:
                # Move to standard location
                source_path = Path(video_files[0])
                if source_path != video_path:
                    shutil.move(str(source_path), str(video_path))
                return str(video_path)
            else:
                raise RuntimeError("Video file not found after rendering")
                
        finally:
            # Cleanup
            if script_path.exists():
                script_path.unlink()
    

class VideoProcessor:
    """Process and combine multiple videos"""
    
    @staticmethod
    async def combine_scenes(scene_paths: List[str], output_path: str, 
                           transitions: bool = True, 
                           transition_duration: float = 0.5) -> str:
        """Combine multiple scene videos into one"""
        # Create concat file
        concat_file = settings.TEMP_DIR / f"{uuid.uuid4()}_concat.txt"
        
        with open(concat_file, 'w') as f:
            for path in scene_paths:
                f.write(f"file '{path}'\n")
        
        # FFmpeg command
        cmd = [
            "ffmpeg",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-c", "copy",
            "-y",
            output_path
        ]
        
        if transitions:
            # Add transition effects
            # This would require more complex FFmpeg filters
            pass
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        # Cleanup
        concat_file.unlink()
        
        if process.returncode != 0:
            raise RuntimeError(f"Video combination failed: {stderr.decode()}")
        
        return output_path
    
    @staticmethod
    async def add_audio(video_path: str, audio_path: str, output_path: str) -> str:
        """Add audio track to video"""
        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-y",
            output_path
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        await process.communicate()
        
        return output_path