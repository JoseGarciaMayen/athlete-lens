import pytest
from core.acoustic.extractor import compute_time_delta


def test_compute_time_delta_returns_correct_value():
    events = [0, 100]
    sr = 44100
    hop_length = 512

    result = compute_time_delta(events, sr, hop_length)

def test_compute_time_delta_returns_none_when_fewer_than_two_events():
    events = [0]
    sr = 44100

    result = compute_time_delta(events, sr)

    assert result is None


def test_compute_time_delta_raises_when_more_than_two_events():
    events = [0, 100, 200]
    sr = 44100

    with pytest.raises(ValueError):
        compute_time_delta(events, sr)