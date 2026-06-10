from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.crud import get_athlete, update_athlete, get_sessions, create_session
from db.database import get_db
from api.schemas import AthleteUpdate, SessionCreate

router = APIRouter()

@router.get("/athlete")
def get_athlete_profile(db:Session = Depends(get_db)):
    athlete = get_athlete(db)
    if athlete is None:
        raise HTTPException(status_code=404, detail="No athlete profile found")
    return athlete

@router.put("/athlete")
def put_athlete_profile(data: AthleteUpdate, db: Session = Depends(get_db)):
    athlete = update_athlete(db=db, name=data.name, weight_kg=data.weight_kg, height_cm=data.height_cm)
    if athlete is None:
        raise HTTPException(status_code=404, detail="No athlete profile found")
    return athlete

@router.post("/sessions")
def post_session_profile(data: SessionCreate, db: Session = Depends(get_db)):
    athlete = get_athlete(db)
    session = create_session(db=db, athlete_id=athlete.id, date=data.date, notes=data.notes)
    return session

@router.get("/sessions")
def get_sessions_profile(db:Session = Depends(get_db)):
    sessions = get_sessions(db=db)
    return sessions