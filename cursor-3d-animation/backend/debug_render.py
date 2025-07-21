#!/usr/bin/env python3
"""Debug the rendering process step by step."""

import asyncio
import subprocess
import tempfile
from pathlib import Path
import shutil

# Test code from the failed scene
test_code = '''from manim import *

class CircleToSquareAnimation(Scene):
    def construct(self):
        # Create objects with proper positioning and colors
        circle = Circle(radius=1, color=BLUE).move_to(ORIGIN)
        square = Square(side_length=2, color=RED).move_to(ORIGIN)
        
        # Create descriptive labels
        circle_label = Text("Blue Circle", font_size=24).next_to(circle, UP, buff=0.5)
        square_label = Text("Red Square", font_size=24).next_to(square, DOWN, buff=0.5)
        
        # Animation sequence with exact timing to meet 5-second duration
        # Phase 1: Introduce the circle (1.0 seconds)
        self.play(FadeIn(circle), FadeIn(circle_label), run_time=1.0)
        
        # Phase 2: Brief pause for clarity (0.5 seconds)
        self.wait(0.5)
        
        # Phase 3: Transform circle to square with label change (2.0 seconds)
        self.play(
            ReplacementTransform(circle, square),
            ReplacementTransform(circle_label, square_label),
            run_time=2.0
        )
        
        # Phase 4: Brief pause for final view (0.5 seconds)
        self.wait(0.5)
        
        # Phase 5: Fade out everything (1.0 seconds)
        self.play(FadeOut(square), FadeOut(square_label), run_time=1.0)
        
        # Total duration: 1.0 + 0.5 + 2.0 + 0.5 + 1.0 = 5.0 seconds exactly'''

def test_class_extraction():
    """Test class name extraction."""
    import re
    
    pattern = r'class\s+(\w+)\s*\([^)]*Scene[^)]*\):'
    matches = re.findall(pattern, test_code)
    
    print(f"Class name extraction: {matches}")
    return matches[0] if matches else "AnimationScene"

async def test_manual_render():
    """Test manual Manim rendering."""
    manim_env = "/Users/Ajinkya25/Documents/Projects/3D-Modeling/manim_env/bin/python"
    
    # Create temporary directory
    temp_dir = tempfile.mkdtemp(prefix="debug_manim_")
    temp_file = Path(temp_dir) / "scene.py"
    
    try:
        # Write code to file
        temp_file.write_text(test_code)
        
        # Extract class name
        class_name = test_class_extraction()
        print(f"Using class name: {class_name}")
        
        # Run Manim
        cmd = [
            manim_env, "-m", "manim",
            "-qm",  # medium quality
            "--format", "mp4",
            "--disable_caching",
            str(temp_file),
            class_name
        ]
        
        print(f"Command: {' '.join(cmd)}")
        print(f"Working directory: {temp_dir}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        print(f"\nReturn code: {result.returncode}")
        print(f"STDOUT:\n{result.stdout}")
        print(f"STDERR:\n{result.stderr}")
        
        # Check for output files
        print(f"\nFiles in temp directory:")
        for item in Path(temp_dir).rglob("*"):
            if item.is_file():
                print(f"  {item.relative_to(temp_dir)} ({item.stat().st_size} bytes)")
        
        # Look for media directory
        media_dir = Path(temp_dir) / "media"
        if media_dir.exists():
            print(f"\nMedia directory structure:")
            for item in media_dir.rglob("*"):
                if item.is_file():
                    print(f"  {item.relative_to(media_dir)} ({item.stat().st_size} bytes)")
        
    finally:
        # Cleanup
        shutil.rmtree(temp_dir)

if __name__ == "__main__":
    asyncio.run(test_manual_render())