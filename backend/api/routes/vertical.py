import tempfile
import os
import subprocess
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends, Request
from core.vertical.extractor import analyze
from db.crud import get_or_create_session, create_vertical_metric, get_athlete
from db.database import get_db
from sqlalchemy.orm import Session
from datetime import date

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/analyze/vertical")
def analyze_vertical(
    request: Request,
    file: UploadFile | None = File(None),
    session_date: str = Form(...),
    notes: str = Form(None),
    jump_height_cm: float | None = Form(None),
    db: Session = Depends(get_db)
    ):
    if file is None and jump_height_cm is None:
        raise HTTPException(status_code=422, detail="Either file or jump_height_cm is required")

    athlete = get_athlete(db)
    if athlete is None:
        raise HTTPException(status_code=400, detail="No athlete profile found. Please create your profile first.")

    try:
        session_date_parsed = date.fromisoformat(session_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid session_date format, expected YYYY-MM-DD")

    session = get_or_create_session(db=db, athlete_id=athlete.id, date=session_date_parsed, notes=notes)

    if file is not None:
        contents = file.file.read()

        if not contents:
            raise HTTPException(status_code=422, detail="File is empty")

        model = request.app.state.model

        with tempfile.NamedTemporaryFile(delete=True, suffix=os.path.splitext(file.filename)[1]) as tmp:
            tmp.write(contents)
            tmp.flush()
            raw_path = tmp.name

            try:
                result = analyze(raw_path, model)
            except Exception as e:
                logger.exception("Unexpected error during vertical analysis")
                raise HTTPException(status_code=500, detail="Internal error during video analysis")

        if not result["success"]:
            raise HTTPException(status_code=422, detail=result["error"])
    else:
        result = {
            "success": True,
            "jump_height_cm": jump_height_cm,
            "flight_time_ms": None,
            "takeoff_frame": None,
            "landing_frame": None,
            "fps_used": None,
        }

    create_vertical_metric(
        db=db,
        session_id=session.id,
        jump_height_cm=result["jump_height_cm"],
        flight_time_ms=result["flight_time_ms"],
        fps_used=result["fps_used"],
        takeoff_frame=result["takeoff_frame"],
        landing_frame=result["landing_frame"]
        )

    return result