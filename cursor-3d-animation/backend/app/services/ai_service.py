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
        logger.info(f"Azure AI Generated code (raw):\n{code}")
        cleaned_code = self._clean_code(code)
        logger.info(f"Azure AI Generated code (cleaned):\n{cleaned_code}")
        return cleaned_code

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
5. Include strategic wait times for natural rhythm (MINIMUM 0.1 seconds - NEVER use 0.0)
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
        
        # Fix invalid wait durations that cause Manim errors
        code = self._fix_wait_durations(code)
        
        # Fix text overlap issues
        code = self._fix_text_overlaps(code)
        
        return code.strip()
    
    def _fix_wait_durations(self, code: str) -> str:
        """Fix invalid wait durations that cause Manim rendering errors"""
        import re
        
        # Pattern to find self.wait(0.0) or self.wait(0)
        wait_pattern = r'self\.wait\(0(?:\.0+)?\)'
        
        # Replace with minimum valid duration
        code = re.sub(wait_pattern, 'self.wait(0.1)', code)
        
        # Also check for negative wait times
        negative_wait_pattern = r'self\.wait\(-[0-9.]+\)'
        code = re.sub(negative_wait_pattern, 'self.wait(0.1)', code)
        
        logger.info("Fixed invalid wait durations in generated code")
        return code
    
    def _fix_text_overlaps(self, code: str) -> str:
        """Add automatic text cleanup to prevent overlapping text issues"""
        lines = code.split('\n')
        
        # Find text creation patterns and add cleanup
        new_lines = []
        text_vars = set()
        
        for i, line in enumerate(lines):
            # Track text variable names
            if 'Text(' in line and '=' in line:
                var_name = line.split('=')[0].strip()
                text_vars.add(var_name)
            
            # If we see a new text being created and we have existing text, add fadeout
            if 'Text(' in line and '=' in line and len(text_vars) > 1:
                # Get the new text variable
                new_var = line.split('=')[0].strip()
                
                # Add fadeout for previous text variables before this line
                for var in list(text_vars):
                    if var != new_var:
                        fadeout_line = f"        # Remove previous text to prevent overlap"
                        new_lines.append(fadeout_line)
                        fadeout_line = f"        self.play(FadeOut({var}), run_time=0.3)"
                        new_lines.append(fadeout_line)
                        text_vars.remove(var)
                        break
            
            new_lines.append(line)
        
        result = '\n'.join(new_lines)
        if len(text_vars) > 1:
            logger.info(f"Fixed potential text overlaps for variables: {text_vars}")
        
        return result

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
5. Include strategic wait times for natural rhythm (MINIMUM 0.1 seconds - NEVER use 0.0)
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
        
        # Fix invalid wait durations that cause Manim errors
        code = self._fix_wait_durations(code)
        
        # Fix text overlap issues
        code = self._fix_text_overlaps(code)
        
        return code.strip()
    
    def _fix_wait_durations(self, code: str) -> str:
        """Fix invalid wait durations that cause Manim rendering errors"""
        import re
        
        # Pattern to find self.wait(0.0) or self.wait(0)
        wait_pattern = r'self\.wait\(0(?:\.0+)?\)'
        
        # Replace with minimum valid duration
        code = re.sub(wait_pattern, 'self.wait(0.1)', code)
        
        # Also check for negative wait times
        negative_wait_pattern = r'self\.wait\(-[0-9.]+\)'
        code = re.sub(negative_wait_pattern, 'self.wait(0.1)', code)
        
        logger.info("Fixed invalid wait durations in generated code")
        return code
    
    def _fix_text_overlaps(self, code: str) -> str:
        """Add automatic text cleanup to prevent overlapping text issues"""
        lines = code.split('\n')
        
        # Find text creation patterns and add cleanup
        new_lines = []
        text_vars = set()
        
        for i, line in enumerate(lines):
            # Track text variable names
            if 'Text(' in line and '=' in line:
                var_name = line.split('=')[0].strip()
                text_vars.add(var_name)
            
            # If we see a new text being created and we have existing text, add fadeout
            if 'Text(' in line and '=' in line and len(text_vars) > 1:
                # Get the new text variable
                new_var = line.split('=')[0].strip()
                
                # Add fadeout for previous text variables before this line
                for var in list(text_vars):
                    if var != new_var:
                        fadeout_line = f"        # Remove previous text to prevent overlap"
                        new_lines.append(fadeout_line)
                        fadeout_line = f"        self.play(FadeOut({var}), run_time=0.3)"
                        new_lines.append(fadeout_line)
                        text_vars.remove(var)
                        break
            
            new_lines.append(line)
        
        result = '\n'.join(new_lines)
        if len(text_vars) > 1:
            logger.info(f"Fixed potential text overlaps for variables: {text_vars}")
        
        return result

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

