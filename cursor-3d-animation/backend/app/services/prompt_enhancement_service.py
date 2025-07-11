import logging
from typing import Dict, Any
from openai import AzureOpenAI

from app.core.config import settings
from app.models.scene import AnimationLibrary

logger = logging.getLogger(__name__)

class PromptEnhancementService:
    def __init__(self):
        self.client = AzureOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION
        )
        self.deployment_name = settings.AZURE_OPENAI_DEPLOYMENT_NAME
    
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
            return f"""You are an expert Manim animation prompt enhancer. Your job is to PRESERVE the user's core concept and requirements while adding technical precision for better animation results.

🎯 CORE PRINCIPLE: NEVER change the user's main idea, concept, or intent. Only add technical details and timing precision.

ENHANCEMENT APPROACH:
1. PRESERVE USER INTENT: Keep the exact concept, objects, and story the user described
2. ADD TECHNICAL PRECISION: Enhance with colors, positioning, timing, and implementation details
3. MAINTAIN CORE ELEMENTS: Do not substitute, replace, or fundamentally alter what the user requested
4. ENHANCE, DON'T TRANSFORM: Add details that make the user's vision technically feasible

TECHNICAL REQUIREMENTS TO ADD (without changing user concept):
- Specify colors for objects if not mentioned (RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE, WHITE, BLACK)
- Add positioning details (center, left, right, up, down) if not specified
- Include precise timing that sums to exactly {duration} seconds
- Use only basic geometric shapes: Circle, Square, Rectangle, Triangle, Line, Dot, Arrow
- NO LaTeX, MathTex, or mathematical notation
- Keep all elements within screen boundaries

TIMING ENHANCEMENT:
- Break the user's concept into {duration}-second timeline
- Add specific durations for each action/phase
- Include wait times between actions if needed
- Ensure total time = exactly {duration} seconds

EXAMPLES OF PROPER ENHANCEMENT:
❌ BAD: "dog running" → "green square moving left to right" (CHANGED CONCEPT)
✅ GOOD: "dog running" → "orange dog-shaped figure running from left side to right side of screen. Phase 1 (2s): Dog appears on left. Phase 2 (3s): Dog runs across screen. Total: 5s exactly."

❌ BAD: "solar system" → "three circles orbiting" (SIMPLIFIED TOO MUCH)
✅ GOOD: "solar system" → "yellow sun circle at center with blue earth circle and red mars circle orbiting around it. Phase 1 (1s): Planets appear. Phase 2 (4s): Planets orbit sun. Total: 5s exactly."

CRITICAL RULES:
- If user mentions specific objects, keep them
- If user mentions specific movements, preserve them
- If user mentions specific concepts, maintain them
- Only add technical details the user didn't specify
- Never replace user's vision with generic shapes unless they specifically asked for shapes

OUTPUT FORMAT: Return only the enhanced prompt with preserved user concept + technical details + {duration}-second timing breakdown."""

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
        
        return f"""🎯 USER'S ORIGINAL CONCEPT: "{original_prompt}"

ANIMATION SPECIFICATIONS:
- Library: {library.value}
- Total Duration: {duration} seconds EXACTLY
- Resolution: 1920x1080 (HD)
- Frame Rate: 60 FPS
{style_info}
🚨 CRITICAL INSTRUCTION: PRESERVE the user's exact concept, objects, and vision. DO NOT change their core idea.

ENHANCEMENT TASK: Keep the user's original concept exactly as described, but add:
1. Technical details (colors, sizes, positioning) WHERE NOT SPECIFIED by user
2. Precise timing breakdown that sums to {duration} seconds
3. Manim-compatible shape descriptions (Circle, Square, etc.) ONLY if user didn't specify objects
4. Frame positioning details ONLY if user didn't specify locations
5. Smooth transitions between the user's described actions

PRESERVE THESE FROM USER'S PROMPT:
- All specific objects/concepts they mentioned
- All movements/actions they described  
- All relationships/interactions they specified
- The overall story/narrative they intended

ONLY ADD TECHNICAL DETAILS THE USER DIDN'T PROVIDE:
- Colors (if not mentioned)
- Exact positioning (if not specified)
- Timing precision for each phase
- Shape details (if objects weren't clearly defined)

TIMING REQUIREMENT: Break the user's concept into phases that add up to exactly {duration} seconds.

EXAMPLE:
User: "cat chasing mouse" 
✅ GOOD: "Orange cat figure chasing small gray mouse figure across screen. Phase 1 (1s): Cat and mouse appear. Phase 2 (3s): Chase sequence. Phase 3 (1s): Cat catches mouse. Total: {duration}s"
❌ BAD: "Orange circle chasing blue circle" (lost the user's concept!)"""
    
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