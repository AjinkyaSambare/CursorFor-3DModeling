from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List
import logging
import uuid
from pathlib import Path

from app.models.scene import Project, ProjectRequest, ExportRequest
from app.services.scene_service import ProjectService, SceneService
from app.services.render_service_simple import SimpleRenderService
from app.services.export_service import export_service

router = APIRouter()
logger = logging.getLogger(__name__)

project_service = ProjectService()
scene_service = SceneService()

@router.post("/", response_model=Project)
async def create_project(request: ProjectRequest):
    """Create a new project"""
    project = Project(
        name=request.name,
        description=request.description,
        scenes=request.scenes
    )
    
    project = await project_service.create_project(project)
    return project

@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a project by ID"""
    project = await project_service.get_project(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project

@router.get("/", response_model=List[Project])
async def list_projects():
    """List all projects"""
    return await project_service.list_projects()

@router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, request: ProjectRequest):
    """Update a project"""
    project = await project_service.get_project(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields
    project.name = request.name
    project.description = request.description
    project.scenes = request.scenes
    
    project = await project_service.update_project(project)
    return project

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project"""
    success = await project_service.delete_project(project_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}

@router.post("/{project_id}/add-scene/{scene_id}", response_model=Project)
async def add_scene_to_project(project_id: str, scene_id: str):
    """Add a scene to a project"""
    project = await project_service.get_project(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify scene exists
    scene = await scene_service.get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    # Add scene if not already in project
    if scene_id not in project.scenes:
        project.scenes.append(scene_id)
        project = await project_service.update_project(project)
    
    return project

@router.post("/{project_id}/remove-scene/{scene_id}", response_model=Project)
async def remove_scene_from_project(project_id: str, scene_id: str):
    """Remove a scene from a project"""
    project = await project_service.get_project(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Remove scene
    if scene_id in project.scenes:
        project.scenes.remove(scene_id)
        project = await project_service.update_project(project)
    
    return project

@router.post("/{project_id}/reorder-scenes", response_model=Project)
async def reorder_project_scenes(project_id: str, scene_ids: List[str]):
    """Reorder scenes in a project"""
    project = await project_service.get_project(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate all scene IDs are in the project
    if set(scene_ids) != set(project.scenes):
        raise HTTPException(
            status_code=400,
            detail="Scene IDs don't match project scenes"
        )
    
    project.scenes = scene_ids
    project = await project_service.update_project(project)
    
    return project

@router.post("/export", response_model=dict)
async def export_video(
    request: ExportRequest,
    background_tasks: BackgroundTasks
):
    """Export project or scenes as a single video"""
    scene_paths = []
    
    if request.project_id:
        # Export entire project
        project = await project_service.get_project(request.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get video paths for all scenes in order
        for scene_id in project.scenes:
            scene = await scene_service.get_scene(scene_id)
            if scene and scene.video_path and Path(scene.video_path).exists():
                scene_paths.append(scene.video_path)
    
    elif request.scene_ids:
        # Export specific scenes
        for scene_id in request.scene_ids:
            scene = await scene_service.get_scene(scene_id)
            if scene and scene.video_path and Path(scene.video_path).exists():
                scene_paths.append(scene.video_path)
    
    else:
        raise HTTPException(
            status_code=400,
            detail="Either project_id or scene_ids must be provided"
        )
    
    if not scene_paths:
        raise HTTPException(
            status_code=400,
            detail="No valid scenes found for export. Make sure all scenes are completed."
        )
    
    # Create export job
    try:
        project_name = "animation"
        if request.project_id:
            project_name = project.name
        
        export_id = await export_service.create_export_job(
            scene_paths=scene_paths,
            project_name=project_name,
            output_format=request.format,
            resolution=request.resolution,
            include_transitions=request.include_transitions,
            transition_duration=request.transition_duration
        )
        
        return {
            "export_id": export_id,
            "status": "processing",
            "message": f"Exporting {len(scene_paths)} scenes with {'transitions' if request.include_transitions else 'no transitions'}"
        }
        
    except Exception as e:
        logger.error(f"Failed to create export job: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start export: {str(e)}"
        )

@router.get("/export/{export_id}/status", response_model=dict)
async def get_export_status(export_id: str):
    """Get the status of an export job"""
    status = await export_service.get_export_status(export_id)
    
    if "error" in status:
        raise HTTPException(status_code=404, detail=status["error"])
    
    return status

@router.get("/export/{export_id}/download")
async def download_export(export_id: str):
    """Download a completed export"""
    file_path = export_service.get_export_file_path(export_id)
    
    if not file_path:
        raise HTTPException(
            status_code=404, 
            detail="Export not found or not completed"
        )
    
    if not Path(file_path).exists():
        raise HTTPException(
            status_code=404,
            detail="Export file not found"
        )
    
    return FileResponse(
        file_path,
        media_type="video/mp4",
        filename=f"export_{export_id}.mp4"
    )