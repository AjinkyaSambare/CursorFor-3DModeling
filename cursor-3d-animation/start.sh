#!/bin/bash

# Start script for Cursor for 3D Animation

echo "Starting Cursor for 3D Animation..."

# Function to kill processes on exit
cleanup() {
    echo "\nShutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup INT TERM

# Start backend
echo "Starting backend..."
cd backend
source /Users/Ajinkya25/Documents/Projects/3D-Modeling/manim_env/bin/activate
python run.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
echo "Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "

✨ Cursor for 3D Animation is running!

Backend:  http://localhost:8000
Frontend: http://localhost:5173
API Docs: http://localhost:8000/docs

Press Ctrl+C to stop
"

# Wait for processes
wait