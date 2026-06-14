import pytest
from db.crud import create_athlete
from db.models import VerticalMetric


@pytest.mark.integration
def test_analyze_vertical_returns_success(client, db_session):
    create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)

    with open("tests/core/vertical/fixtures/video.mp4", "rb") as f:
        response = client.post(
            "/api/analyze/vertical",
            data={"session_date": "2026-06-09"},
            files={"file": ("video.mp4", f, "video/mp4")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["jump_height_cm"] > 0
    assert data["takeoff_frame"] == 103
    assert data["landing_frame"] == 132


def test_analyze_vertical_returns_422_on_empty_file(client, db_session):
    create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)

    response = client.post(
        "/api/analyze/vertical",
        data={"session_date": "2026-06-09"},
        files={"file": ("empty.mp4", b"", "video/mp4")}
    )

    assert response.status_code == 422


@pytest.mark.integration
def test_analyze_vertical_persists_to_database(client, db_session):
    create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)

    with open("tests/core/vertical/fixtures/video.mp4", "rb") as f:
        response = client.post(
            "/api/analyze/vertical",
            data={"session_date": "2026-06-09"},
            files={"file": ("video.mp4", f, "video/mp4")}
        )

    assert response.status_code == 200
    assert response.json()["success"] is True

    metrics = db_session.query(VerticalMetric).all()
    assert len(metrics) == 1
    assert metrics[0].takeoff_frame == 103
    assert metrics[0].landing_frame == 132


@pytest.mark.integration
def test_analyze_vertical_invalid_date(client, db_session):
    create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)

    with open("tests/core/vertical/fixtures/video.mp4", "rb") as f:
        response = client.post(
            "/api/analyze/vertical",
            data={"session_date": "not-a-date"},
            files={"file": ("video.mp4", f, "video/mp4")}
        )

    assert response.status_code == 422


@pytest.mark.integration
def test_analyze_vertical_no_athlete(client, db_session):
    with open("tests/core/vertical/fixtures/video.mp4", "rb") as f:
        response = client.post(
            "/api/analyze/vertical",
            data={"session_date": "2026-06-09"},
            files={"file": ("video.mp4", f, "video/mp4")}
        )

    assert response.status_code == 400
