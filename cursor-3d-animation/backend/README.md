# Cursor for 3D Animation - Backend

FastAPI backend for AI-powered 3D animation generation.

## Setup

1. Create virtual environment:
```bash
source /Users/Ajinkya25/Documents/Projects/3D-Modeling/manim_env/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Run the server:
```bash
python run.py
```

## API Documentation

Once running, visit:
- API docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── api/          # API endpoints
│   ├── core/         # Core configuration
│   ├── models/       # Data models
│   ├── services/     # Business logic
│   └── workers/      # Background tasks
├── storage/          # Local file storage
├── tests/            # Test files
└── run.py           # Entry point
```