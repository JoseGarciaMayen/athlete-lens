import pytest
from ultralytics import YOLO
from core.sprint.extractor import load_video, analyze


def test_load_video_invalid_path():
    result = load_video("invalid_route/video.mp4")

    assert result["success"] is False
    assert "error" in result


@pytest.mark.integration
def test_load_video_returns_cap_and_metadata():
    result = load_video("tests/core/sprint/fixtures/sprint.mp4")

    assert result["success"] is True
    assert result["fps"] == 60.0
    assert result["width"] == 1080
    assert result["cap"].isOpened()

    result["cap"].release()


@pytest.mark.integration
def test_analyze_full_pipeline():
    model = YOLO("yolov8n-pose.pt")
    video_path = "tests/core/sprint/fixtures/sprint.mp4"

    result = analyze(video_path, model)

    assert result["success"] is True
    assert result["crossing_frame"] == 1189
    assert result["fps_used"] == 60.0
    assert result["sprint_time_s"] == pytest.approx(19.817, abs=0.01)
