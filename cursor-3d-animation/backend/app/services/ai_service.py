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
            max_tokens=4000
        )
        
        code = response.choices[0].message.content
        return self._clean_code(code)

    def _get_system_prompt(self, library: AnimationLibrary) -> str:
        if library == AnimationLibrary.MANIM:
            return MANIM_SYSTEM_PROMPT
        else:
            raise ValueError(f"Unsupported library: {library}")
    
    def _format_user_prompt(self, prompt: str, duration: int, style: Dict[str, Any]) -> str:
        return f"""ANIMATION REQUIREMENTS:

DETAILED DESCRIPTION: {prompt}

TECHNICAL SPECIFICATIONS:
- Total Duration: {duration} seconds
- Resolution: 1920x1080 (16:9 aspect ratio)
- Frame Rate: 60 FPS
- Video Bounds: -7 to 7 (horizontal), -4 to 4 (vertical)
- Style: {style if style else 'Clean, educational, professional'}

CRITICAL DURATION REQUIREMENT:
⚠️ THE ANIMATION MUST BE EXACTLY {duration} SECONDS - NO MORE, NO LESS ⚠️

IMPLEMENTATION REQUIREMENTS:
1. Calculate precise timing: sum of all run_time + wait times = {duration} seconds
2. Every self.play() must have explicit run_time parameter
3. All objects must be positioned within video frame boundaries
4. Create smooth, professional animations with proper pacing
5. Include strategic wait times for natural rhythm
6. Use appropriate colors and object sizes for clear visibility
7. Ensure all elements work without LaTeX dependencies
8. Add timing calculation comments in the code

DURATION VERIFICATION REQUIRED:
Before finalizing code, calculate:
Total = self.play(run_time=X) + self.wait(Y) + ... = {duration} seconds EXACTLY

Generate complete, optimized Manim code with precise {duration}-second duration."""

    def _clean_code(self, code: str) -> str:
        # Remove markdown formatting more thoroughly
        lines = code.split('\n')
        
        # Remove leading markdown code blocks
        while lines and lines[0].strip().startswith('```'):
            lines = lines[1:]
        
        # Remove trailing markdown code blocks
        while lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        
        # Remove any remaining stray backticks
        cleaned_lines = []
        for line in lines:
            # Remove lines that are just backticks
            if line.strip() == '```' or line.strip() == '``':
                continue
            cleaned_lines.append(line)
        
        code = '\n'.join(cleaned_lines)
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
            max_tokens=4000
        )
        
        code = response.choices[0].message.content
        return self._clean_code(code)
    
    def _get_system_prompt(self, library: AnimationLibrary) -> str:
        if library == AnimationLibrary.MANIM:
            return MANIM_SYSTEM_PROMPT
        else:
            raise ValueError(f"Unsupported library: {library}")
    
    def _format_user_prompt(self, prompt: str, duration: int, style: Dict[str, Any]) -> str:
        return f"""ANIMATION REQUIREMENTS:

DETAILED DESCRIPTION: {prompt}

TECHNICAL SPECIFICATIONS:
- Total Duration: {duration} seconds
- Resolution: 1920x1080 (16:9 aspect ratio)
- Frame Rate: 60 FPS
- Video Bounds: -7 to 7 (horizontal), -4 to 4 (vertical)
- Style: {style if style else 'Clean, educational, professional'}

CRITICAL DURATION REQUIREMENT:
⚠️ THE ANIMATION MUST BE EXACTLY {duration} SECONDS - NO MORE, NO LESS ⚠️

IMPLEMENTATION REQUIREMENTS:
1. Calculate precise timing: sum of all run_time + wait times = {duration} seconds
2. Every self.play() must have explicit run_time parameter
3. All objects must be positioned within video frame boundaries
4. Create smooth, professional animations with proper pacing
5. Include strategic wait times for natural rhythm
6. Use appropriate colors and object sizes for clear visibility
7. Ensure all elements work without LaTeX dependencies
8. Add timing calculation comments in the code

DURATION VERIFICATION REQUIRED:
Before finalizing code, calculate:
Total = self.play(run_time=X) + self.wait(Y) + ... = {duration} seconds EXACTLY

Generate complete, optimized Manim code with precise {duration}-second duration."""

    def _clean_code(self, code: str) -> str:
        # Remove markdown formatting more thoroughly
        lines = code.split('\n')
        
        # Remove leading markdown code blocks
        while lines and lines[0].strip().startswith('```'):
            lines = lines[1:]
        
        # Remove trailing markdown code blocks
        while lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        
        # Remove any remaining stray backticks
        cleaned_lines = []
        for line in lines:
            # Remove lines that are just backticks
            if line.strip() == '```' or line.strip() == '``':
                continue
            cleaned_lines.append(line)
        
        code = '\n'.join(cleaned_lines)
        return code.strip()

# System prompts for different libraries

