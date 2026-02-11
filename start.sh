#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Start both frontend and backend
echo "Starting Recipe App..."
echo ""

# Start backend in background
echo "🚀 Starting backend..."
cd "$SCRIPT_DIR/backend"
source .venv/bin/activate
uvicorn main:app --reload --reload-exclude '.venv/*' --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 3

# Start frontend
echo "🎨 Starting frontend..."
cd "$SCRIPT_DIR/frontend"
npm run dev

# Cleanup: kill backend when frontend stops
trap "kill $BACKEND_PID 2>/dev/null" EXIT
