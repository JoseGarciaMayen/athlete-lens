from db.crud import create_athlete, create_session
from datetime import date


def test_get_athlete_profile_returns_athlete(client, db_session):
    create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)

    response = client.get("/api/athlete")

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test"
    assert data["weight_kg"] == 80
    assert data["height_cm"] == 180


def test_get_athlete_profile_404_when_no_athlete(client, db_session):
    response = client.get("/api/athlete")

    assert response.status_code == 404


def test_put_athlete_profile_updates_values(client, db_session):
    create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)

    response = client.put("/api/athlete", json={"name": "Updated", "weight_kg": 75, "height_cm": 178})

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated"
    assert data["weight_kg"] == 75
    assert data["height_cm"] == 178


def test_put_athlete_profile_404_when_no_athlete(client, db_session):
    response = client.put("/api/athlete", json={"name": "Updated", "weight_kg": 75, "height_cm": 178})

    assert response.status_code == 404


def test_post_session_creates_session(client, db_session):
    create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)

    response = client.post("/api/sessions", json={"date": "2026-06-09", "notes": "test session"})

    assert response.status_code == 200
    data = response.json()
    assert data["notes"] == "test session"


def test_post_session_404_when_no_athlete(client, db_session):
    response = client.post("/api/sessions", json={"date": "2026-06-09", "notes": "test session"})

    assert response.status_code == 404


def test_get_sessions_returns_list(client, db_session):
    athlete = create_athlete(db_session, name="Test", weight_kg=80, height_cm=180)
    create_session(db_session, athlete_id=athlete.id, date=date(2026, 6, 9), notes="s1")

    response = client.get("/api/sessions")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["notes"] == "s1"


def test_get_sessions_empty_list(client, db_session):
    response = client.get("/api/sessions")

    assert response.status_code == 200
    assert response.json() == []
