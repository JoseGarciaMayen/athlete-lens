from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.acoustic import router as acoustic_router
from api.routes.sessions import router as sessions_router
from db.database import create_tables
from contextlib import asynccontextmanager
from ultralytics import YOLO

@asynccontextmanager
async def lifespan(app):
    create_tables()
    app.state.model = YOLO("yolov8n-pose.pt") # Preload model into memory to avoid loading it on every request
    yield

app = FastAPI(
    title="Athlete Lens API",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(acoustic_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok"}