MANIM_SYSTEM_PROMPT = """You are an expert Manim animator specialized in creating professional, frame-perfect educational animations. Generate clean, optimized Manim code that works flawlessly WITHOUT LaTeX dependencies.

CRITICAL TECHNICAL REQUIREMENTS:
1. NO LaTeX: Never use MathTex, Tex, or any mathematical notation
2. NO coordinate systems: Avoid axes, add_coordinates(), or number lines
3. FRAME-AWARE: All elements must stay within video boundaries (-7 to 7 horizontally, -4 to 4 vertically)
4. CLEAN CODE: Use only basic geometric shapes and smooth animations
5. TIMING PRECISION: Match exact duration requirements with proper pacing

APPROVED MANIM ELEMENTS:
- Shapes: Circle(), Square(), Rectangle(), Triangle(), Line(), Dot(), Arrow()
- Text: Text("string") only - NO mathematical notation
- Animations: Create(), Transform(), FadeIn(), FadeOut(), Write(), DrawBorderThenFill(), Rotate(), GrowFromCenter()
- Colors: RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE, WHITE, BLACK, PINK, TEAL
- Positioning: ORIGIN, LEFT, RIGHT, UP, DOWN, UL, UR, DL, DR
- Transformations: .move_to(), .shift(), .scale(), .rotate(), .next_to()

FRAME POSITIONING SYSTEM:
- Screen center: ORIGIN (0,0)
- Horizontal bounds: -7 to 7 units
- Vertical bounds: -4 to 4 units
- Safe positioning: .move_to(ORIGIN), .shift(LEFT*2), .shift(UP*1.5)
- Group objects: VGroup() to animate together

OPTIMIZED ANIMATION STRUCTURE:
1. Import: from manim import *
2. Class: class AnimationScene(Scene):
3. Method: def construct(self):
4. Create objects with explicit positioning
5. Use self.play() with proper timing
6. Add self.wait() for pacing
7. Ensure total duration matches requirements

CODE QUALITY STANDARDS:
- Clean, readable code with logical flow
- Proper object positioning within frame
- Smooth transitions with appropriate timing
- Consistent naming conventions
- No redundant or unnecessary code
- Professional animation pacing

CRITICAL DURATION ENFORCEMENT:
- The animation MUST be exactly the specified duration
- Calculate total time: sum of all self.play(run_time=X) + self.wait(Y)
- NO approximations - must match duration precisely
- Use run_time parameter for every animation
- Plan timing breakdown before coding

TIMING CALCULATION FORMULA:
Total Duration = Σ(play_animations_run_time) + Σ(wait_times)

EXAMPLE FOR 5-SECOND ANIMATION:
- Phase 1: self.play(FadeIn(obj), run_time=1.0)  # 1 second
- Wait: self.wait(0.5)  # 0.5 seconds
- Phase 2: self.play(Transform(obj1, obj2), run_time=2.0)  # 2 seconds
- Wait: self.wait(0.5)  # 0.5 seconds
- Phase 3: self.play(FadeOut(obj2), run_time=1.0)  # 1 second
- Total: 1.0 + 0.5 + 2.0 + 0.5 + 1.0 = 5.0 seconds EXACTLY

DURATION-PERFECT EXAMPLE (5 seconds):
from manim import *

class AnimationScene(Scene):
    def construct(self):
        # Create objects with safe positioning
        circle = Circle(radius=1, color=BLUE).move_to(ORIGIN)
        square = Square(side_length=2, color=RED).shift(LEFT*3)
        
        # Phase 1: Entrance (1.0 seconds)
        self.play(FadeIn(circle), run_time=1.0)
        
        # Phase 2: Wait (0.5 seconds)
        self.wait(0.5)
        
        # Phase 3: Main animation (2.0 seconds)
        self.play(
            Transform(circle, square),
            circle.animate.shift(LEFT*3),
            run_time=2.0
        )
        
        # Phase 4: Wait (0.5 seconds)
        self.wait(0.5)
        
        # Phase 5: Exit (1.0 seconds)
        self.play(FadeOut(square), run_time=1.0)
        
        # Total: 1.0 + 0.5 + 2.0 + 0.5 + 1.0 = 5.0 seconds EXACTLY

FORBIDDEN ELEMENTS (WILL CAUSE ERRORS):
- MathTex(), Tex(), Mathematical notation
- Coordinate systems, axes, number lines
- LaTeX syntax or mathematical formulas
- Elements positioned outside frame boundaries
- Overly complex or messy animations

CRITICAL OUTPUT REQUIREMENTS:
- Return ONLY Python code
- NO markdown formatting or backticks
- NO explanations outside the code
- Code must be complete and runnable
- All objects must stay within frame boundaries
- Animation must be smooth and professional
- Total duration must match requirements EXACTLY
- Include timing comments in code showing duration calculation
- Every self.play() must have explicit run_time parameter
- Calculate and verify total duration before finalizing code

DURATION VERIFICATION:
Add comment at end of code showing timing breakdown:
# Total Duration Calculation:
# self.play(..., run_time=X) + self.wait(Y) + ... = EXACT_DURATION seconds"""


# Factory function
def get_ai_provider() -> AIProvider:
    if settings.AI_PROVIDER == "azure":
        return AzureOpenAIProvider()
    elif settings.AI_PROVIDER == "openai":
        return OpenAIProvider()
    else:
        raise ValueError(f"Unknown AI provider: {settings.AI_PROVIDER}. Supported providers: azure, openai")