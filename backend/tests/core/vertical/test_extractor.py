import pytest

from core.vertical.extractor import compute_jump_height, load_video, detect_takeoff_and_landing, analyze
from ultralytics import YOLO

def test_compute_jump_height_returns_correct_value():
    takeoff_frame = 100
    landing_frame = 140
    fps = 60

    result = compute_jump_height(takeoff_frame, landing_frame, fps)

    assert result["success"] is True
    assert result["flight_time_ms"] == pytest.approx(666.6667, rel=1e-4)
    assert result["jump_height_cm"] == pytest.approx(54.481, rel=1e-4)

def test_compute_jump_landing_before_takeoff():
    takeoff_frame = 140
    landing_frame = 100
    fps = 60

    result = compute_jump_height(takeoff_frame, landing_frame, fps)

    assert result["success"] is False
    assert "error" in result

@pytest.mark.integration
def test_load_video_returns_cap_and_fps():
    video_path = "tests/core/vertical/fixtures/video.mp4"

    result = load_video(video_path)

    assert result["success"] is True
    assert result["fps"] == 60.0
    assert result["cap"].isOpened()

    result["cap"].release()

def test_load_video_invalid_path():
    video_path = "invalid_route/video.mp4"

    result = load_video(video_path)

    assert result["success"] is False
    assert "error" in result

def test_detect_takeoff_and_landing_synthetic():
    ankle_y = (
        [100] * 15
        + [90, 80, 70, 60, 50, 40, 30, 20, 10, 0]
        + [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    ) # synthetic array

    result = detect_takeoff_and_landing(ankle_y, fps=60)

    assert result["success"] is True
    assert result["takeoff_frame"] == 18
    assert result["landing_frame"] == 32
    assert result["rest_position"] == 100
    assert result["threshold"] == 70

def test_detect_takeoff_and_landing_too_short():
    ankle_y = [100] * 10

    result = detect_takeoff_and_landing(ankle_y, fps=60)

    assert result["success"] is False
    assert result["error"] == "Not enough frames to analyze"

def test_detect_takeoff_and_landing_no_movement():
    ankle_y = [100] * 35

    result = detect_takeoff_and_landing(ankle_y, fps=60)

    assert result["success"] is False
    assert result["error"] == "No upward movement detected"

@pytest.mark.integration
def test_analyze_full_pipeline():
    model = YOLO("yolov8n-pose.pt")
    video_path = "tests/core/vertical/fixtures/video.mp4"

    result = analyze(video_path, model)

    assert result["success"] is True
    assert result["takeoff_frame"] == 103
    assert result["landing_frame"] == 132
    assert result["jump_height_cm"] == pytest.approx(28.6, abs=0.5)
    assert result["fps_used"] == 60.0
