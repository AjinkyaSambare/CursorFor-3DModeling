"""
User Service

Handles user-related operations including profile management,
user-specific file paths, and user data operations.
"""

from typing import Optional, Dict, Any, List
from pathlib import Path
from app.core.config import settings
from app.core.supabase import supabase
from app.auth.models import UserProfile, UserProfileUpdate
import logging
import uuid

logger = logging.getLogger(__name__)

class UserService:
    """Service for managing user operations"""
    
    def __init__(self):
        self.base_storage_dir = settings.STORAGE_DIR
    
    def get_user_storage_path(self, user_id: str, storage_type: str = "scenes") -> Path:
        """Get user-specific storage path"""
        user_dir = self.base_storage_dir / "users" / user_id / storage_type
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir
    
    def get_user_video_path(self, user_id: str, scene_id: str) -> Path:
        """Get user-specific video file path"""
        video_dir = self.get_user_storage_path(user_id, "videos")
        return video_dir / f"{scene_id}.mp4"
    
    def get_user_thumbnail_path(self, user_id: str, scene_id: str) -> Path:
        """Get user-specific thumbnail file path"""
        thumbnail_dir = self.get_user_storage_path(user_id, "thumbnails")
        return thumbnail_dir / f"{scene_id}.jpg"
    
    def get_user_export_path(self, user_id: str, export_id: str, format: str = "mp4") -> Path:
        """Get user-specific export file path"""
        export_dir = self.get_user_storage_path(user_id, "exports")
        return export_dir / f"{export_id}.{format}"
    
    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user profile from database"""
        try:
            response = supabase.table("profiles").select("*").eq("id", user_id).execute()
            
            if response.data:
                return UserProfile(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting user profile {user_id}: {e}")
            return None
    
    async def create_user_profile(self, user_id: str, display_name: Optional[str] = None) -> Optional[UserProfile]:
        """Create a new user profile"""
        try:
            profile_data = {
                "id": user_id,
                "display_name": display_name,
                "preferences": {}
            }
            
            response = supabase.table("profiles").insert(profile_data).execute()
            
            if response.data:
                return UserProfile(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error creating user profile {user_id}: {e}")
            return None
    
    async def update_user_profile(self, user_id: str, updates: UserProfileUpdate) -> Optional[UserProfile]:
        """Update user profile"""
        try:
            update_data = updates.dict(exclude_unset=True)
            update_data["updated_at"] = "now()"
            
            response = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
            
            if response.data:
                return UserProfile(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating user profile {user_id}: {e}")
            return None
    
    async def get_user_settings(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user settings"""
        try:
            response = supabase.table("user_settings").select("*").eq("user_id", user_id).execute()
            
            if response.data:
                return response.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error getting user settings {user_id}: {e}")
            return None
    
    async def update_user_settings(self, user_id: str, settings_data: Dict[str, Any]) -> bool:
        """Update user settings"""
        try:
            settings_data["user_id"] = user_id
            settings_data["updated_at"] = "now()"
            
            response = supabase.table("user_settings").upsert(settings_data).execute()
            
            return bool(response.data)
            
        except Exception as e:
            logger.error(f"Error updating user settings {user_id}: {e}")
            return False
    
    async def get_user_projects(self, user_id: str, include_shared: bool = True) -> List[Dict[str, Any]]:
        """Get projects for a user (owned + shared)"""
        try:
            # Get owned projects
            owned_response = supabase.table("projects").select("*").eq("user_id", user_id).execute()
            projects = owned_response.data or []
            
            if include_shared:
                # Get shared projects
                shared_response = supabase.table("project_shares").select("""
                    project_id,
                    permission,
                    projects (*)
                """).eq("user_id", user_id).execute()
                
                for share in shared_response.data or []:
                    if share.get("projects"):
                        project = share["projects"]
                        project["shared"] = True
                        project["permission"] = share["permission"]
                        projects.append(project)
            
            return projects
            
        except Exception as e:
            logger.error(f"Error getting user projects {user_id}: {e}")
            return []
    
    async def get_user_scenes(self, user_id: str, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get scenes for a user"""
        try:
            query = supabase.table("scenes").select("*").eq("user_id", user_id)
            
            if project_id:
                query = query.eq("project_id", project_id)
            
            response = query.order("created_at", desc=True).execute()
            return response.data or []
            
        except Exception as e:
            logger.error(f"Error getting user scenes {user_id}: {e}")
            return []
    
    async def cleanup_user_files(self, user_id: str, older_than_days: int = 30) -> bool:
        """Clean up old user files"""
        try:
            user_storage = self.base_storage_dir / "users" / user_id
            if not user_storage.exists():
                return True
            
            # This would implement file cleanup logic
            # For now, just log the operation
            logger.info(f"Cleanup requested for user {user_id} files older than {older_than_days} days")
            return True
            
        except Exception as e:
            logger.error(f"Error cleaning up user files {user_id}: {e}")
            return False
    
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics"""
        try:
            # Get project count
            projects_response = supabase.table("projects").select("id").eq("user_id", user_id).execute()
            project_count = len(projects_response.data or [])
            
            # Get scene count
            scenes_response = supabase.table("scenes").select("id, status").eq("user_id", user_id).execute()
            scenes = scenes_response.data or []
            scene_count = len(scenes)
            completed_scenes = len([s for s in scenes if s.get("status") == "completed"])
            
            # Get export count
            exports_response = supabase.table("export_jobs").select("id, status").eq("user_id", user_id).execute()
            exports = exports_response.data or []
            export_count = len(exports)
            completed_exports = len([e for e in exports if e.get("status") == "completed"])
            
            return {
                "projects": project_count,
                "scenes": scene_count,
                "completed_scenes": completed_scenes,
                "exports": export_count,
                "completed_exports": completed_exports
            }
            
        except Exception as e:
            logger.error(f"Error getting user stats {user_id}: {e}")
            return {}

# Global service instance
user_service = UserService()