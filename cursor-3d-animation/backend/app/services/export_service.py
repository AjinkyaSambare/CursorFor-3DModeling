import logging
import asyncio
import subprocess
import uuid
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import tempfile
import shutil

from app.core.config import settings
from app.models.scene import VideoFormat, Resolution

logger = logging.getLogger(__name__)

class ExportStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMBINING = "combining"
    FINALIZING = "finalizing"
    COMPLETED = "completed"
    FAILED = "failed"

class ExportJob:
    def __init__(self, 
                 export_id: str,
                 scene_paths: List[str],
                 project_name: str = "animation",
                 output_format: VideoFormat = VideoFormat.MP4,
                 resolution: Resolution = Resolution.FULL_HD,
                 include_transitions: bool = True,
                 transition_duration: float = 0.5):
        self.export_id = export_id
        self.scene_paths = scene_paths
        self.project_name = project_name
        self.output_format = output_format
        self.resolution = resolution
        self.include_transitions = include_transitions
        self.transition_duration = transition_duration
        self.status = ExportStatus.PENDING
        self.progress = 0
        self.error_message = None
        self.output_path = None
        self.created_at = datetime.now(timezone.utc)
        self.completed_at = None

class ExportService:
    def __init__(self):
        self.exports_dir = settings.STORAGE_DIR / "exports"
        self.jobs_dir = settings.STORAGE_DIR / "export_jobs"
        self.temp_dir = settings.TEMP_DIR / "exports"
        self._ensure_directories()
        self.active_jobs: Dict[str, ExportJob] = {}
    
    def _ensure_directories(self):
        self.exports_dir.mkdir(parents=True, exist_ok=True)
        self.jobs_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    async def create_export_job(self,
                               scene_paths: List[str],
                               project_name: str = "animation",
                               output_format: VideoFormat = VideoFormat.MP4,
                               resolution: Resolution = Resolution.FULL_HD,
                               include_transitions: bool = True,
                               transition_duration: float = 0.5) -> str:
        """Create a new export job"""
        export_id = str(uuid.uuid4())
        
        job = ExportJob(
            export_id=export_id,
            scene_paths=scene_paths,
            project_name=project_name,
            output_format=output_format,
            resolution=resolution,
            include_transitions=include_transitions,
            transition_duration=transition_duration
        )
        
        self.active_jobs[export_id] = job
        await self._save_job(job)
        
        # Start processing in background
        asyncio.create_task(self._process_export_job(job))
        
        return export_id
    
    async def get_export_status(self, export_id: str) -> Dict[str, Any]:
        """Get export job status"""
        job = self.active_jobs.get(export_id)
        if not job:
            job = await self._load_job(export_id)
        
        if not job:
            return {"error": "Export job not found"}
        
        return {
            "export_id": job.export_id,
            "status": job.status.value,
            "progress": job.progress,
            "error_message": job.error_message,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "output_path": str(job.output_path) if job.output_path else None,
            "download_url": f"/api/v1/projects/export/{export_id}/download" if job.status == ExportStatus.COMPLETED else None
        }
    
    async def _process_export_job(self, job: ExportJob):
        """Process an export job"""
        try:
            job.status = ExportStatus.PROCESSING
            job.progress = 10
            await self._save_job(job)
            
            # Validate scene files exist and have valid content
            logger.info("Validating scene videos...")
            for i, scene_path in enumerate(job.scene_paths):
                if not Path(scene_path).exists():
                    raise FileNotFoundError(f"Scene video not found: {scene_path}")
                
                # Validate video content
                validation_result = await self._validate_video_content(scene_path)
                if not validation_result["valid"]:
                    raise RuntimeError(f"Invalid video {scene_path}: {validation_result['error']}")
                
                logger.info(f"Video {i+1}/{len(job.scene_paths)} validated: {validation_result['duration']}s, {validation_result['width']}x{validation_result['height']}")
            
            job.progress = 20
            await self._save_job(job)
            
            # Create output filename with project name and timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            # Clean project name for filename (remove invalid characters)
            safe_project_name = "".join(c for c in job.project_name if c.isalnum() or c in (' ', '-', '_')).strip()
            safe_project_name = safe_project_name.replace(' ', '_')
            if not safe_project_name:
                safe_project_name = "animation"
            output_filename = f"{safe_project_name}_{timestamp}.{job.output_format.value}"
            output_path = self.exports_dir / output_filename
            
            job.status = ExportStatus.COMBINING
            job.progress = 30
            await self._save_job(job)
            
            # Combine videos
            if job.include_transitions:
                final_path = await self._combine_with_transitions(
                    job.scene_paths, 
                    str(output_path),
                    job.transition_duration,
                    job.resolution
                )
            else:
                final_path = await self._combine_simple(
                    job.scene_paths,
                    str(output_path),
                    job.resolution
                )
            
            job.status = ExportStatus.FINALIZING
            job.progress = 90
            await self._save_job(job)
            
            # Final optimization
            await self._optimize_video(final_path, job.resolution)
            
            # Verify the exported video has visual content
            logger.info("Verifying exported video has visual content...")
            has_content = await self._verify_video_content(final_path)
            if not has_content:
                logger.warning("Exported video appears to be blank/black - this may indicate an issue with the combination process")
            else:
                logger.info("Exported video verified to have visual content")
            
            job.status = ExportStatus.COMPLETED
            job.progress = 100
            job.output_path = final_path
            job.completed_at = datetime.now(timezone.utc)
            await self._save_job(job)
            
            logger.info(f"Export job {job.export_id} completed successfully")
            
        except Exception as e:
            job.status = ExportStatus.FAILED
            job.error_message = str(e)
            await self._save_job(job)
            logger.error(f"Export job {job.export_id} failed: {e}")
    
    async def _combine_simple(self, scene_paths: List[str], output_path: str, resolution: Resolution) -> str:
        """Simple video concatenation without transitions"""
        # Create concat file
        concat_file = self.temp_dir / f"{uuid.uuid4()}_concat.txt"
        
        with open(concat_file, 'w') as f:
            for path in scene_paths:
                f.write(f"file '{path}'\n")
        
        # FFmpeg command for simple concatenation
        cmd = [
            "ffmpeg",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-c:v", "libx264",  # Re-encode to ensure compatibility
            "-preset", "medium",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-y",
            output_path
        ]
        
        # Log the full FFmpeg command for debugging
        logger.info(f"Simple concatenation FFmpeg command: {' '.join(cmd)}")
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.error(f"Simple concatenation failed with return code {process.returncode}")
                logger.error(f"FFmpeg stderr: {stderr.decode()}")
                logger.error(f"FFmpeg stdout: {stdout.decode()}")
                raise RuntimeError(f"Video concatenation failed: {stderr.decode()}")
            else:
                logger.info(f"Simple concatenation completed successfully")
                if stderr:
                    logger.info(f"FFmpeg stderr: {stderr.decode()}")
                
            return output_path
            
        finally:
            # Cleanup
            if concat_file.exists():
                concat_file.unlink()
    
    async def _combine_with_transitions(self, scene_paths: List[str], output_path: str, 
                                      transition_duration: float, resolution: Resolution) -> str:
        """Combine videos with fade transitions"""
        if len(scene_paths) < 2:
            return await self._combine_simple(scene_paths, output_path, resolution)
        
        # Get video durations using FFprobe
        scene_durations = []
        for path in scene_paths:
            try:
                duration = await self._get_video_duration(path)
                scene_durations.append(duration)
                logger.info(f"Video {path} duration: {duration}s")
            except Exception as e:
                logger.error(f"Failed to get duration for {path}: {e}")
                # Fallback to simple concatenation if we can't get durations
                return await self._combine_simple(scene_paths, output_path, resolution)
        
        # Create complex FFmpeg filter for transitions
        filter_complex = []
        inputs = []
        
        # Add all input files
        for i, path in enumerate(scene_paths):
            inputs.extend(["-i", path])
        
        # Calculate cumulative offsets based on actual durations
        cumulative_offset = 0
        current_stream = "0:v"
        
        for i in range(1, len(scene_paths)):
            # Calculate offset: previous videos duration minus transition overlap
            cumulative_offset += scene_durations[i-1] - transition_duration
            fade_label = f"fade{i}"
            
            if i == len(scene_paths) - 1:
                # Last transition outputs to final stream
                filter_complex.append(f"[{current_stream}][{i}:v]xfade=transition=fade:duration={transition_duration}:offset={cumulative_offset}[out]")
            else:
                filter_complex.append(f"[{current_stream}][{i}:v]xfade=transition=fade:duration={transition_duration}:offset={cumulative_offset}[{fade_label}]")
                current_stream = fade_label
        
        # Build complete command
        cmd = ["ffmpeg"] + inputs + [
            "-filter_complex", ";".join(filter_complex),
            "-map", "[out]" if len(scene_paths) > 1 else "0:v",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-pix_fmt", "yuv420p",  # Ensure compatible pixel format
            "-y",
            output_path
        ]
        
        # Log the full FFmpeg command for debugging
        logger.info(f"FFmpeg command: {' '.join(cmd)}")
        logger.info(f"Filter complex: {';'.join(filter_complex)}")
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                # Log detailed FFmpeg error
                logger.error(f"FFmpeg transition processing failed with return code {process.returncode}")
                logger.error(f"FFmpeg stderr: {stderr.decode()}")
                logger.error(f"FFmpeg stdout: {stdout.decode()}")
                # Fallback to simple concatenation if transitions fail
                logger.warning("Falling back to simple concatenation")
                return await self._combine_simple(scene_paths, output_path, resolution)
            else:
                logger.info(f"FFmpeg transition processing completed successfully")
                if stderr:
                    logger.info(f"FFmpeg stderr: {stderr.decode()}")
                
            return output_path
            
        except Exception as e:
            logger.error(f"Transition processing exception: {e}")
            return await self._combine_simple(scene_paths, output_path, resolution)
    
    async def _get_video_duration(self, video_path: str) -> float:
        """Get video duration using FFprobe"""
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path
        ]
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise RuntimeError(f"FFprobe failed: {stderr.decode()}")
            
            duration = float(stdout.decode().strip())
            return duration
            
        except Exception as e:
            raise RuntimeError(f"Failed to get video duration: {e}")
    
    async def _validate_video_content(self, video_path: str) -> Dict[str, Any]:
        """Validate video content and quality"""
        try:
            # Get video info using FFprobe
            cmd = [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                video_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                return {
                    "valid": False,
                    "error": f"FFprobe failed: {stderr.decode()}"
                }
            
            import json
            video_info = json.loads(stdout.decode())
            
            # Check if video has video streams
            video_streams = [s for s in video_info.get('streams', []) if s.get('codec_type') == 'video']
            if not video_streams:
                return {
                    "valid": False,
                    "error": "No video streams found"
                }
            
            video_stream = video_streams[0]
            duration = float(video_info.get('format', {}).get('duration', 0))
            
            # Check for minimum duration
            if duration < 0.1:
                return {
                    "valid": False,
                    "error": "Video duration too short"
                }
            
            # Check video dimensions
            width = video_stream.get('width', 0)
            height = video_stream.get('height', 0)
            if width < 100 or height < 100:
                return {
                    "valid": False,
                    "error": "Video dimensions too small"
                }
            
            # Check for codec
            codec = video_stream.get('codec_name', '')
            if not codec:
                return {
                    "valid": False,
                    "error": "No video codec detected"
                }
            
            return {
                "valid": True,
                "duration": duration,
                "width": width,
                "height": height,
                "codec": codec,
                "fps": eval(video_stream.get('r_frame_rate', '0/1')) if video_stream.get('r_frame_rate') else 0
            }
            
        except Exception as e:
            return {
                "valid": False,
                "error": f"Video validation failed: {str(e)}"
            }
    
    async def _verify_video_content(self, video_path: str) -> bool:
        """Verify the video has actual visual content (not all black frames)"""
        try:
            # Extract a frame from the middle of the video to check for content
            cmd = [
                "ffmpeg",
                "-i", video_path,
                "-vf", "select=eq(n\\,50)",  # Extract frame 50
                "-frames:v", "1",
                "-f", "rawvideo",
                "-pix_fmt", "gray",
                "-"
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.warning(f"Failed to extract frame for content verification: {stderr.decode()}")
                return True  # Assume valid if we can't verify
            
            # Check if the frame is not entirely black
            # If all pixels are 0 (black), the sum will be 0
            frame_data = stdout
            if len(frame_data) > 0:
                # Calculate average pixel value
                avg_pixel_value = sum(frame_data) / len(frame_data)
                logger.info(f"Average pixel value in extracted frame: {avg_pixel_value}")
                # If average is very low, likely a black frame
                return avg_pixel_value > 5  # Threshold for "not black"
            
            return True
            
        except Exception as e:
            logger.warning(f"Video content verification failed: {e}")
            return True  # Assume valid if verification fails
    
    async def _optimize_video(self, video_path: str, resolution: Resolution):
        """Optimize final video"""
        # Get resolution settings
        resolution_map = {
            Resolution.HD: "1280x720",
            Resolution.FULL_HD: "1920x1080",
            Resolution.ULTRA_HD: "3840x2160"
        }
        
        target_resolution = resolution_map.get(resolution, "1920x1080")
        temp_path = f"{video_path}.temp.mp4"
        
        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-vf", f"scale={target_resolution}",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-movflags", "+faststart",
            "-y",
            temp_path
        ]
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await process.communicate()
            
            if process.returncode == 0:
                # Replace original with optimized version
                shutil.move(temp_path, video_path)
                
        except Exception as e:
            logger.warning(f"Video optimization failed: {e}")
            # Remove temp file if it exists
            temp_file = Path(temp_path)
            if temp_file.exists():
                temp_file.unlink()
    
    async def _save_job(self, job: ExportJob):
        """Save job state to disk"""
        job_data = {
            "export_id": job.export_id,
            "scene_paths": job.scene_paths,
            "project_name": job.project_name,
            "output_format": job.output_format.value,
            "resolution": job.resolution.value,
            "include_transitions": job.include_transitions,
            "transition_duration": job.transition_duration,
            "status": job.status.value,
            "progress": job.progress,
            "error_message": job.error_message,
            "output_path": str(job.output_path) if job.output_path else None,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None
        }
        
        job_file = self.jobs_dir / f"{job.export_id}.json"
        with open(job_file, 'w') as f:
            json.dump(job_data, f, indent=2)
    
    async def _load_job(self, export_id: str) -> Optional[ExportJob]:
        """Load job state from disk"""
        job_file = self.jobs_dir / f"{export_id}.json"
        
        if not job_file.exists():
            return None
        
        try:
            with open(job_file, 'r') as f:
                job_data = json.load(f)
            
            job = ExportJob(
                export_id=job_data["export_id"],
                scene_paths=job_data["scene_paths"],
                project_name=job_data.get("project_name", "animation"),
                output_format=VideoFormat(job_data["output_format"]),
                resolution=Resolution(job_data["resolution"]),
                include_transitions=job_data["include_transitions"],
                transition_duration=job_data["transition_duration"]
            )
            
            job.status = ExportStatus(job_data["status"])
            job.progress = job_data["progress"]
            job.error_message = job_data["error_message"]
            job.output_path = job_data["output_path"]
            job.created_at = datetime.fromisoformat(job_data["created_at"])
            job.completed_at = datetime.fromisoformat(job_data["completed_at"]) if job_data["completed_at"] else None
            
            return job
            
        except Exception as e:
            logger.error(f"Failed to load export job {export_id}: {e}")
            return None
    
    def get_export_file_path(self, export_id: str) -> Optional[str]:
        """Get the file path for a completed export"""
        job = self.active_jobs.get(export_id)
        if job and job.status == ExportStatus.COMPLETED and job.output_path:
            return str(job.output_path)
        return None

# Global export service instance
export_service = ExportService()