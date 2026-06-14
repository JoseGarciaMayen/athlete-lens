import tempfile
import os
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends, Request
from core.sprint.extractor import analyze
from db.crud import get_or_create_session, create_sprint_metric, get_athlete
from db.database import get_db
from sqlalchemy.orm import Session
from datetime import date

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/analyze/sprint")
def analyze_sprint(
    request: Request,
    file: UploadFile | None = File(None),
    session_date: str = Form(...),
    notes: str = Form(None),
    distance_m: float = Form(...),
    sprint_time_s: float | None = Form(None),
    db: Session = Depends(get_db),
    fps: float | None = Form(None),
):
    if file is None and sprint_time_s is None:
        raise HTTPException(status_code=422, detail="Either file or sprint_time_s is required")

    athlete = get_athlete(db)
    if athlete is None:
        raise HTTPException(status_code=400, detail="No athlete profile found. Please create your profile first.")

    try:
        session_date_parsed = date.fromisoformat(session_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid session_date format, expected YYYY-MM-DD")

    session = get_or_create_session(db=db, athlete_id=athlete.id, date=session_date_parsed, notes=notes)

    if file is not None:
        MAX_BYTES = 100 * 1024 * 1024  # 100 MB
        if file.size and file.size > MAX_BYTES:
            raise HTTPException(status_code=413, detail="File too large (max 100 MB)")

        contents = file.file.read()

        if not contents:
            raise HTTPException(status_code=422, detail="File is empty")

        model = request.app.state.model

        with tempfile.NamedTemporaryFile(delete=True, suffix=os.path.splitext(file.filename)[1]) as tmp:
            tmp.write(contents)
            tmp.flush()
            raw_path = tmp.name

            try:
                result = analyze(raw_path, model, request.app.state.device, fps)
            except Exception:
                logger.exception("Unexpected error during sprint analysis")
                raise HTTPException(status_code=500, detail="Internal error during video analysis")

        if not result["success"]:
            raise HTTPException(status_code=422, detail=result["error"])
    else:
        result = {
            "success":        True,
            "sprint_time_s":  sprint_time_s,
            "crossing_frame": None,
            "fps_used":       None,
        }

    create_sprint_metric(
        db=db,
        session_id=session.id,
        distance_m=distance_m,
        sprint_time_s=result["sprint_time_s"],
        crossing_frame=result["crossing_frame"],
        fps_used=result["fps_used"],
    )

    return result
