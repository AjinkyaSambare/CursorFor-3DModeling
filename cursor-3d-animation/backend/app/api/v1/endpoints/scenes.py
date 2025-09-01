from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Depends
from fastapi.responses import FileResponse
from typing import Optional
import logging
from pathlib import Path

from app.models.scene import (
    SceneRequest, Scene, SceneResponse, 
    SceneListResponse, SceneStatus, AnimationLibrary
)
from app.services.scene_service import SceneService
from app.services.prompt_enhancement_service import PromptEnhancementService
from app.services.export_service import export_service
from app.services.user_service import user_service
from app.workers.scene_worker import job_queue
from app.auth.dependencies import get_current_user, get_current_user_optional, require_user_id
from app.auth.models import UserResponse

router = APIRouter()
logger = logging.getLogger(__name__)

scene_service = SceneService()
enhancement_service = PromptEnhancementService()

@router.post("/", response_model=SceneResponse)
async def create_scene(
    request: SceneRequest,
    background_tasks: BackgroundTasks,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a new animation scene"""
    # Store original prompt
    original_prompt = request.prompt
    final_prompt = request.prompt
    
    # Enhance prompt if requested
    if request.use_enhanced_prompt:
        try:
            logger.info(f"Enhancing prompt for {request.library}: {original_prompt}")
            final_prompt = await enhancement_service.enhance_prompt(
                original_prompt=original_prompt,
                library=request.library,
                duration=request.duration,
                style=request.style or {}
            )
            logger.info(f"Enhanced prompt: {final_prompt}")
        except Exception as e:
            logger.error(f"Prompt enhancement failed: {e}")
            # Continue with original prompt if enhancement fails
            final_prompt = original_prompt
    
    # Create scene object with enhanced prompt and user ID
    scene = Scene(
        prompt=final_prompt,
        original_prompt=original_prompt,
        library=request.library,
        duration=request.duration,
        resolution=request.resolution,
        metadata={"style": request.style, "user_id": current_user.id}
    )
    
    # Save scene
    scene = await scene_service.create_scene(scene)
    
    # Add to processing queue
    await job_queue.add_job(scene.id)
    
    return SceneResponse(
        id=scene.id,
        status=scene.status,
        message="Scene generation started",
        original_prompt=scene.original_prompt,
        enhanced_prompt=scene.prompt if request.use_enhanced_prompt else None
    )

@router.get("/{scene_id}", response_model=SceneResponse)
async def get_scene(
    scene_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get scene status and details"""
    try:
        scene = await scene_service.get_scene(scene_id)
        
        if not scene:
            raise HTTPException(status_code=404, detail="Scene not found")
        
        # Check ownership - allow migration users or actual user ownership
        scene_user_id = scene.metadata.get("user_id")
        is_migration_user = scene_user_id == "migration-user"
        is_owner = scene_user_id == current_user.id
        
        if not (is_migration_user or is_owner):
            raise HTTPException(status_code=404, detail="Scene not found")
        
        return SceneResponse(
            id=scene.id,
            status=scene.status,
            message=f"Scene is {scene.status}",
            video_url=f"/api/v1/scenes/{scene.id}/video" if scene.video_path else None,
            code=scene.generated_code,
            error=scene.error,
            original_prompt=scene.original_prompt,
            enhanced_prompt=scene.prompt if scene.original_prompt else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting scene {scene_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/", response_model=SceneListResponse)
async def list_scenes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user)
):
    """List all scenes with pagination for the current user"""
    result = await scene_service.list_user_scenes(current_user.id, page, page_size)
    return SceneListResponse(**result)

@router.delete("/{scene_id}")
async def delete_scene(
    scene_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Delete a scene"""
    # First check if scene exists and user owns it
    scene = await scene_service.get_scene(scene_id)
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Check ownership - return 404 if not owned by user (don't reveal existence)
    if scene.metadata.get("user_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    success = await scene_service.delete_scene(scene_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    return {"message": "Scene deleted successfully"}

@router.get("/{scene_id}/video")
async def get_scene_video(
    scene_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get the generated video for a scene"""
    scene = await scene_service.get_scene(scene_id)
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Check ownership - allow migration users or actual user ownership
    scene_user_id = scene.metadata.get("user_id")
    is_migration_user = scene_user_id == "migration-user"
    is_owner = scene_user_id == current_user.id
    
    if not (is_migration_user or is_owner):
        logger.warning(f"Access denied for scene {scene_id}: user {current_user.id} != scene owner {scene_user_id}")
        raise HTTPException(status_code=404, detail="Scene not found")
    
    if not scene.video_path:
        raise HTTPException(
            status_code=400, 
            detail="Video not available. Scene may still be processing."
        )
    
    # Check if video file exists
    video_path = Path(scene.video_path)
    if not video_path.exists():
        logger.error(f"Video file not found: {video_path}")
        raise HTTPException(status_code=404, detail="Video file not found")
    
    logger.info(f"Serving video for scene {scene_id} to user {current_user.id}")
    return FileResponse(
        scene.video_path,
        media_type="video/mp4",
        filename=f"animation_{scene_id}.mp4"
    )

@router.get("/{scene_id}/code")
async def get_scene_code(
    scene_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get the generated code for a scene"""
    scene = await scene_service.get_scene(scene_id)
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Check ownership - return 404 if not owned by user (don't reveal existence)
    if scene.metadata.get("user_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    if not scene.generated_code:
        raise HTTPException(
            status_code=400,
            detail="Code not available. Scene may still be processing."
        )
    
    # Determine file extension based on library
    ext_map = {
        "manim": "py"
    }
    
    extension = ext_map.get(scene.library, "txt")
    
    return {
        "code": scene.generated_code,
        "language": scene.library,
        "filename": f"scene_{scene_id}.{extension}"
    }

@router.post("/{scene_id}/regenerate", response_model=SceneResponse)
async def regenerate_scene(
    scene_id: str,
    background_tasks: BackgroundTasks,
    current_user: UserResponse = Depends(get_current_user)
):
    """Regenerate a failed or completed scene"""
    scene = await scene_service.get_scene(scene_id)
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Check ownership - return 404 if not owned by user (don't reveal existence)
    if scene.metadata.get("user_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Re-enhance the prompt if we have the original
    if scene.original_prompt:
        try:
            logger.info(f"Re-enhancing prompt for regeneration: {scene.original_prompt}")
            # Convert library string to enum if needed
            library_enum = scene.library if isinstance(scene.library, AnimationLibrary) else AnimationLibrary(scene.library)
            enhanced_prompt = await enhancement_service.enhance_prompt(
                original_prompt=scene.original_prompt,
                library=library_enum,
                duration=scene.duration,
                style=scene.metadata.get("style", {})
            )
            scene.prompt = enhanced_prompt
            logger.info(f"Re-enhanced prompt: {enhanced_prompt}")
        except Exception as e:
            logger.error(f"Prompt re-enhancement failed: {e}")
            # Continue with existing prompt if re-enhancement fails
    
    # Reset scene status
    scene.status = SceneStatus.PENDING
    scene.error = None
    scene.generated_code = None
    scene.video_path = None
    
    await scene_service.update_scene(scene)
    
    # Add to processing queue
    await job_queue.add_job(scene.id)
    
    return SceneResponse(
        id=scene.id,
        status=scene.status,
        message="Scene regeneration started",
        original_prompt=scene.original_prompt,
        enhanced_prompt=scene.prompt if scene.original_prompt else None
    )

@router.get("/{scene_id}/health", response_model=dict)
async def check_scene_health(
    scene_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Check the health and validity of a scene's video"""
    try:
        scene = await scene_service.get_scene(scene_id)
        
        if not scene:
            raise HTTPException(status_code=404, detail="Scene not found")
        
        # Check ownership - allow migration users or actual user ownership
        scene_user_id = scene.metadata.get("user_id")
        is_migration_user = scene_user_id == "migration-user"
        is_owner = scene_user_id == current_user.id
        
        if not (is_migration_user or is_owner):
            raise HTTPException(status_code=404, detail="Scene not found")
        
        if not scene.video_path:
            return {
                "scene_id": scene_id,
                "status": "no_video",
                "message": "Scene has no video file",
                "valid": False
            }
        
        if not Path(scene.video_path).exists():
            return {
                "scene_id": scene_id,
                "status": "file_missing",
                "message": "Video file not found on disk",
                "valid": False
            }
        
        # Validate video content
        validation_result = await export_service._validate_video_content(scene.video_path)
        
        return {
            "scene_id": scene_id,
            "status": "healthy" if validation_result["valid"] else "invalid",
            "message": "Video is valid" if validation_result["valid"] else validation_result.get("error", "Unknown error"),
            "valid": validation_result["valid"],
            "video_info": validation_result if validation_result["valid"] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking scene health {scene_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")