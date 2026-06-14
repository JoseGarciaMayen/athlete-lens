import pytest
from db.crud import create_athlete, get_or_create_session
from datetime import date


def test_analyze_sprint_no_file_no_manual(client):
    response = client.post("/api/analyze/sprint", data={
        "session_date": "2026-06-09",
        "distance_m": "60",
    })

    assert response.status_code == 422


def test_analyze_sprint_manual_entry(client, db_session):
    create_athlete(db_session, name="Test Athlete")

    response = client.post("/api/analyze/sprint", data={
        "session_date": "2026-06-09",
        "distance_m":   "60",
        "sprint_time_s": "7.42",
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["sprint_time_s"] == pytest.approx(7.42)
    assert data["crossing_frame"] is None
    assert data["fps_used"] is None


def test_analyze_sprint_manual_entry_30m(client, db_session):
    create_athlete(db_session, name="Test Athlete")

    response = client.post("/api/analyze/sprint", data={
        "session_date":  "2026-06-09",
        "distance_m":    "30",
        "sprint_time_s": "4.10",
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["sprint_time_s"] == pytest.approx(4.10)


def test_analyze_sprint_no_athlete(client):
    response = client.post("/api/analyze/sprint", data={
        "session_date":  "2026-06-09",
        "distance_m":    "60",
        "sprint_time_s": "7.42",
    })

    assert response.status_code == 400


def test_analyze_sprint_invalid_date(client, db_session):
    create_athlete(db_session, name="Test Athlete")

    response = client.post("/api/analyze/sprint", data={
        "session_date":  "not-a-date",
        "distance_m":    "60",
        "sprint_time_s": "7.42",
    })

    assert response.status_code == 422