import logging

from fastapi import APIRouter, HTTPException, Form, Depends
from db.crud import get_or_create_session, create_horizontal_metric, get_athlete
from db.database import get_db
from sqlalchemy.orm import Session
from datetime import date

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/analyze/horizontal")
def analyze_horizontal(
    session_date: str = Form(...),
    jump_distance_cm: float = Form(...),
    notes: str = Form(None),
    db: Session = Depends(get_db)
    ):
    athlete = get_athlete(db)
    if athlete is None:
        raise HTTPException(status_code=400, detail="No athlete profile found. Please create your profile first.")

    try:
        session_date_parsed = date.fromisoformat(session_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid session_date format, expected YYYY-MM-DD")

    session = get_or_create_session(db=db, athlete_id=athlete.id, date=session_date_parsed, notes=notes)

    metric = create_horizontal_metric(db=db, session_id=session.id, jump_distance_cm=jump_distance_cm)

    return {
        "success": True,
        "jump_distance_cm": metric.jump_distance_cm,
        "session_id": metric.session_id
    }