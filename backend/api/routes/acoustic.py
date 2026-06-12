import tempfile
import os
import subprocess
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from core.acoustic.extractor import analyze
from db.crud import get_or_create_session, create_acoustic_metric, get_athlete
from db.database import get_db
from sqlalchemy.orm import Session
from datetime import date

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/analyze/acoustic")
def analyze_acoustic(
    file: UploadFile | None = File(None),
    session_date: str = Form(...),
    notes: str = Form(None),
    distance_m: int = Form(None),
    time_delta_ms: float | None = Form(None),
    db: Session = Depends(get_db)
    ):
    if file is None and time_delta_ms is None:
        raise HTTPException(status_code=422, detail="Either file or time_delta_ms is required")

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

        with tempfile.NamedTemporaryFile(delete=True, suffix=os.path.splitext(file.filename)[1]) as tmp:
            tmp.write(contents)
            tmp.flush()
            raw_path = tmp.name

            try:
                result = analyze(raw_path)
            except subprocess.CalledProcessError:
                raise HTTPException(status_code=422, detail="Could not process the uploaded file (invalid or corrupted media)")
            except Exception as e:
                logger.exception("Unexpected error during acoustic analysis")
                raise HTTPException(status_code=500, detail="Internal error during audio analysis")

        if not result["success"]:
            raise HTTPException(status_code=422, detail=result["error"])
    else:
        result = {
            "success": True,
            "time_delta_ms": time_delta_ms*1000,
            "events_detected": None,
            "timestamps_ms": [],
        }

    create_acoustic_metric(
        db=db,
        session_id=session.id,
        time_delta_ms=result["time_delta_ms"],
        events_detected=result["events_detected"],
        distance_m=distance_m
        )

    return result