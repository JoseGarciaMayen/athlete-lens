from pydantic import BaseModel
from datetime import date

class AthleteUpdate(BaseModel):
    name: str | None = None
    weight_kg: float | None = None
    height_cm: float | None = None

class SessionCreate(BaseModel):
    date: date
    notes: str | None = None