import pytest
from fastapi.testclient import TestClient
from api.main import app

from db.models import Base
from db.database import get_db
from db.crud import create_athlete
from db.models import AcousticMetric


@pytest.mark.integration
def test_analyze_acoustic_returns_success(client, db_session):
    create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)

    with open("tests/core/acoustic/fixtures/video.wav", "rb") as f:
        response = client.post(
            "/api/analyze/acoustic",
            data={"session_date": "2026-06-09"},
            files={"file": ("audio.wav", f, "audio/wav")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["time_delta_ms"] > 0
    assert data["events_detected"] == 2
    assert len(data["timestamps_ms"]) == 2


def test_analyze_acoustic_returns_422_on_empty_file(client, db_session):
    response = client.post(
        "/api/analyze/acoustic",
        data={"session_date": "2026-06-09"},
        files={"file": ("empty.wav", b"", "audio/wav")}
    )

    assert response.status_code == 422

@pytest.mark.integration
def test_analyze_acoustic_persists_to_database(client, db_session):
    athlete = create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)

    with open("tests/core/acoustic/fixtures/video.wav", "rb") as f:
        response = client.post(
            "/api/analyze/acoustic",
            data={"session_date": "2026-06-09", "distance_m": "30"},
            files={"file": ("audio.wav", f, "audio/wav")}
        )

    assert response.status_code == 200
    assert response.json()["success"] is True

    metrics = db_session.query(AcousticMetric).all()
    assert len(metrics) == 1
    assert metrics[0].time_delta_ms > 0
    assert metrics[0].distance_m == 30