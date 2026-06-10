import tempfile
import os

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from core.acoustic.extractor import analyze
from db.crud import get_or_create_session, create_acoustic_metric, get_athlete
from db.database import get_db
from sqlalchemy.orm import Session
from datetime import date

router = APIRouter()

@router.post("/analyze/acoustic")
async def analyze_acoustic(
    file: UploadFile = File(...),
    session_date: str = Form(...),
    notes: str = Form(None),
    db: Session = Depends(get_db)
    ):
    contents = await file.read()

    if not contents:
        raise HTTPException(status_code=422, detail="File is empty")

    athlete = get_athlete(db)
    if athlete is None:
        raise HTTPException(status_code=400, detail="No athlete profile found. Please create your profile first.")

    session_date_parsed = date.fromisoformat(session_date)
    session = get_or_create_session(db=db, athlete_id=athlete.id, date=session_date_parsed, notes=notes)

    with tempfile.NamedTemporaryFile(delete=True, suffix = os.path.splitext(file.filename)[1]) as tmp:
        tmp.write(contents)
        tmp.flush()
        raw_path = tmp.name

        try:
            result = analyze(raw_path)
        except Exception as e:
            raise HTTPException(status_code=422, detail=str(e))

    create_acoustic_metric(
        db=db, 
        session_id=session.id, 
        time_delta_ms=result["time_delta_ms"], 
        events_detected=result["events_detected"], 
        raw_file_path=raw_path
        )

    return result
        
    