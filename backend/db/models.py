from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Athlete(Base):
    __tablename__ = "athlete"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    sessions = relationship("Session", back_populates="athlete")


class Session(Base):
    __tablename__ = "session"

    id = Column(Integer, primary_key=True, autoincrement=True)
    athlete_id = Column(Integer, ForeignKey("athlete.id"), nullable=False)
    date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    notes = Column(String, nullable=True)

    athlete = relationship("Athlete", back_populates="sessions")
    acoustic_metrics = relationship("AcousticMetric", back_populates="session")
    vertical_metrics = relationship("VerticalMetric", back_populates="session")


class AcousticMetric(Base):
    __tablename__ = "acoustic_metric"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("session.id"), nullable=False)
    time_delta_ms = Column(Float)
    events_detected = Column(Integer)
    raw_file_path = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("Session", back_populates="acoustic_metrics")


class VerticalMetric(Base):
    __tablename__ = "vertical_metric"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("session.id"), nullable=False)
    jump_height_cm = Column(Float)
    flight_time_ms = Column(Float)
    fps_used = Column(Integer)
    takeoff_frame = Column(Integer)
    landing_frame = Column(Integer)
    raw_file_path = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("Session", back_populates="vertical_metrics")