🚨 CRITICAL: TEXT POSITIONING & OVERLAP PREVENTION
- **ALWAYS REMOVE OLD TEXT**: Use FadeOut() or Unwrite() to remove previous text before showing new text
- **NO SIMULTANEOUS TEXT**: Only one text element should be visible in the same screen area at a time
- **CLEAR TRANSITIONS**: 
  * Old text → FadeOut(old_text, run_time=0.5)
  * Wait briefly → self.wait(0.2) 
  * New text → FadeIn(new_text, run_time=0.5)
- **POSITIONING STRATEGY**:
  * Use consistent positions (e.g., always UP*2 for titles)
  * Use .move_to(ORIGIN) for centered text
  * Use .move_to(UP*2) for top text, .move_to(DOWN*2) for bottom text
- **PREVENT OVERLAPPING**: 
  * NEVER place multiple text elements in same location
  * Remove existing text before adding new text at same position
  * Use ReplacementTransform(old_text, new_text) for text changes
- **SPACING RULES**: Minimum 2 unit spacing between simultaneous text elements
- **TEXT LIFECYCLE**: Create → Use → Remove → Create Next (never accumulate text)

🎨 VISUAL DESIGN EXCELLENCE & COLOR SCHEME:
- **DEFAULT COLOR SCHEME**: 
  * Background: BLACK (default manim background - DO NOT change)
  * Text color: WHITE (unless user specifies otherwise)
  * Objects: Use vibrant colors (RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE)
- **USER-SPECIFIED COLORS**: If user mentions specific colors, follow their request exactly
- **CONTRAST RULES**: Ensure text is always readable against background
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
- **RESPECT USER INTENT**: Follow user's specific alignment/positioning requests exactly
- **DEFAULT TO CENTER**: When no alignment specified, center main text using .move_to(ORIGIN)
- **DEFAULT COLORS**: Use WHITE text (color=WHITE) on BLACK background unless user specifies colors
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
- Include brief pauses (self.wait(0.3)) for emphasis and clarity (NEVER self.wait(0.0))

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

PERFECT TEXT MANAGEMENT EXAMPLE (5 seconds):
from manim import *

class AnimationScene(Scene):
    def construct(self):
        # Phase 1: Show first text (1.5s)
        title1 = Text("Step 1: Initialize", font_size=36, color=WHITE).move_to(ORIGIN)
        self.play(FadeIn(title1), run_time=1.0)
        self.wait(0.5)
        
        # Phase 2: Replace with second text - NO OVERLAP! (1.5s)
        title2 = Text("Step 2: Process", font_size=36, color=WHITE).move_to(ORIGIN)
        self.play(FadeOut(title1), run_time=0.3)  # Remove old text first
        self.wait(0.2)  # Brief pause
        self.play(FadeIn(title2), run_time=1.0)  # Add new text
        
        # Phase 3: Replace with final text - NO OVERLAP! (1.5s)
        title3 = Text("Step 3: Complete", font_size=36, color=WHITE).move_to(ORIGIN)
        self.play(FadeOut(title2), run_time=0.3)  # Remove old text first
        self.wait(0.2)  # Brief pause
        self.play(FadeIn(title3), run_time=1.0)  # Add new text
        
        # Phase 4: Clean exit (0.5s)
        self.play(FadeOut(title3), run_time=0.5)
        
        # Total: 1.5 + 1.5 + 1.5 + 0.5 = 5.0 seconds EXACTLY

FORBIDDEN ELEMENTS (WILL CAUSE ERRORS):
- MathTex(), Tex(), Mathematical notation
- Coordinate systems, axes, number lines
- LaTeX syntax or mathematical formulas
- Elements positioned outside frame boundaries
- OVERLAPPING TEXT OR LABELS (CRITICAL ERROR - ALWAYS FADE OUT OLD TEXT FIRST!)
- Multiple Text objects visible simultaneously in same area
- Text accumulation without removal (creates visual mess)
- Text positioned without proper spacing
- Labels that cover or interfere with objects
- Multiple text elements at same position
- Overly complex or messy animations
- INVALID WAIT DURATIONS:
  • self.wait(0.0) - CAUSES MANIM ERROR! Use self.wait(0.1) minimum
  • self.wait(0) - CAUSES MANIM ERROR! Use self.wait(0.1) minimum
  • Any negative wait durations
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
- **MANDATORY TEXT MANAGEMENT**: Always FadeOut old text before FadeIn new text
- **NO TEXT ACCUMULATION**: Only one text element per screen area at any time
- **CLEAN TRANSITIONS**: old_text → FadeOut → wait(0.2) → new_text → FadeIn
- Use ReplacementTransform for text changes instead of overlapping
- Position all text elements with minimum 2 unit separation if simultaneous
- Use buff=1.0 or greater in .next_to() calls for text spacing
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