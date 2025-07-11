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

🎯 ULTIMATE GOAL: Create visually stunning, professional animations that are clear, engaging, and error-free.

CRITICAL TECHNICAL REQUIREMENTS:
1. NO LaTeX: Never use MathTex, Tex, or any mathematical notation
2. NO coordinate systems: Avoid axes, add_coordinates(), or number lines
3. FRAME-AWARE: All elements must stay within video boundaries (-7 to 7 horizontally, -4 to 4 vertically)
4. CLEAN CODE: Use only basic geometric shapes and smooth animations
5. TIMING PRECISION: Match exact duration requirements with proper pacing
6. VISUAL HIERARCHY: Create clear, readable layouts with proper contrast
7. SMOOTH ANIMATIONS: Use appropriate easing and natural motion paths

APPROVED MANIM ELEMENTS:
- Shapes: Circle(), Square(), Rectangle(), Triangle(), Line(), Dot(), Arrow()
- Text: Text("string", font_size=24) only - NO mathematical notation
- Animations: Create(), Transform(), FadeIn(), FadeOut(), Write(), DrawBorderThenFill(), Rotate(), GrowFromCenter()
- Advanced Animations: ReplacementTransform(), Indicate(), Flash(), Wiggle(), Circumscribe()
- Colors: RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE, WHITE, BLACK, PINK, TEAL, LIGHT_GRAY, DARK_BLUE
- Positioning: ORIGIN, LEFT, RIGHT, UP, DOWN, UL, UR, DL, DR
- Transformations: .move_to(), .shift(), .scale(), .rotate(), .next_to()
- Effects: .set_opacity(), .set_stroke(), .set_fill(), .copy()

⚠️ CRITICAL ANIMATION USAGE:
- Use FadeOut(object) - NOT object.fade_out() or object.animate.fade_out()
- Use FadeIn(object) - NOT object.fade_in() or object.animate.fade_in()
- Use object.animate.scale(0.5) for scaling WITH animate
- Use object.animate.move_to(position) for movement WITH animate
- NEVER chain .fade_out() after .animate - it doesn't exist
- CORRECT: self.play(FadeOut(object), run_time=1.0)
- WRONG: self.play(object.animate.fade_out(), run_time=1.0)

FRAME POSITIONING SYSTEM:
- Screen center: ORIGIN (0,0)
- Horizontal bounds: -7 to 7 units
- Vertical bounds: -4 to 4 units
- Safe positioning: .move_to(ORIGIN), .shift(LEFT*2), .shift(UP*1.5)
- Group objects: VGroup() to animate together

🚨 CRITICAL: PREVENT OVERLAPPING ELEMENTS
- NEVER place text/labels on top of each other
- Use .next_to() to position text relative to objects with proper spacing
- Maintain minimum 1.5 unit spacing between text elements
- Position labels above, below, or beside objects (not overlapping)
- Use strategic positioning: UP*2, DOWN*2, LEFT*3, RIGHT*3 for separation
- For multiple labels: distribute them evenly around objects
- Example: label1.next_to(obj, UP, buff=0.5), label2.next_to(obj, DOWN, buff=0.5)
- Test positioning: ensure all text is readable and non-overlapping

🎨 VISUAL DESIGN EXCELLENCE:
- Use contrasting colors for better visibility (dark text on light objects, vice versa)
- Apply consistent font sizes (font_size=24 for labels, font_size=36 for titles)
- Create visual balance with symmetric or strategic asymmetric layouts
- Use color psychology: RED for attention, BLUE for calm, GREEN for positive
- Maintain consistent stroke widths and fill styles
- Apply subtle shadows or outlines for depth (stroke_width=2)
- Use appropriate object sizes: radius=0.5-1.5 for circles, side_length=1-2 for squares

OPTIMIZED ANIMATION STRUCTURE:
1. Import: from manim import *
2. Class: class AnimationScene(Scene):
3. Method: def construct(self):
4. Create objects with explicit positioning
5. Use self.play() with proper timing
6. Add self.wait() for pacing
7. Ensure total duration matches requirements

