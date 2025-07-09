from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class AnimationLibrary(str, Enum):
    THREEJS = "threejs"
    MANIM = "manim"
    P5JS = "p5js"

class SceneStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    GENERATING_CODE = "generating_code"
    RENDERING = "rendering"
    COMPLETED = "completed"
    FAILED = "failed"

class VideoFormat(str, Enum):
    MP4 = "mp4"
    WEBM = "webm"
    GIF = "gif"

class Resolution(str, Enum):
    HD = "720p"
    FULL_HD = "1080p"
    ULTRA_HD = "4K"

class SceneRequest(BaseModel):
    prompt: str = Field(..., description="Natural language description of the scene")
    library: Optional[AnimationLibrary] = AnimationLibrary.THREEJS
    duration: Optional[int] = Field(5, ge=1, le=30, description="Scene duration in seconds")
    resolution: Optional[Resolution] = Resolution.FULL_HD
    style: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom styling options")
    use_enhanced_prompt: Optional[bool] = Field(True, description="Whether to use prompt enhancement")
    
    @validator('prompt')
    def validate_prompt(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("Prompt must be at least 3 characters long")
        return v.strip()

class Scene(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str  # This will store the enhanced prompt
    original_prompt: Optional[str] = None  # Store the original user prompt
    library: AnimationLibrary
    duration: int
    resolution: Resolution
    status: SceneStatus = SceneStatus.PENDING
    generated_code: Optional[str] = None
    video_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Config:
        use_enum_values = True

class SceneResponse(BaseModel):
    id: str
    status: SceneStatus
    message: str
    video_url: Optional[str] = None
    code: Optional[str] = None
    error: Optional[str] = None
    original_prompt: Optional[str] = None
    enhanced_prompt: Optional[str] = None

class SceneListResponse(BaseModel):
    scenes: List[Scene]
    total: int
    page: int
    page_size: int

class ProjectRequest(BaseModel):
    name: str
    description: Optional[str] = None
    scenes: List[str] = Field(default_factory=list, description="List of scene IDs")

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    scenes: List[str] = Field(default_factory=list)
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExportRequest(BaseModel):
    project_id: Optional[str] = None
    scene_ids: Optional[List[str]] = None
    format: VideoFormat = VideoFormat.MP4
    resolution: Resolution = Resolution.FULL_HD
    include_transitions: bool = True
    transition_duration: float = Field(0.5, ge=0, le=2)