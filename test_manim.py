from manim import *

class HelloManim(Scene):
    def construct(self):
        # Create text
        text = Text("Hello from Manim!", font_size=48, color=BLUE)
        text.move_to(ORIGIN)
        
        # Create a circle
        circle = Circle(radius=1, color=RED)
        circle.move_to(LEFT * 3)
        
        # Create a square  
        square = Square(side_length=1.5, color=GREEN)
        square.move_to(RIGHT * 3)
        
        # Animate
        self.play(FadeIn(text), run_time=1)
        self.wait(1)
        self.play(Create(circle), Create(square), run_time=2)
        self.wait(1)
        self.play(FadeOut(text), FadeOut(circle), FadeOut(square), run_time=1)