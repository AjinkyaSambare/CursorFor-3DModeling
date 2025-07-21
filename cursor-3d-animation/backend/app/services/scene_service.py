import json
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import aiofiles
import asyncio

from app.core.config import settings
from app.models.scene import Scene, SceneStatus, Project
from app.services.ai_service import get_ai_provider
from app.services.manim_renderer import ManimRenderer

logger = logging.getLogger(__name__)

class SceneService:
    def __init__(self):
        self.scenes_dir = settings.SCENES_DIR
        self.videos_dir = settings.VIDEOS_DIR
        self.ai_provider = get_ai_provider()
        self.manim_renderer = ManimRenderer()
        self._ensure_directories()
    
    def _ensure_directories(self):
        self.scenes_dir.mkdir(parents=True, exist_ok=True)
        self.videos_dir.mkdir(parents=True, exist_ok=True)
    
    async def create_scene(self, scene: Scene) -> Scene:
        """Create a new scene and save to JSON"""
        scene_path = self.scenes_dir / f"{scene.id}.json"
        
        async with aiofiles.open(scene_path, 'w') as f:
            await f.write(scene.model_dump_json(indent=2))
        
        # Ensure the file is written before returning
        await asyncio.sleep(0.1)
        
        logger.info(f"Created scene {scene.id}")
        return scene
    
    async def get_scene(self, scene_id: str) -> Optional[Scene]:
        """Get a scene by ID"""
        scene_path = self.scenes_dir / f"{scene_id}.json"
        
        if not scene_path.exists():
            return None
        
        # Retry reading the file up to 3 times to handle race conditions
        for attempt in range(3):
            try:
                async with aiofiles.open(scene_path, 'r') as f:
                    data = await f.read()
                    if not data.strip():
                        if attempt < 2:  # Only log warning on last attempt
                            await asyncio.sleep(0.2)
                            continue
                        logger.warning(f"Scene file {scene_id}.json is empty after {attempt + 1} attempts")
                        return None
                    return Scene.model_validate_json(data)
            except Exception as e:
                if attempt < 2:
                    await asyncio.sleep(0.2)
                    continue
                logger.error(f"Failed to parse scene {scene_id} after {attempt + 1} attempts: {e}")
                return None
    
    async def update_scene(self, scene: Scene) -> Scene:
        """Update an existing scene"""
        scene.updated_at = datetime.now(timezone.utc)
        scene_path = self.scenes_dir / f"{scene.id}.json"
        
        async with aiofiles.open(scene_path, 'w') as f:
            await f.write(scene.model_dump_json(indent=2))
        
        # Ensure the file is written before returning
        await asyncio.sleep(0.1)
        
        logger.info(f"Updated scene {scene.id}")
        return scene
    
    async def list_scenes(self, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """List all scenes with pagination"""
        scene_files = sorted(
            self.scenes_dir.glob("*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        
        total = len(scene_files)
        start = (page - 1) * page_size
        end = start + page_size
        
        scenes = []
        for scene_file in scene_files[start:end]:
            async with aiofiles.open(scene_file, 'r') as f:
                data = await f.read()
                scenes.append(Scene.model_validate_json(data))
        
        return {
            "scenes": scenes,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    
    async def list_user_scenes(self, user_id: str, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """List scenes for a specific user with pagination"""
        scene_files = sorted(
            self.scenes_dir.glob("*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        
        user_scenes = []
        total_user_scenes = 0
        
        # Filter scenes by user_id
        for scene_file in scene_files:
            try:
                async with aiofiles.open(scene_file, 'r') as f:
                    data = await f.read()
                    scene = Scene.model_validate_json(data)
                    
                    # Check if scene belongs to user (from metadata or future user_id field)
                    scene_user_id = scene.metadata.get("user_id")
                    if scene_user_id == user_id:
                        user_scenes.append(scene)
                        total_user_scenes += 1
            except Exception as e:
                logger.warning(f"Error reading scene file {scene_file}: {e}")
                continue
        
        # Apply pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_scenes = user_scenes[start:end]
        
        return {
            "scenes": paginated_scenes,
            "total": total_user_scenes,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_user_scenes + page_size - 1) // page_size
        }
    
    async def delete_scene(self, scene_id: str) -> bool:
        """Delete a scene and its associated files"""
        scene_path = self.scenes_dir / f"{scene_id}.json"
        
        if not scene_path.exists():
            return False
        
        # Get scene to find video path
        scene = await self.get_scene(scene_id)
        
        # Delete scene file
        scene_path.unlink()
        
        # Delete video if exists
        if scene and scene.video_path:
            video_path = Path(scene.video_path)
            if video_path.exists():
                video_path.unlink()
        
        logger.info(f"Deleted scene {scene_id}")
        return True
    
    async def generate_scene_code(self, scene: Scene) -> str:
        """Generate animation code using AI"""
        try:
            code = await self.ai_provider.generate_code(
                prompt=scene.prompt,
                library=scene.library,
                duration=scene.duration,
                style=scene.metadata.get("style", {})
            )
            
            # Save code to scene
            scene.generated_code = code
            scene.status = SceneStatus.GENERATING_CODE
            await self.update_scene(scene)
            
            return code
        except Exception as e:
            logger.error(f"Error generating code for scene {scene.id}: {e}")
            scene.status = SceneStatus.FAILED
            scene.error = str(e)
            await self.update_scene(scene)
            raise
    
    async def render_scene(self, scene: Scene) -> Scene:
        """Render the scene using Manim"""
        try:
            # Validate the scene has generated code
            if not scene.generated_code:
                raise ValueError("Scene has no generated code to render")
            
            # Update status
            scene.status = SceneStatus.RENDERING
            await self.update_scene(scene)
            
            # Validate the code
            is_valid, error_msg = self.manim_renderer.validate_scene_code(scene.generated_code)
            if not is_valid:
                raise ValueError(f"Invalid Manim code: {error_msg}")
            
            # Extract the scene class name from the generated code
            scene_class_name = self.manim_renderer.extract_scene_class_name(scene.generated_code)
            
            # Render the scene
            success, video_path, error = await self.manim_renderer.render_scene(
                scene.generated_code,
                scene_name=scene_class_name
            )
            
            if success and video_path:
                scene.video_path = video_path
                scene.status = SceneStatus.COMPLETED
                scene.error = None
                logger.info(f"Successfully rendered scene {scene.id}")
            else:
                scene.status = SceneStatus.FAILED
                scene.error = error or "Unknown rendering error"
                logger.error(f"Failed to render scene {scene.id}: {scene.error}")
            
            await self.update_scene(scene)
            return scene
            
        except Exception as e:
            logger.error(f"Error rendering scene {scene.id}: {e}")
            scene.status = SceneStatus.FAILED
            scene.error = str(e)
            await self.update_scene(scene)
            raise

class ProjectService:
    def __init__(self):
        self.projects_dir = settings.STORAGE_DIR / "projects"
        self.projects_dir.mkdir(parents=True, exist_ok=True)
    
    async def create_project(self, project: Project) -> Project:
        """Create a new project"""
        project_path = self.projects_dir / f"{project.id}.json"
        
        async with aiofiles.open(project_path, 'w') as f:
            await f.write(project.model_dump_json(indent=2))
        
        return project
    
    async def get_project(self, project_id: str) -> Optional[Project]:
        """Get a project by ID"""
        project_path = self.projects_dir / f"{project_id}.json"
        
        if not project_path.exists():
            return None
        
        async with aiofiles.open(project_path, 'r') as f:
            data = await f.read()
            return Project.model_validate_json(data)
    
    async def update_project(self, project: Project) -> Project:
        """Update an existing project"""
        project.updated_at = datetime.utcnow()
        project_path = self.projects_dir / f"{project.id}.json"
        
        async with aiofiles.open(project_path, 'w') as f:
            await f.write(project.model_dump_json(indent=2))
        
        return project
    
    async def list_projects(self) -> List[Project]:
        """List all projects"""
        projects = []
        
        for project_file in sorted(self.projects_dir.glob("*.json"), 
                                   key=lambda p: p.stat().st_mtime, 
                                   reverse=True):
            async with aiofiles.open(project_file, 'r') as f:
                data = await f.read()
                projects.append(Project.model_validate_json(data))
        
        return projects
    
    async def list_user_projects(self, user_id: str) -> List[Project]:
        """List projects for a specific user"""
        projects = []
        
        for project_file in sorted(self.projects_dir.glob("*.json"), 
                                   key=lambda p: p.stat().st_mtime, 
                                   reverse=True):
            try:
                async with aiofiles.open(project_file, 'r') as f:
                    data = await f.read()
                    project = Project.model_validate_json(data)
                    
                    # Only include projects owned by this user
                    if hasattr(project, 'user_id') and project.user_id == user_id:
                        projects.append(project)
            except Exception as e:
                logger.warning(f"Error reading project file {project_file}: {e}")
                continue
        
        return projects
    
    async def delete_project(self, project_id: str) -> bool:
        """Delete a project"""
        project_path = self.projects_dir / f"{project_id}.json"
        
        if not project_path.exists():
            return False
        
        project_path.unlink()
        return True