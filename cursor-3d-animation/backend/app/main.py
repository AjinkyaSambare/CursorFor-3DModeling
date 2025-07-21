from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from pathlib import Path

from app.core.config import settings
from app.api.v1.api import api_router
from app.core.events import create_start_app_handler, create_stop_app_handler
from app.core.supabase import init_supabase
from app.auth.routes import router as auth_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await create_start_app_handler(app)()
    
    # Initialize Supabase
    try:
        init_supabase()
        logger.info("Supabase initialized successfully")
    except Exception as e:
        logger.warning(f"Supabase initialization failed: {e}")
    
    logger.info(f"{settings.APP_NAME} started successfully")
    
    # Ensure storage directories exist
    for dir_path in [settings.SCENES_DIR, settings.VIDEOS_DIR, settings.TEMP_DIR, settings.EXPORTS_DIR]:
        dir_path.mkdir(parents=True, exist_ok=True)
    
    yield
    
    # Shutdown
    await create_stop_app_handler(app)()
    logger.info(f"{settings.APP_NAME} shut down successfully")

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Include auth router
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])

# Include static routes at root level
from app.api.v1.endpoints.static import router as static_router
app.include_router(static_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }