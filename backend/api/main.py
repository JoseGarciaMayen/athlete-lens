import os
import torch

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.vertical import router as vertical_router
from api.routes.sessions import router as sessions_router
from api.routes.horizontal import router as horizontal_router
from api.routes.sprint import router as sprint_router
from db.database import create_tables, SessionLocal
from db.crud import get_athlete, create_athlete
from contextlib import asynccontextmanager
from ultralytics import YOLO
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../frontend/.env"))

@asynccontextmanager
async def lifespan(app):
    create_tables()
    app.state.device = "cuda" if torch.cuda.is_available() else "cpu" # Check if there is GPU
    app.state.model = YOLO("yolov8n-pose.pt") # Preload model into memory to avoid loading it on every request

    db = SessionLocal()
    if get_athlete(db) is None:
        create_athlete(db, name="Athlete", weight_kg=None, height_cm=None) # Create default athlete if there isn't one
    db.close()

    yield

app = FastAPI(
    title="Athlete Lens API",
    version="0.1.0",
    lifespan=lifespan
)

_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", _frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vertical_router, prefix="/api")
app.include_router(horizontal_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(sprint_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok"}

