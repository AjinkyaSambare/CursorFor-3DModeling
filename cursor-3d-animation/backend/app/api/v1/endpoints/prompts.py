from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

from app.models.scene import AnimationLibrary
from app.services.prompt_enhancement_service import PromptEnhancementService

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize the service
enhancement_service = PromptEnhancementService()

class PromptEnhanceRequest(BaseModel):
    prompt: str
    library: AnimationLibrary
    duration: int = 5
    style: Optional[Dict[str, Any]] = None

class PromptEnhanceResponse(BaseModel):
    original_prompt: str
    enhanced_prompt: str
    library: str
    duration: int
    quality_analysis: Dict[str, Any]

class PromptAnalyzeRequest(BaseModel):
    prompt: str

class PromptAnalyzeResponse(BaseModel):
    prompt: str
    quality_analysis: Dict[str, Any]

@router.post("/enhance", response_model=PromptEnhanceResponse)
async def enhance_prompt(request: PromptEnhanceRequest):
    """Enhance a rough user prompt into a detailed, library-specific animation description"""
    try:
        # Analyze original prompt quality
        quality_analysis = enhancement_service.analyze_prompt_quality(request.prompt)
        
        # Enhance the prompt
        enhanced_prompt = await enhancement_service.enhance_prompt(
            original_prompt=request.prompt,
            library=request.library,
            duration=request.duration,
            style=request.style or {}
        )
        
        return PromptEnhanceResponse(
            original_prompt=request.prompt,
            enhanced_prompt=enhanced_prompt,
            library=request.library.value,
            duration=request.duration,
            quality_analysis=quality_analysis
        )
        
    except Exception as e:
        logger.error(f"Error enhancing prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to enhance prompt: {str(e)}")

@router.post("/analyze", response_model=PromptAnalyzeResponse)
async def analyze_prompt(request: PromptAnalyzeRequest):
    """Analyze prompt quality and provide suggestions"""
    try:
        quality_analysis = enhancement_service.analyze_prompt_quality(request.prompt)
        
        return PromptAnalyzeResponse(
            prompt=request.prompt,
            quality_analysis=quality_analysis
        )
        
    except Exception as e:
        logger.error(f"Error analyzing prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze prompt: {str(e)}")

@router.get("/suggestions")
async def get_prompt_suggestions():
    """Get example prompts for different libraries"""
    return {
        "manim": [
            "A blue circle smoothly transforming into a red square",
            "Three colorful triangles rotating around a central point",
            "A line growing from left to right, then changing color",
            "A yellow dot moving in a spiral pattern",
            "Two circles merging into one larger circle"
        ],
    }