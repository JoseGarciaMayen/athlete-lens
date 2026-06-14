from pydantic import BaseModel, Field
from datetime import date


class AthleteUpdate(BaseModel):
    name: str | None = None
    weight_kg: float | None = Field(default=None, gt=0)
    height_cm: float | None = Field(default=None, gt=0)


class SessionCreate(BaseModel):
    date: date
    notes: str | None = None
