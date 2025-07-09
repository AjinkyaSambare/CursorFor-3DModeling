import logging
import asyncio
import subprocess
from pathlib import Path
from typing import Optional
import uuid
import os
import tempfile

from app.core.config import settings
from app.models.scene import Scene, AnimationLibrary, SceneStatus

logger = logging.getLogger(__name__)

class VideoRenderer:
    def __init__(self):
        self.temp_dir = settings.TEMP_DIR
        self.videos_dir = settings.VIDEOS_DIR
        self._ensure_directories()
    
    def _ensure_directories(self):
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.videos_dir.mkdir(parents=True, exist_ok=True)
    
    async def render_scene(self, scene: Scene) -> str:
        """Render a scene to video using Puppeteer"""
        logger.info(f"Rendering scene {scene.id} with {scene.library}")
        
        if scene.library == AnimationLibrary.THREEJS:
            return await self._render_threejs(scene)
        elif scene.library == AnimationLibrary.MANIM:
            return await self._render_manim(scene)
        elif scene.library == AnimationLibrary.P5JS:
            return await self._render_p5js(scene)
        else:
            raise ValueError(f"Unsupported library: {scene.library}")
    
    async def _render_threejs(self, scene: Scene) -> str:
        """Render Three.js scene using Puppeteer"""
        temp_id = str(uuid.uuid4())
        html_path = self.temp_dir / f"{temp_id}.html"
        video_path = self.videos_dir / f"{scene.id}.mp4"
        
        try:
            # Create HTML file
            html_content = self._wrap_threejs_code(scene.generated_code, scene.duration)
            with open(html_path, 'w') as f:
                f.write(html_content)
            
            # Create Node.js script for video capture
            capture_script = self._create_capture_script(html_path, video_path, scene.duration)
            script_path = self.temp_dir / f"{temp_id}_capture.js"
            with open(script_path, 'w') as f:
                f.write(capture_script)
            
            # Run the capture script
            logger.info(f"Starting video capture for scene {scene.id}")
            process = await asyncio.create_subprocess_exec(
                "node", str(script_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.temp_dir.parent)
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                logger.error(f"Video capture failed for scene {scene.id}: {error_msg}")
                raise RuntimeError(f"Video capture failed: {error_msg}")
            
            logger.info(f"Video capture completed for scene {scene.id}")
            return str(video_path)
            
        except Exception as e:
            logger.error(f"Error rendering scene {scene.id}: {e}")
            raise
        finally:
            # Cleanup temp files
            try:
                if html_path.exists():
                    html_path.unlink()
                if script_path.exists():
                    script_path.unlink()
            except:
                pass
    
    async def _render_manim(self, scene: Scene) -> str:
        """Render Manim scene using the existing Manim setup"""
        script_path = self.temp_dir / f"{scene.id}.py"
        video_path = self.videos_dir / f"{scene.id}.mp4"
        
        try:
            # Write Python script
            with open(script_path, 'w') as f:
                f.write(scene.generated_code)
            
            # Run Manim
            manim_path = Path("/Users/Ajinkya25/Documents/Projects/3D-Modeling/manim_env/bin/manim")
            cmd = [
                str(manim_path),
                "-qh",  # High quality
                "--format=mp4",
                f"--output_file={scene.id}",
                f"--media_dir={self.videos_dir}",
                str(script_path)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode()
                
                # Check for common LaTeX-related errors
                if "latex" in error_msg.lower() or "tex" in error_msg.lower():
                    raise RuntimeError(
                        "Animation contains LaTeX dependencies that are not available. "
                        "Please try a simpler animation using basic shapes and text."
                    )
                elif "FileNotFoundError" in error_msg and "latex" in error_msg:
                    raise RuntimeError(
                        "LaTeX not installed. Please use simple animations without mathematical notation."
                    )
                else:
                    raise RuntimeError(f"Manim rendering failed: {error_msg}")
            
            # Find the generated video
            import glob
            video_files = glob.glob(f"{self.videos_dir}/**/{scene.id}.mp4", recursive=True)
            
            if video_files:
                # Move to standard location
                source_path = Path(video_files[0])
                if source_path != video_path:
                    source_path.rename(video_path)
                return str(video_path)
            else:
                raise RuntimeError("Video file not found after rendering")
                
        finally:
            # Cleanup
            if script_path.exists():
                script_path.unlink()
    
    async def _render_p5js(self, scene: Scene) -> str:
        """Render p5.js scene using Puppeteer (similar to Three.js)"""
        return await self._render_threejs(scene)
    
    def _wrap_threejs_code(self, code: str, duration: int) -> str:
        """Wrap Three.js code with proper HTML structure for video capture"""
        import re
        
        # First, extract code from markdown if present
        markdown_match = re.search(r'```html\s*(.*?)\s*```', code, re.DOTALL | re.IGNORECASE)
        if markdown_match:
            code = markdown_match.group(1)
        
        # If code already has HTML structure, return it with our improvements
        if "<html>" in code.lower() or "<!doctype" in code.lower():
            # Fix viewport and rendering for video capture
            code = re.sub(
                r'<meta name="viewport"[^>]*>',
                '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
                code,
                flags=re.IGNORECASE
            )
            
            # Ensure proper sizing for video capture
            style_improvements = '''
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #000;
            width: 1920px !important;
            height: 1080px !important;
        }
        canvas {
            display: block;
            width: 1920px !important;
            height: 1080px !important;
        }
    '''
            
            # Add or update styles
            if "<style>" in code.lower():
                code = re.sub(
                    r'<style[^>]*>(.*?)</style>',
                    f'<style>{style_improvements}</style>',
                    code,
                    flags=re.DOTALL | re.IGNORECASE
                )
            else:
                code = re.sub(
                    r'(<head[^>]*>)',
                    f'\\1\n    <style>{style_improvements}</style>',
                    code,
                    flags=re.IGNORECASE
                )
            
            # Add our animation ready signal to existing HTML
            if "<script>" in code.lower():
                # Insert our animation ready logic before the last </script> tag
                code = re.sub(
                    r'(</script>\s*</body>)',
                    f'''
    // Fix renderer size for video capture
    if (typeof renderer !== 'undefined') {{
        renderer.setSize(1920, 1080);
        renderer.domElement.style.width = '1920px';
        renderer.domElement.style.height = '1080px';
    }}
    
    // Fix camera aspect ratio
    if (typeof camera !== 'undefined') {{
        camera.aspect = 1920 / 1080;
        camera.updateProjectionMatrix();
    }}
    
    // Animation ready signal for video capture
    setTimeout(() => {{
        window.animationReady = true;
        console.log('Animation ready flag set');
    }}, 1000);
    
    // Auto-stop after duration
    setTimeout(() => {{
        if (window.animationId) {{
            cancelAnimationFrame(window.animationId);
        }}
        window.animationComplete = true;
    }}, {duration * 1000});
</script>
</body>''',
                    code,
                    flags=re.IGNORECASE
                )
            return code
        
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Three.js Animation</title>
    <style>
        body {{ 
            margin: 0; 
            padding: 0; 
            overflow: hidden; 
            background: #000;
            width: 1920px;
            height: 1080px;
        }}
        canvas {{ 
            display: block;
            width: 1920px !important;
            height: 1080px !important;
        }}
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
    <script>
        // Signal when animation is ready
        window.animationReady = false;
        
        try {{
            // Wrap the code to ensure it completes
            (function() {{
                {code}
                
                // If the code doesn't have its own animation loop, create a basic one
                if (typeof animate === 'undefined' && typeof renderer !== 'undefined' && typeof scene !== 'undefined' && typeof camera !== 'undefined') {{
                    function animate() {{
                        requestAnimationFrame(animate);
                        if (typeof controls !== 'undefined') {{
                            controls.update();
                        }}
                        renderer.render(scene, camera);
                    }}
                    animate();
                }}
            }})();
            
            // Mark as ready after a short delay
            setTimeout(() => {{
                window.animationReady = true;
                console.log('Animation ready flag set');
            }}, 100);
            
        }} catch (error) {{
            console.error('Error in animation code:', error);
            
            // Create a fallback scene with a simple cube
            const fallbackScene = new THREE.Scene();
            const fallbackCamera = new THREE.PerspectiveCamera(75, 1920/1080, 0.1, 1000);
            const fallbackRenderer = new THREE.WebGLRenderer();
            fallbackRenderer.setSize(1920, 1080);
            document.body.appendChild(fallbackRenderer.domElement);
            
            const geometry = new THREE.BoxGeometry();
            const material = new THREE.MeshBasicMaterial({{ color: 0x00ff00 }});
            const cube = new THREE.Mesh(geometry, material);
            fallbackScene.add(cube);
            fallbackCamera.position.z = 5;
            
            function fallbackAnimate() {{
                requestAnimationFrame(fallbackAnimate);
                cube.rotation.x += 0.01;
                cube.rotation.y += 0.01;
                fallbackRenderer.render(fallbackScene, fallbackCamera);
            }}
            fallbackAnimate();
            
            // Still mark as ready to avoid timeout
            window.animationReady = true;
            console.log('Fallback animation ready');
        }}
        
        // Auto-stop after duration
        setTimeout(() => {{
            if (window.animationId) {{
                cancelAnimationFrame(window.animationId);
            }}
            window.animationComplete = true;
        }}, {duration * 1000});
    </script>
</body>
</html>"""
    
    def _create_capture_script(self, html_path: str, video_path: str, duration: int) -> str:
        """Create Node.js script for video capture"""
        return f"""
const puppeteer = require('puppeteer');
const {{ PuppeteerScreenRecorder }} = require('puppeteer-screen-recorder');
const path = require('path');
const fs = require('fs');

(async () => {{
    let browser;
    try {{
        browser = await puppeteer.launch({{
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        }});
        
        const page = await browser.newPage();
        await page.setViewport({{ width: 1920, height: 1080 }});
        
        // Enable console logging for debugging
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        
        const recorder = new PuppeteerScreenRecorder(page, {{
            fps: 30,
            videoFrame: {{
                width: 1920,
                height: 1080,
            }},
            aspectRatio: '16:9',
            recordDurationLimit: {duration + 5}
        }});
        
        console.log('Loading page...');
        await page.goto('file://{html_path}', {{ waitUntil: 'domcontentloaded' }});
        
        // Wait for Three.js to load
        console.log('Waiting for THREE.js...');
        await page.waitForFunction(() => typeof THREE !== 'undefined', {{ timeout: 10000 }});
        
        // Wait for animation to be ready or proceed after timeout
        console.log('Waiting for animation ready...');
        try {{
            await page.waitForFunction(() => window.animationReady === true, {{ timeout: 5000 }});
            console.log('Animation ready detected');
        }} catch (error) {{
            console.log('Animation ready timeout, checking for canvas...');
            try {{
                await page.waitForSelector('canvas', {{ timeout: 3000 }});
                console.log('Canvas found, proceeding...');
            }} catch (canvasError) {{
                console.log('No canvas found, proceeding anyway...');
            }}
        }}
        
        // Check if we have a renderer and scene
        const hasRenderer = await page.evaluate(() => {{
            return typeof renderer !== 'undefined' && typeof scene !== 'undefined';
        }});
        console.log('Has renderer and scene:', hasRenderer);
        
        // Force a render to ensure something is visible
        await page.evaluate(() => {{
            if (typeof renderer !== 'undefined' && typeof scene !== 'undefined' && typeof camera !== 'undefined') {{
                renderer.render(scene, camera);
                console.log('Forced initial render');
            }}
        }});
        
        // Wait for animation to initialize and render
        await page.waitForTimeout(3000);
        
        console.log('Starting recording...');
        await recorder.start('{video_path}');
        
        // Wait for animation duration
        await page.waitForTimeout({duration * 1000});
        
        console.log('Stopping recording...');
        await recorder.stop();
        
        console.log('Video recording completed successfully');
        
    }} catch (error) {{
        console.error('Error during video capture:', error);
        process.exit(1);
    }} finally {{
        if (browser) {{
            await browser.close();
        }}
    }}
}})();
"""