from fastapi import APIRouter
from app.api.v1.endpoints import scenes, projects, health, static, prompts

api_router = APIRouter()

# Include routers
api_router.include_router(health.router, tags=["health"])
api_router.include_router(scenes.router, prefix="/scenes", tags=["scenes"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(prompts.router, prefix="/prompts", tags=["prompts"])
api_router.include_router(static.router, tags=["static"])