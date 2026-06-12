#!/usr/bin/env bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

echo -e "${BOLD}"
echo "  ╔═══════════════════════════════╗"
echo "  ║       Athlete Lens Setup      ║"
echo "  ╚═══════════════════════════════╝"
echo -e "${RESET}"

info "Checking dependencies..."

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    error "'$1' not found. $2"
  fi
}

check_cmd node  "Install Node.js from https://nodejs.org (v18+ recommended)"
check_cmd npm   "npm comes bundled with Node.js"

if ! command -v uv &>/dev/null; then
  warn "'uv' not found. Installing it now..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
  if ! command -v uv &>/dev/null; then
    error "uv installation failed. Install manually: https://github.com/astral-sh/uv"
  fi
  success "uv installed"
fi

success "All required tools are present"

info "Installing frontend dependencies..."
(
  cd frontend
  npm install --silent
)
success "Frontend dependencies installed"

if [[ ! -f frontend/.env ]]; then
  info "Creating frontend/.env from .env.example..."
  cp frontend/.env.example frontend/.env
  success "frontend/.env created"
else
  info "frontend/.env already exists – skipping"
fi

info "Setting up Python virtual environment (this may take a minute)..."
(
  cd backend
  uv sync --quiet
)
success "Backend dependencies installed"

echo ""
echo -e "${BOLD}Starting Athlete Lens...${RESET}"
echo -e "  ${CYAN}Backend${RESET}  → http://localhost:8000"
echo -e "  ${CYAN}Frontend${RESET} → http://localhost:5173"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop both servers"
echo ""

cleanup() {
  echo ""
  info "Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  success "All servers stopped. Goodbye!"
}
trap cleanup INT TERM

(
  cd backend
  uv run uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

sleep 2

(
  cd frontend
  npm run dev
) &
FRONTEND_PID=$!

wait "$BACKEND_PID" "$FRONTEND_PID"
