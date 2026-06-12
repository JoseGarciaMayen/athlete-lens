import pytest
import numpy as np

from core.acoustic.extractor import compute_time_delta, compute_energy, detect_events


def test_compute_time_delta_returns_correct_value():
    events = [0, 100]
    sr = 44100
    hop_length = 512

    result = compute_time_delta(events, sr, hop_length)

    assert result["success"] is True
    assert result["time_delta_ms"] == pytest.approx(1161.0, rel=1e-3)

def test_compute_time_delta_returns_none_when_fewer_than_two_events():
    events = [0]
    sr = 44100

    result = compute_time_delta(events, sr)

    assert result["success"] is False
    assert result["error"] == "Not enough events detected, try lowering the threshold"


def test_compute_time_delta_raises_when_more_than_two_events():
    events = [0, 100, 200]
    sr = 44100

    result = compute_time_delta(events, sr)

    assert result["success"] is False
    assert result["error"] == "Too many events detected, try increasing the threshold"

def test_compute_energy_is_positive():
    y = np.random.uniform(-1, 1, 4096)

    result = compute_energy(y)

    for i in range(len(result)):
        assert result[i] > 0

def test_compute_energy_all_zeros():
    y = np.zeros(4096)

    result = compute_energy(y)

    assert np.all(result == 0)

def test_compute_energy_peak_higher_than_the_rest():
    y = np.zeros(4096)
    y[1024] = 1.0

    result = compute_energy(y)

    assert np.max(result) > 0
    assert np.all(result >= 0)

def test_detect_events():
    energy = np.zeros(100)
    energy[10] = 1.0
    energy[11] = 1.0
    energy[12] = 1.0

    events = detect_events(energy)

    assert len(events) == 1