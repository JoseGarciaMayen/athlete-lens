import pytest
from db.crud import create_athlete
from db.models import HorizontalMetric


def test_analyze_horizontal_persists_to_database(client, db_session):
    create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)

    response = client.post(
        "/api/analyze/horizontal",
        data={"session_date": "2026-06-09", "jump_distance_cm": "264.5"}
    )

    assert response.status_code == 200
    assert response.json()["success"] is True

    metrics = db_session.query(HorizontalMetric).all()
    assert len(metrics) == 1
    assert metrics[0].jump_distance_cm == pytest.approx(264.5)


def test_analyze_horizontal_invalid_date(client, db_session):
    create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)

    response = client.post(
        "/api/analyze/horizontal",
        data={"session_date": "not-a-date", "jump_distance_cm": "264.5"}
    )

    assert response.status_code == 422


def test_analyze_horizontal_no_athlete(client, db_session):
    response = client.post(
        "/api/analyze/horizontal",
        data={"session_date": "2026-06-09", "jump_distance_cm": "264.5"}
    )

    assert response.status_code == 400