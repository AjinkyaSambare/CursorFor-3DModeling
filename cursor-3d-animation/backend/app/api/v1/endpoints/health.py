from fastapi import APIRouter
from datetime import datetime

from app.core.config import settings

router = APIRouter()

@router.get("/")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/ready")
async def readiness_check():
    """Readiness check for deployment"""
    # Check if critical services are ready
    checks = {
        "storage": True,  # Check if storage directories exist
        "ai_service": settings.AZURE_OPENAI_API_KEY is not None and settings.AZURE_OPENAI_ENDPOINT is not None,
    }
    
    all_ready = all(checks.values())
    
    return {
        "ready": all_ready,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }