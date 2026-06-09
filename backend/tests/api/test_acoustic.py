import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_analyze_acoustic_returns_success():
    with open("tests/core/acoustic/fixtures/video.wav", "rb") as f:
        response = client.post(
            "/api/analyze/acoustic",
            files={"file": ("audio.wav", f, "audio/wav")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["time_delta_ms"] > 0
    assert data["events_detected"] == 2
    assert len(data["timestamps_ms"]) == 2


def test_analyze_acoustic_returns_400_on_empty_file():
    response = client.post(
        "/api/analyze/acoustic",
        files={"file": ("empty.wav", b"", "audio/wav")}
    )

    assert response.status_code == 422