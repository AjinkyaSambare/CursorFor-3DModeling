import logging
from typing import Callable
from fastapi import FastAPI

logger = logging.getLogger(__name__)

def create_start_app_handler(app: FastAPI) -> Callable:
    async def start_app() -> None:
        # Initialize services here
        logger.info("Initializing application services...")
        # Add any startup tasks like:
        # - Initialize AI clients
        # - Setup background task queues
        # - Load cached data
        pass
    
    return start_app

def create_stop_app_handler(app: FastAPI) -> Callable:
    async def stop_app() -> None:
        # Cleanup tasks here
        logger.info("Cleaning up application resources...")
        # Add any cleanup tasks like:
        # - Close database connections
        # - Stop background tasks
        # - Clear temporary files
        pass
    
    return stop_app