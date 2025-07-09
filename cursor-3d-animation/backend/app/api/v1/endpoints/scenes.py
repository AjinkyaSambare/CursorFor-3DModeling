from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from typing import Optional
import logging
from pathlib import Path

from app.models.scene import (
    SceneRequest, Scene, SceneResponse, 
    SceneListResponse, SceneStatus
)
from app.services.scene_service import SceneService
from app.services.prompt_enhancement_service import PromptEnhancementService
from app.workers.scene_worker import job_queue

router = APIRouter()
logger = logging.getLogger(__name__)

scene_service = SceneService()
enhancement_service = PromptEnhancementService()

@router.post("/", response_model=SceneResponse)
async def create_scene(
    request: SceneRequest,
    background_tasks: BackgroundTasks
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
    
    # Create scene object with enhanced prompt
    scene = Scene(
        prompt=final_prompt,
        original_prompt=original_prompt,
        library=request.library,
        duration=request.duration,
        resolution=request.resolution,
        metadata={"style": request.style}
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
async def get_scene(scene_id: str):
    """Get scene status and details"""
    try:
        scene = await scene_service.get_scene(scene_id)
        
        if not scene:
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
    page_size: int = Query(20, ge=1, le=100)
):
    """List all scenes with pagination"""
    result = await scene_service.list_scenes(page, page_size)
    return SceneListResponse(**result)

@router.delete("/{scene_id}")
async def delete_scene(scene_id: str):
    """Delete a scene"""
    success = await scene_service.delete_scene(scene_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    return {"message": "Scene deleted successfully"}

@router.get("/{scene_id}/video")
async def get_scene_video(scene_id: str):
    """Get the generated video for a scene"""
    scene = await scene_service.get_scene(scene_id)
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    if not scene.video_path:
        raise HTTPException(
            status_code=400, 
            detail="Video not available. Scene may still be processing."
        )
    
    # Check if video file exists
    video_path = Path(scene.video_path)
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(
        scene.video_path,
        media_type="video/mp4",
        filename=f"animation_{scene_id}.mp4"
    )

@router.get("/{scene_id}/code")
async def get_scene_code(scene_id: str):
    """Get the generated code for a scene"""
    scene = await scene_service.get_scene(scene_id)
    
    if not scene:
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
    background_tasks: BackgroundTasks
):
    """Regenerate a failed or completed scene"""
    scene = await scene_service.get_scene(scene_id)
    
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Re-enhance the prompt if we have the original
    if scene.original_prompt:
        try:
            logger.info(f"Re-enhancing prompt for regeneration: {scene.original_prompt}")
            enhanced_prompt = await enhancement_service.enhance_prompt(
                original_prompt=scene.original_prompt,
                library=scene.library,
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