import logging
import asyncio
from typing import Optional

from app.models.scene import Scene, SceneStatus
from app.services.scene_service import SceneService

logger = logging.getLogger(__name__)

class SceneWorker:
    def __init__(self):
        self.scene_service = SceneService()
        self.processing = False
        self.current_scene_id: Optional[str] = None
    
    async def process_scene(self, scene_id: str):
        """Process a scene from generation to rendering"""
        self.current_scene_id = scene_id
        self.processing = True
        
        try:
            # Get scene
            scene = await self.scene_service.get_scene(scene_id)
            if not scene:
                logger.error(f"Scene {scene_id} not found")
                return
            
            # Update status
            scene.status = SceneStatus.PROCESSING
            await self.scene_service.update_scene(scene)
            
            # Generate code
            logger.info(f"Generating code for scene {scene_id}")
            scene.status = SceneStatus.GENERATING_CODE
            await self.scene_service.update_scene(scene)
            
            code = await self.scene_service.generate_scene_code(scene)
            
            # Render scene using the new Manim renderer
            logger.info(f"Rendering scene {scene_id}")
            scene = await self.scene_service.render_scene(scene)
            
            logger.info(f"Successfully processed scene {scene_id}")
            
        except Exception as e:
            logger.error(f"Error processing scene {scene_id}: {e}")
            
            # Update scene with error
            scene = await self.scene_service.get_scene(scene_id)
            if scene:
                scene.status = SceneStatus.FAILED
                scene.error = str(e)
                await self.scene_service.update_scene(scene)
        
        finally:
            self.processing = False
            self.current_scene_id = None

# Simple in-memory queue for now
class JobQueue:
    def __init__(self):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.workers = []
        self.max_workers = 3
    
    async def add_job(self, scene_id: str):
        """Add a job to the queue"""
        await self.queue.put(scene_id)
    
    async def start_workers(self):
        """Start worker tasks"""
        for i in range(self.max_workers):
            worker = asyncio.create_task(self._worker(i))
            self.workers.append(worker)
    
    async def stop_workers(self):
        """Stop all workers"""
        for worker in self.workers:
            worker.cancel()
        
        await asyncio.gather(*self.workers, return_exceptions=True)
    
    async def _worker(self, worker_id: int):
        """Worker task that processes jobs from queue"""
        logger.info(f"Worker {worker_id} started")
        worker = SceneWorker()
        
        while True:
            try:
                # Get job from queue
                scene_id = await self.queue.get()
                
                logger.info(f"Worker {worker_id} processing scene {scene_id}")
                await worker.process_scene(scene_id)
                
                # Mark as done
                self.queue.task_done()
                
            except asyncio.CancelledError:
                logger.info(f"Worker {worker_id} stopped")
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")

# Global job queue instance
job_queue = JobQueue()