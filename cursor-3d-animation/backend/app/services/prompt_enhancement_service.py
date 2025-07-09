import logging
from typing import Dict, Any
from openai import AzureOpenAI

from app.models.scene import AnimationLibrary

logger = logging.getLogger(__name__)

class PromptEnhancementService:
    def __init__(self):
        self.client = AzureOpenAI(
            azure_endpoint="https://access-01.openai.azure.com",
            api_key="FXKWeX5juTW9kTgGcv3H3rWladBJZGN3Jm7OWqOdONVtuLqx9gH4JQQJ99AKACfhMk5XJ3w3AAABACOGFVFg",
            api_version="2025-01-01-preview"
        )
        self.deployment_name = "gpt-4"
    
    async def enhance_prompt(
        self, 
        original_prompt: str, 
        library: AnimationLibrary, 
        duration: int,
        style: Dict[str, Any] = None
    ) -> str:
        """Enhance a rough user prompt into a detailed, library-specific animation description"""
        
        system_prompt = self._get_enhancement_prompt(library, duration)
        user_prompt = self._format_enhancement_request(original_prompt, library, duration, style)
        
        try:
            response = self.client.chat.completions.create(
                model=self.deployment_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=800,
                top_p=0.9,
                frequency_penalty=0.1,
                presence_penalty=0.1
            )
            
            enhanced_prompt = response.choices[0].message.content.strip()
            logger.info(f"Enhanced prompt for {library}: {original_prompt} -> {enhanced_prompt}")
            return enhanced_prompt
            
        except Exception as e:
            logger.error(f"Error enhancing prompt: {e}")
            # Return original prompt if enhancement fails
            return original_prompt
    
    def _get_enhancement_prompt(self, library: AnimationLibrary, duration: int) -> str:
        """Get library-specific enhancement system prompt"""
        
        if library == AnimationLibrary.MANIM:
            return f"""You are an expert Manim animation prompt enhancer. Transform rough user ideas into detailed, precise, and technically accurate animation descriptions that are exactly {duration} seconds long.

CRITICAL TECHNICAL REQUIREMENTS:
- NO LaTeX, MathTex, or Tex elements whatsoever
- Use ONLY basic geometric shapes: Circle, Square, Rectangle, Triangle, Line, Dot, Arrow
- All objects must be positioned within video frame boundaries
- Include specific colors: RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE, WHITE, BLACK
- Specify exact positioning relative to screen center
- Define clear timing and duration for each animation phase that sums to {duration} seconds exactly
- Avoid mathematical notation, equations, or coordinate systems
- Every animation phase must have precise timing specified

FRAME POSITIONING GUIDELINES:
- Center objects using .move_to(ORIGIN) or relative positioning
- Use .shift(LEFT*2), .shift(RIGHT*2), .shift(UP*2), .shift(DOWN*2) for positioning
- Keep all elements within visible screen boundaries
- Group related objects to ensure they animate together smoothly

CRITICAL DURATION TIMING:
- Animation MUST be exactly {duration} seconds - no approximations
- Break animation into precise timed phases that sum to {duration} seconds
- Each phase must have specific duration (e.g., "fade in for 1 second")
- Include exact wait times between phases
- Provide timing breakdown: Phase 1 (X seconds) + Wait (Y seconds) + Phase 2 (Z seconds) = {duration} seconds
- Use smooth transitions: Create, Transform, FadeIn, FadeOut, Write, DrawBorderThenFill
- Every animation action must specify its exact duration

DETAILED ENHANCEMENT REQUIREMENTS:
1. OBJECTS: Define exact shapes, colors, sizes, and initial positions
2. MOVEMENTS: Specify direction, speed, and exact duration for each movement
3. TRANSFORMATIONS: Detail what changes into what and how long each transformation takes
4. TIMING: Break down the animation into precise timed segments that sum to {duration} seconds
5. COLORS: Assign specific colors to each object and color changes
6. POSITIONING: Use precise relative positioning (center, left 2 units, etc.)
7. FLOW: Ensure smooth transitions between animation phases
8. DURATION BREAKDOWN: Provide exact timing for each phase (e.g., "Phase 1: 1.5 seconds, Wait: 0.5 seconds, Phase 2: 2 seconds")

EXAMPLE TRANSFORMATIONS WITH PRECISE TIMING:
- "bouncing ball" → "A bright blue circle (radius 0.5) starts at the top center of the screen. Phase 1 (1 second): Ball drops down with gravity. Phase 2 (0.5 seconds): Ball changes color to red on impact. Phase 3 (1 second): Ball bounces back up. Phase 4 (0.5 seconds): Wait at top. Phase 5 (1 second): Second bounce down. Phase 6 (1 second): Final bounce up and settle. Total: 5 seconds exactly."
- "rotating shape" → "A green square (side length 1) positioned at screen center. Phase 1 (1.5 seconds): Square rotates clockwise 360 degrees. Phase 2 (0.5 seconds): Square transforms into purple triangle. Phase 3 (1.5 seconds): Triangle continues rotating while changing color to orange. Phase 4 (0.5 seconds): Triangle stops rotation and settles. Total: 4 seconds exactly."

OUTPUT FORMAT: Return only the enhanced prompt description with all technical details included. Must include precise timing breakdown showing how phases sum to {duration} seconds. No explanations or additional text."""

        else:
            # Default enhancement for unknown libraries
            return f"""You are an expert prompt enhancer for animation creation. Transform rough user prompts into detailed, precise animation descriptions that are exactly {duration} seconds long.

ENHANCEMENT RULES:
1. Add specific visual details (colors, shapes, sizes)
2. Include movement and transition descriptions with exact timing
3. Specify timing and duration elements that sum to {duration} seconds
4. Add positioning and spatial relationships
5. Make descriptions clear and actionable
6. Ensure technical feasibility
7. Provide timing breakdown for each phase

OUTPUT FORMAT: Return only the enhanced prompt description with precise timing breakdown, no extra text or explanations."""
    
    def _format_enhancement_request(
        self, 
        original_prompt: str, 
        library: AnimationLibrary, 
        duration: int, 
        style: Dict[str, Any] = None
    ) -> str:
        """Format the enhancement request with context"""
        
        style_info = ""
        if style:
            style_info = f"Style preferences: {style}\n"
        
        return f"""ORIGINAL USER PROMPT: "{original_prompt}"

ANIMATION SPECIFICATIONS:
- Library: {library.value}
- Total Duration: {duration} seconds EXACTLY
- Resolution: 1920x1080 (HD)
- Frame Rate: 60 FPS
{style_info}
CRITICAL TASK: Transform the original prompt into a comprehensive, frame-aware animation description that includes:
1. Exact object specifications (shapes, colors, sizes)
2. Precise positioning within video frame boundaries
3. DETAILED TIMING BREAKDOWN: Each phase must have exact duration that sums to {duration} seconds
4. Smooth transition descriptions between phases
5. Technical implementation details for {library.value}
6. Duration verification: Phase 1 (X sec) + Phase 2 (Y sec) + ... = {duration} seconds

The enhanced prompt MUST include a precise timing breakdown showing how the animation phases add up to exactly {duration} seconds. Every animation action must have a specific duration assigned.

Ensure the enhanced prompt is complete, actionable, and will produce a professional animation that stays within frame boundaries and executes for precisely {duration} seconds."""
    
    def analyze_prompt_quality(self, prompt: str) -> Dict[str, Any]:
        """Analyze prompt quality and suggest improvements"""
        
        issues = []
        suggestions = []
        score = 100
        
        # Check for vague prompts
        if len(prompt.split()) < 3:
            issues.append("Too vague - needs more detail")
            suggestions.append("Add colors, shapes, and movement description")
            score -= 30
        
        # Check for LaTeX issues
        latex_keywords = ["equation", "formula", "x²", "y=", "graph", "function", "derivative", "integral"]
        if any(keyword in prompt.lower() for keyword in latex_keywords):
            issues.append("Contains mathematical notation that may cause LaTeX errors")
            suggestions.append("Use basic geometric shapes and simple descriptions instead")
            score -= 40
        
        # Check for complexity
        complex_keywords = ["complex", "advanced", "sophisticated", "intricate", "detailed"]
        if any(keyword in prompt.lower() for keyword in complex_keywords):
            issues.append("May be too complex for reliable generation")
            suggestions.append("Start with simpler animations and build complexity gradually")
            score -= 20
        
        # Check for good elements
        if any(color in prompt.lower() for color in ["red", "blue", "green", "yellow", "purple", "orange"]):
            score += 10
        
        if any(shape in prompt.lower() for shape in ["circle", "square", "triangle", "line", "dot"]):
            score += 10
        
        if any(action in prompt.lower() for action in ["transform", "rotate", "move", "change", "fade"]):
            score += 10
        
        return {
            "score": max(0, min(100, score)),
            "issues": issues,
            "suggestions": suggestions,
            "needs_enhancement": score < 70
        }