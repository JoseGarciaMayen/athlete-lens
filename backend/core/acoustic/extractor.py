import numpy as np
import librosa

def load_audio(file_path: str) -> tuple[np.ndarray, int]:
    """Load audio file and return signal and sample rate."""
    y, sr = librosa.load(file_path, sr=None)
    return y, sr

def compute_energy(y: np.ndarray, frame_length: int = 2048, hop_length: int = 512) -> np.ndarray:
    """
    Compute the short-time energy of an audio signal using a sliding window.
    
    Squaring the amplitude in each frame forces positive values and amplifies 
    peaks (like claps) against background noise.
    """
    num_frames = (len(y) - frame_length) // hop_length
    energy = np.zeros(num_frames)

    for i in range(num_frames):
        start = i * hop_length
        frame = y[start : start + frame_length]
        energy[i] = np.sum(np.abs(frame) ** 2)

    return energy

def detect_events(energy: np.ndarray, threshold_ratio: float = 0.3) -> list[int]:
    """
    Detect energy peaks above a relative threshold.
    Returns a list of frame indices where events occur.
    """
    threshold = np.max(energy) * threshold_ratio
    events = []
    above = False

    for i in range(len(energy)):
        if energy[i] > threshold and not above:
            events.append[i]
            above = True
        elif energy[i] <= threshold:
            above = False
    
    return events

def compute_time_delta(events: list[int], sr: int, hop_length: int = 512) -> float | None:
    """
    Compute the elapsed time in milliseconds between two acoustic events.
    Returns None if fewer than two events are detected.
    """
    if len(events) < 2:
        return None
    if len(events) > 2:
        raise ValueError("Too many events detected, try increasing the threshold")
    
    frame_delta = events[1] - events[0] # frames between event[0] and event[1]
    time_delta_seconds = (frame_delta * hop_length) / sr # seconds between event[0] and event[1]
    return time_delta_seconds * 1000 # to milliseconds