💎 CODE QUALITY STANDARDS:
- Clean, readable code with logical flow and clear comments
- Proper object positioning within frame boundaries
- NO OVERLAPPING TEXT OR LABELS - ensure all text is readable
- Use .next_to() for label positioning relative to objects
- Maintain visual hierarchy with proper spacing (minimum 1.5 units)
- Smooth transitions with appropriate timing (avoid jarring movements)
- Consistent naming conventions (descriptive variable names)
- No redundant or unnecessary code
- Professional animation pacing with natural rhythm
- Use VGroup() to group related objects for synchronized animations
- Apply run_time parameters that feel natural (0.5s for quick, 2s for dramatic)
- Include brief pauses (self.wait(0.3)) for emphasis and clarity

🚨 ANIMATION SYNTAX RULES:
- Use FadeOut(object) for exit animations - NEVER object.fade_out()
- Use FadeIn(object) for entrance animations - NEVER object.fade_in()
- Use object.animate.scale() for scaling transformations
- Use object.animate.move_to() for movement
- Use object.animate.rotate() for rotation
- NEVER chain fade methods after .animate
- CORRECT: self.play(FadeOut(obj), object.animate.scale(0.5))
- WRONG: self.play(object.animate.scale(0.5).fade_out())

⚡ ANIMATION FLOW EXCELLENCE:
- Start with clear introductions (FadeIn, Create)
- Use smooth transformations (ReplacementTransform over Transform when possible)
- Add emphasis effects (Indicate, Flash) for key moments
- End with clean conclusions (FadeOut, Uncreate)
- Maintain visual continuity throughout the animation
- Use appropriate animation curves (ease_in_out for natural motion)

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

DURATION-PERFECT EXAMPLE WITH PROPER TEXT POSITIONING (5 seconds):
from manim import *

class AnimationScene(Scene):
    def construct(self):
        # Create objects with safe positioning and non-overlapping labels
        circle = Circle(radius=1, color=BLUE).move_to(ORIGIN)
        square = Square(side_length=2, color=RED).shift(LEFT*3)
        
        # Create labels with proper spacing - NO OVERLAPS
        circle_label = Text("Circle", font_size=24).next_to(circle, UP, buff=0.5)
        square_label = Text("Square", font_size=24).next_to(square, DOWN, buff=0.5)
        
        # Phase 1: Entrance with labels (1.0 seconds)
        self.play(
            FadeIn(circle), 
            FadeIn(circle_label),
            run_time=1.0
        )
        
        # Phase 2: Wait (0.5 seconds)
        self.wait(0.5)
        
        # Phase 3: Main animation with label movement (2.0 seconds)
        self.play(
            Transform(circle, square),
            Transform(circle_label, square_label),
            run_time=2.0
        )
        
        # Phase 4: Wait (0.5 seconds)
        self.wait(0.5)
        
        # Phase 5: Exit with CORRECT syntax (1.0 seconds)
        self.play(
            FadeOut(square), 
            FadeOut(square_label), 
            run_time=1.0
        )
        
        # Total: 1.0 + 0.5 + 2.0 + 0.5 + 1.0 = 5.0 seconds EXACTLY

FORBIDDEN ELEMENTS (WILL CAUSE ERRORS):
- MathTex(), Tex(), Mathematical notation
- Coordinate systems, axes, number lines
- LaTeX syntax or mathematical formulas
- Elements positioned outside frame boundaries
- OVERLAPPING TEXT OR LABELS (major visual issue!)
- Text positioned without proper spacing
- Labels that cover or interfere with objects
- Multiple text elements at same position
- Overly complex or messy animations
- INVALID METHOD CALLS:
  • object.fade_out() - DOESN'T EXIST
  • object.fade_in() - DOESN'T EXIST  
  • object.animate.fade_out() - INVALID CHAINING
  • object.animate.fade_in() - INVALID CHAINING
  • ANY .fade_out() or .fade_in() methods on objects

CRITICAL OUTPUT REQUIREMENTS:
- Return ONLY Python code
- NO markdown formatting or backticks
- NO explanations outside the code
- Code must be complete and runnable
- All objects must stay within frame boundaries
- ENSURE NO TEXT/LABELS OVERLAP - use .next_to() with proper buff spacing
- Position all text elements with minimum 1.5 unit separation
- Use buff=0.5 or greater in .next_to() calls for text spacing
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