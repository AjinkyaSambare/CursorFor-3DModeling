from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List
import logging
import uuid

from app.models.scene import Project, ProjectRequest, ExportRequest
from app.services.scene_service import ProjectService, SceneService
from app.services.render_service_simple import SimpleRenderService

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
        
        # Get video paths for all scenes
        for scene_id in project.scenes:
            scene = await scene_service.get_scene(scene_id)
            if scene and scene.video_path:
                scene_paths.append(scene.video_path)
    
    elif request.scene_ids:
        # Export specific scenes
        for scene_id in request.scene_ids:
            scene = await scene_service.get_scene(scene_id)
            if scene and scene.video_path:
                scene_paths.append(scene.video_path)
    
    else:
        raise HTTPException(
            status_code=400,
            detail="Either project_id or scene_ids must be provided"
        )
    
    if not scene_paths:
        raise HTTPException(
            status_code=400,
            detail="No valid scenes found for export"
        )
    
    # TODO: Implement actual export logic
    # For now, return a placeholder response
    export_id = str(uuid.uuid4())
    
    return {
        "export_id": export_id,
        "status": "processing",
        "message": f"Exporting {len(scene_paths)} scenes"
    }