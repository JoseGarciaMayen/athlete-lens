from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.crud import (
    get_athlete, update_athlete, get_sessions, create_session,
    get_best_vertical_per_session, get_best_horizontal_per_session, get_best_sprint_per_session,
    get_all_metrics, delete_vertical_metric, delete_horizontal_metric, delete_sprint_metric,
    update_metric_date
)
from db.database import get_db
from api.schemas import AthleteUpdate, SessionCreate
from datetime import date as date_type

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

    if athlete is None:
        raise HTTPException(status_code=404, detail="No athlete profile found")

    session = create_session(db=db, athlete_id=athlete.id, date=data.date, notes=data.notes)
    return session

@router.get("/sessions")
def get_sessions_profile(db:Session = Depends(get_db)):
    sessions = get_sessions(db=db)
    return sessions

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    vertical = get_best_vertical_per_session(db)
    horizontal = get_best_horizontal_per_session(db)
    sprint_30 = get_best_sprint_per_session(db, distance_m=30)
    sprint_60 = get_best_sprint_per_session(db, distance_m=60)

    return {
        "vertical_jump": [{"date": d, "value": v} for d, v in vertical],
        "sprint_30m": [{"date": d, "value": v} for d, v in sprint_30],
        "sprint_60m": [{"date": d, "value": v} for d, v in sprint_60],
        "horizontal_jump": [{"date": d, "value": v} for d, v in horizontal],
    }

@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    return get_all_metrics(db)

@router.delete("/metrics/vertical/{metric_id}")
def delete_vertical(metric_id: int, db: Session = Depends(get_db)):
    deleted = delete_vertical_metric(db, metric_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Metric not found")
    return {"success": True}


@router.delete("/metrics/horizontal/{metric_id}")
def delete_horizontal(metric_id: int, db: Session = Depends(get_db)):
    deleted = delete_horizontal_metric(db, metric_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Metric not found")
    return {"success": True}

@router.delete("/metrics/sprint/{metric_id}")
def delete_sprint(metric_id: int, db: Session = Depends(get_db)):
    deleted = delete_sprint_metric(db, metric_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Metric not found")
    return {"success": True}

@router.patch("/metrics/{metric_type}/{metric_id}/date")
def patch_metric_date(metric_type: str, metric_id: int, new_date: str, db: Session = Depends(get_db)):
    try:
        parsed_date = date_type.fromisoformat(new_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date format, expected YYYY-MM-DD")

    updated = update_metric_date(db, metric_type, metric_id, parsed_date)
    if not updated:
        raise HTTPException(status_code=404, detail="Metric not found")
    return {"success": True}
