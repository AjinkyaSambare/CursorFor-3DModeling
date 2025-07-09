import logging
from typing import Callable
from fastapi import FastAPI
from app.workers.scene_worker import job_queue

logger = logging.getLogger(__name__)

def create_start_app_handler(app: FastAPI) -> Callable:
    async def start_app() -> None:
        # Initialize services here
        logger.info("Initializing application services...")
        # Start background workers
        await job_queue.start_workers()
        logger.info("Background workers started successfully")
    
    return start_app

def create_stop_app_handler(app: FastAPI) -> Callable:
    async def stop_app() -> None:
        # Cleanup tasks here
        logger.info("Cleaning up application resources...")
        # Stop background workers
        await job_queue.stop_workers()
        logger.info("Background workers stopped successfully")
    
    return stop_app