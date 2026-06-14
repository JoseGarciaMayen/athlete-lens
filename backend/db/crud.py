from sqlalchemy import func
from sqlalchemy.orm import Session
from db.models import Athlete, Session as SessionModel, VerticalMetric, HorizontalMetric, SprintMetric

from datetime import date


def get_athlete(db: Session) -> Athlete | None:
    return db.query(Athlete).first()


def create_athlete(db: Session, name: str, weight_kg: float = None, height_cm: float = None) -> Athlete:
    athlete = Athlete(name=name, weight_kg=weight_kg, height_cm=height_cm)
    db.add(athlete)
    db.commit()
    db.refresh(athlete)
    return athlete


def update_athlete(db: Session, name: str = None, weight_kg: float = None, height_cm: float = None) -> Athlete | None:
    athlete = get_athlete(db)
    if athlete is None:
        return None
    if name is not None:
        athlete.name = name
    if weight_kg is not None:
        athlete.weight_kg = weight_kg
    if height_cm is not None:
        athlete.height_cm = height_cm
    db.commit()
    db.refresh(athlete)
    return athlete


def create_session(db: Session, athlete_id: int, date: date, notes: str = None) -> SessionModel:
    session = SessionModel(athlete_id=athlete_id, date=date, notes=notes)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def get_or_create_session(db: Session, athlete_id: int, date: date, notes: str = None) -> SessionModel:
    session = db.query(SessionModel).filter(SessionModel.date==date).filter(SessionModel.athlete_id==athlete_id).first()
    if session is not None:
        return session
    else:
        session = create_session(db, athlete_id, date, notes)
        return session

def get_sessions(db: Session) -> list[SessionModel]:
    return db.query(SessionModel).order_by(SessionModel.date.desc()).all()


def create_vertical_metric(
    db: Session,
    session_id: int,
    jump_height_cm: float,
    flight_time_ms: float | None,
    fps_used: int | None,
    takeoff_frame: int | None,
    landing_frame: int | None
) -> VerticalMetric:
    metric = VerticalMetric(
        session_id=session_id,
        jump_height_cm=jump_height_cm,
        flight_time_ms=flight_time_ms,
        fps_used=fps_used,
        takeoff_frame=takeoff_frame,
        landing_frame=landing_frame
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric

def create_horizontal_metric(db: Session, session_id: int, jump_distance_cm: float) -> HorizontalMetric:
    metric = HorizontalMetric(
        session_id=session_id,
        jump_distance_cm =jump_distance_cm
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric

def create_sprint_metric(
    db: Session,
    session_id: int,
    distance_m: float,
    sprint_time_s: float,
    crossing_frame: int | None,
    fps_used: float | None,
) -> SprintMetric:
    metric = SprintMetric(
        session_id=session_id,
        distance_m=distance_m,
        sprint_time_s=sprint_time_s,
        crossing_frame=crossing_frame,
        fps_used=fps_used,
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric

def get_best_vertical_per_session(db: Session) -> list:
    return (
        db.query(
            SessionModel.date,
            func.max(VerticalMetric.jump_height_cm).label("value")
        )
        .join(VerticalMetric, VerticalMetric.session_id == SessionModel.id)
        .group_by(SessionModel.date)
        .order_by(SessionModel.date)
        .all()
    )


def get_best_horizontal_per_session(db: Session) -> list:
    return (
        db.query(
            SessionModel.date,
            func.max(HorizontalMetric.jump_distance_cm).label("value")
        )
        .join(HorizontalMetric, HorizontalMetric.session_id == SessionModel.id)
        .group_by(SessionModel.date)
        .order_by(SessionModel.date)
        .all()
    )

def get_best_sprint_per_session(db: Session, distance_m: float) -> list:
    return (
        db.query(
            SessionModel.date,
            func.min(SprintMetric.sprint_time_s).label("value")
        )
        .join(SprintMetric, SprintMetric.session_id == SessionModel.id)
        .filter(SprintMetric.distance_m == distance_m)
        .group_by(SessionModel.date)
        .order_by(SessionModel.date)
        .all()
    )

def delete_vertical_metric(db: Session, metric_id: int) -> bool:
    metric = db.query(VerticalMetric).filter(VerticalMetric.id == metric_id).first()
    if metric is None:
        return False
    db.delete(metric)
    db.commit()
    return True


def delete_horizontal_metric(db: Session, metric_id: int) -> bool:
    metric = db.query(HorizontalMetric).filter(HorizontalMetric.id == metric_id).first()
    if metric is None:
        return False
    db.delete(metric)
    db.commit()
    return True

def delete_sprint_metric(db: Session, metric_id: int) -> bool:
    metric = db.query(SprintMetric).filter(SprintMetric.id == metric_id).first()
    if metric is None:
        return False
    db.delete(metric)
    db.commit()
    return True

def get_all_metrics(db: Session) -> list:
    metrics = []

    vertical_rows = (
        db.query(VerticalMetric, SessionModel.date, SessionModel.notes)
        .join(SessionModel, VerticalMetric.session_id == SessionModel.id)
        .all()
    )
    for metric, session_date, notes in vertical_rows:
        metrics.append({
            "id":    metric.id,
            "type":  "vertical",
            "date":  session_date,
            "value": metric.jump_height_cm,
            "notes": notes,
        })

    horizontal_rows = (
        db.query(HorizontalMetric, SessionModel.date, SessionModel.notes)
        .join(SessionModel, HorizontalMetric.session_id == SessionModel.id)
        .all()
    )
    for metric, session_date, notes in horizontal_rows:
        metrics.append({
            "id":    metric.id,
            "type":  "horizontal",
            "date":  session_date,
            "value": metric.jump_distance_cm,
            "notes": notes,
        })

    sprint_rows = (
        db.query(SprintMetric, SessionModel.date, SessionModel.notes)
        .join(SessionModel, SprintMetric.session_id == SessionModel.id)
        .all()
    )
    for metric, session_date, notes in sprint_rows:
        metrics.append({
            "id":          metric.id,
            "type":        "sprint",
            "date":        session_date,
            "value":       metric.sprint_time_s,
            "distance_m":  metric.distance_m,
            "notes":       notes,
        })

    metrics.sort(key=lambda m: m["date"], reverse=True)
    return metrics
