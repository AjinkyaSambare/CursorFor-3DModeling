from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional, List

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Cursor for 3D Animation"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # API
    API_V1_STR: str = "/api/v1"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175"
    ]
    
    # Storage
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    SCENES_DIR: Path = STORAGE_DIR / "scenes"
    VIDEOS_DIR: Path = STORAGE_DIR / "videos"
    TEMP_DIR: Path = STORAGE_DIR / "temp"
    EXPORTS_DIR: Path = STORAGE_DIR / "exports"
    
    # AI Configuration
    OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_ENDPOINT: Optional[str] = None
    AZURE_OPENAI_API_KEY: Optional[str] = None
    AZURE_OPENAI_DEPLOYMENT_NAME: Optional[str] = None
    AZURE_OPENAI_API_VERSION: str = "2024-02-15-preview"
    
    # Default AI provider
    AI_PROVIDER: str = "azure"  # Options: "azure", "openai"
    
    # Scene Generation
    DEFAULT_SCENE_DURATION: int = 5
    MAX_SCENE_DURATION: int = 30
    DEFAULT_RESOLUTION: str = "1080p"
    SUPPORTED_RESOLUTIONS: List[str] = ["720p", "1080p", "4K"]
    
    # Animation Libraries
    DEFAULT_ANIMATION_LIBRARY: str = "manim"
    SUPPORTED_LIBRARIES: List[str] = ["manim"]
    
    # Video Export
    DEFAULT_FPS: int = 60
    DEFAULT_VIDEO_FORMAT: str = "mp4"
    SUPPORTED_VIDEO_FORMATS: List[str] = ["mp4", "webm", "gif"]
    
    # Performance
    MAX_CONCURRENT_JOBS: int = 5
    JOB_TIMEOUT: int = 300  # 5 minutes
    CLEANUP_INTERVAL: int = 3600  # 1 hour
    
    # Supabase Configuration
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    
    # JWT Configuration
    JWT_SECRET_KEY: Optional[str] = None
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()