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
        
        system_prompt = self._get_enhancement_prompt(library)
        user_prompt = self._format_enhancement_request(original_prompt, library, duration, style)
        
        try:
            response = self.client.chat.completions.create(
                model=self.deployment_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=500,
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
    
    def _get_enhancement_prompt(self, library: AnimationLibrary) -> str:
        """Get library-specific enhancement system prompt"""
        
        if library == AnimationLibrary.MANIM:
            return """You are an expert prompt enhancer for Manim animations. Transform rough user prompts into detailed, precise animation descriptions.

CRITICAL REQUIREMENTS:
- NO LaTeX, MathTex, or mathematical notation
- Use only basic geometric shapes (Circle, Square, Rectangle, Triangle, Line, Dot)
- Include specific colors (RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE, WHITE, BLACK)
- Specify smooth transitions and timing
- Avoid coordinate systems, axes, or complex mathematical concepts
- Focus on visual storytelling and educational concepts

ENHANCEMENT RULES:
1. Add specific colors to all objects
2. Include smooth transition descriptions
3. Specify positioning (center, left, right, up, down)
4. Add timing details for animations
5. Ensure all elements are LaTeX-free
6. Make descriptions visual and engaging

EXAMPLE TRANSFORMATIONS:
- "circle" → "A bright blue circle smoothly transforming into a red square at the center of the screen"
- "math" → "A green triangle rotating clockwise while changing color to purple"
- "graph" → "A yellow line growing from left to right, then changing to a curved blue line"

OUTPUT FORMAT: Return only the enhanced prompt description, no extra text or explanations."""

        elif library == AnimationLibrary.THREEJS:
            return """You are an expert prompt enhancer for Three.js 3D animations. Transform rough user prompts into detailed, precise 3D animation descriptions.

ENHANCEMENT FOCUS:
- 3D positioning and camera angles
- Lighting and material properties
- Realistic physics and movement
- Interactive elements and controls
- Scene composition and depth
- Smooth 3D transformations

ENHANCEMENT RULES:
1. Add 3D positioning details (x, y, z coordinates)
2. Include lighting descriptions (ambient, directional, point lights)
3. Specify material properties (metallic, glossy, transparent)
4. Add camera movement and angles
5. Include realistic physics (gravity, rotation, momentum)
6. Make scenes visually compelling with depth

EXAMPLE TRANSFORMATIONS:
- "cube" → "A metallic blue cube rotating slowly in 3D space with dramatic lighting and camera orbiting around it"
- "ball" → "A glossy red sphere bouncing realistically with gravity, shadow casting, and dynamic lighting"
- "shapes" → "Multiple colorful geometric objects floating in 3D space with interactive camera controls"

OUTPUT FORMAT: Return only the enhanced prompt description, no extra text or explanations."""

        elif library == AnimationLibrary.P5JS:
            return """You are an expert prompt enhancer for p5.js creative coding animations. Transform rough user prompts into detailed, creative animation descriptions.

ENHANCEMENT FOCUS:
- Creative coding patterns and algorithms
- Interactive elements and user input
- Particle systems and generative art
- Color gradients and visual effects
- Procedural animation and randomness
- Artistic and experimental visuals

ENHANCEMENT RULES:
1. Add creative coding elements (particles, noise, randomness)
2. Include interactive features (mouse, keyboard responses)
3. Specify color palettes and gradients
4. Add procedural generation details
5. Include artistic visual effects
6. Make animations experimental and engaging

EXAMPLE TRANSFORMATIONS:
- "dots" → "Hundreds of colorful particles moving in wave patterns, responding to mouse movement with trailing effects"
- "lines" → "Dynamic line patterns forming geometric shapes with smooth color transitions and interactive elements"
- "circle" → "A pulsating circle with particle emission, color-changing based on time, and mouse interaction"

OUTPUT FORMAT: Return only the enhanced prompt description, no extra text or explanations."""

        else:
            # Default enhancement for unknown libraries
            return """You are an expert prompt enhancer for animation creation. Transform rough user prompts into detailed, precise animation descriptions.

ENHANCEMENT RULES:
1. Add specific visual details (colors, shapes, sizes)
2. Include movement and transition descriptions
3. Specify timing and duration elements
4. Add positioning and spatial relationships
5. Make descriptions clear and actionable
6. Ensure technical feasibility

OUTPUT FORMAT: Return only the enhanced prompt description, no extra text or explanations."""
    
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
        
        return f"""Original prompt: "{original_prompt}"
Animation library: {library.value}
Duration: {duration} seconds
{style_info}
Please enhance this prompt into a detailed, specific animation description that will produce a high-quality {library.value} animation. Focus on being precise, visual, and technically achievable."""
    
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