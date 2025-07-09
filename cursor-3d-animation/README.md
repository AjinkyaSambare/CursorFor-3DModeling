# Cursor for 3D Animation

AI-powered platform that transforms natural language prompts into professional 3D animations using Three.js, Manim, and p5.js.

## Features

- 🤖 AI-powered animation generation from text prompts
- 🎨 Support for multiple animation libraries (Three.js, Manim, p5.js)
- 🎬 Real-time preview and rendering
- 📦 Local storage (no database required)
- 🎯 Clean, professional UI

## Quick Start

### Prerequisites

- Python 3.8+ with virtual environment
- Node.js 16+
- Azure OpenAI API access (or OpenAI/Anthropic API keys)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Activate Python virtual environment:
```bash
source /Users/Ajinkya25/Documents/Projects/3D-Modeling/manim_env/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API keys
```

5. Run the backend:
```bash
python run.py
```

The backend will start at http://localhost:8000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will start at http://localhost:5173

## Usage

1. Open http://localhost:5173 in your browser
2. Click "Create" or "Start Creating"
3. Enter a description of the animation you want
4. Select animation library and settings
5. Click "Generate Animation"
6. Watch as your animation is created in real-time

## Example Prompts

- "Create a rotating 3D cube with glowing edges"
- "Visualize a binary search algorithm step by step"
- "Show particle physics simulation with collisions"
- "Animate a DNA double helix structure"
- "Create a 3D solar system with orbiting planets"

## Project Structure

```
cursor-3d-animation/
├── backend/           # FastAPI backend
│   ├── app/          # Application code
│   ├── storage/      # Local file storage
│   └── tests/        # Test files
├── frontend/         # React frontend
│   ├── src/          # Source code
│   └── public/       # Static assets
└── docs/            # Documentation
```

## API Documentation

Once the backend is running, visit:
- API docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Development

This is a minimal MVP focusing on core functionality. Future enhancements planned:
- User authentication
- Cloud storage integration
- Timeline editor for combining scenes
- Voice narration
- Export to multiple formats

## License

MIT