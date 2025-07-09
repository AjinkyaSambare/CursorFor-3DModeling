import os
import logging
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod
from openai import OpenAI, AzureOpenAI

from app.core.config import settings
from app.models.scene import AnimationLibrary

logger = logging.getLogger(__name__)

class AIProvider(ABC):
    @abstractmethod
    async def generate_code(self, prompt: str, library: AnimationLibrary, duration: int, style: Dict[str, Any]) -> str:
        pass

class AzureOpenAIProvider(AIProvider):
    def __init__(self):
        self.client = AzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION
        )
        self.deployment_name = settings.AZURE_OPENAI_DEPLOYMENT_NAME
    
    async def generate_code(self, prompt: str, library: AnimationLibrary, duration: int, style: Dict[str, Any]) -> str:
        system_prompt = self._get_system_prompt(library)
        user_prompt = self._format_user_prompt(prompt, duration, style)
        
        response = self.client.chat.completions.create(
            model=self.deployment_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=3000
        )
        
        code = response.choices[0].message.content
        return self._clean_code(code)

    def _get_system_prompt(self, library: AnimationLibrary) -> str:
        if library == AnimationLibrary.THREEJS:
            return THREEJS_SYSTEM_PROMPT
        elif library == AnimationLibrary.MANIM:
            return MANIM_SYSTEM_PROMPT
        else:
            return P5JS_SYSTEM_PROMPT
    
    def _format_user_prompt(self, prompt: str, duration: int, style: Dict[str, Any]) -> str:
        return f"""Create an animation with the following requirements:

Description: {prompt}
Duration: {duration} seconds
Style preferences: {style if style else 'Default educational style'}

Generate clean, well-commented code that creates a smooth, professional animation."""

    def _clean_code(self, code: str) -> str:
        # Remove markdown formatting
        if code.startswith("```"):
            lines = code.split('\n')
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1] == "```":
                lines = lines[:-1]
            code = '\n'.join(lines)
        return code.strip()

class OpenAIProvider(AIProvider):
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def generate_code(self, prompt: str, library: AnimationLibrary, duration: int, style: Dict[str, Any]) -> str:
        system_prompt = self._get_system_prompt(library)
        user_prompt = self._format_user_prompt(prompt, duration, style)
        
        response = self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=3000
        )
        
        code = response.choices[0].message.content
        return self._clean_code(code)
    
    def _get_system_prompt(self, library: AnimationLibrary) -> str:
        if library == AnimationLibrary.THREEJS:
            return THREEJS_SYSTEM_PROMPT
        elif library == AnimationLibrary.MANIM:
            return MANIM_SYSTEM_PROMPT
        else:
            return P5JS_SYSTEM_PROMPT
    
    def _format_user_prompt(self, prompt: str, duration: int, style: Dict[str, Any]) -> str:
        return f"""Create an animation with the following requirements:

Description: {prompt}
Duration: {duration} seconds
Style preferences: {style if style else 'Default educational style'}

Generate clean, well-commented code that creates a smooth, professional animation."""

    def _clean_code(self, code: str) -> str:
        # Remove markdown formatting
        if code.startswith("```"):
            lines = code.split('\n')
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1] == "```":
                lines = lines[:-1]
            code = '\n'.join(lines)
        return code.strip()

# System prompts for different libraries
THREEJS_SYSTEM_PROMPT = """You are an expert Three.js animator. Generate clean, modular Three.js code for educational animations.

Rules:
1. Create a complete HTML file with embedded JavaScript
2. Include Three.js from CDN
3. Use OrbitControls for camera interaction
4. Create smooth animations using requestAnimationFrame
5. Use appropriate lighting and materials
6. Add helpful comments explaining the code
7. Ensure animations are educational and clear
8. Duration should approximately match the requested time
9. Use modern ES6+ JavaScript syntax
10. Include proper scene setup, camera, renderer

Structure your response as a complete HTML file that can be run directly in a browser.
Include all necessary imports and setup code."""

MANIM_SYSTEM_PROMPT = """You are an expert Manim animator. Generate clean, professional Manim code for educational animations that work WITHOUT LaTeX.

CRITICAL RULES - NO LaTeX DEPENDENCIES:
1. NEVER use MathTex, Tex, or any LaTeX-based text
2. NEVER use add_coordinates() or coordinate labels
3. NEVER use mathematical notation that requires LaTeX
4. ALWAYS use Text() for all text elements
5. AVOID axes with automatic numbering/labeling
6. Use simple geometric shapes and basic animations

SAFE MANIM PATTERNS:
- Shapes: Circle, Square, Rectangle, Triangle, Line, Dot, Arrow
- Text: Text("string") only - NO MathTex or Tex
- Animations: Create, Transform, FadeIn, FadeOut, Write, DrawBorderThenFill
- Colors: RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE, WHITE, BLACK
- Transformations: rotate, scale, shift, move_to, next_to

ANIMATION STRUCTURE:
1. Import: from manim import *
2. Class: class MyScene(Scene):
3. Method: def construct(self):
4. Create objects using basic shapes
5. Use self.play() for animations
6. Use self.wait() for pauses
7. Keep duration around requested time

EXAMPLE SAFE CODE:
```python
from manim import *

class SimpleAnimation(Scene):
    def construct(self):
        # Create simple shapes
        circle = Circle(color=BLUE)
        square = Square(color=RED)
        
        # Simple animations
        self.play(Create(circle))
        self.wait(1)
        self.play(Transform(circle, square))
        self.wait(1)
```

FORBIDDEN ELEMENTS:
- axes.add_coordinates()
- MathTex()
- Tex()
- Mathematical formulas
- Coordinate systems with labels
- Any LaTeX syntax

Return only Python code without markdown formatting or explanations."""

P5JS_SYSTEM_PROMPT = """You are an expert p5.js animator. Generate creative, educational animations using p5.js.

Rules:
1. Create a complete HTML file with p5.js included
2. Use setup() and draw() functions appropriately
3. Create smooth, educational animations
4. Use appropriate colors and shapes
5. Add interactivity where relevant
6. Include helpful comments
7. Match the requested duration
8. Use modern JavaScript syntax
9. Ensure code is clean and well-organized

Structure your response as a complete HTML file."""

# Factory function
def get_ai_provider() -> AIProvider:
    if settings.AI_PROVIDER == "azure":
        return AzureOpenAIProvider()
    elif settings.AI_PROVIDER == "openai":
        return OpenAIProvider()
    else:
        raise ValueError(f"Unknown AI provider: {settings.AI_PROVIDER}. Supported providers: azure, openai")