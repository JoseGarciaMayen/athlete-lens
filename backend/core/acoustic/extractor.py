import numpy as np
import librosa
import os

from core.acoustic.audio_extractor import extract_audio_from_video

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
            events.append(i)
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
        return {
            "success": False,
            "error": "Not enough events detected, try lowering the threshold",
        }
    if len(events) > 2:
        return {
            "success": False,
            "error": "Too many events detected, try increasing the threshold",
        }
    
    frame_delta = events[1] - events[0] # frames between event[0] and event[1]
    time_delta_seconds = (frame_delta * hop_length) / sr # seconds between event[0] and event[1]
    return {
        "success": True,
        "time_delta_ms": time_delta_seconds * 1000, # to milliseconds
    }

def analyze(file_path: str, threshold_ratio: float = 0.3, hop_length: int = 512) -> dict:
    """
    Orchestrates the full acoustic analysis pipeline.
    Loads audio, computes energy, detects events and calculates time delta.
    """
    AUDIO_EXTENSIONS = [".wav", ".mp3", ".m4a", ".flac", ".ogg"]

    extension = os.path.splitext(file_path)[1].lower()
    temp_audio_path = None

    if extension not in AUDIO_EXTENSIONS:
        temp_audio_path = extract_audio_from_video(file_path)
        audio_path = temp_audio_path
    else:
        audio_path = file_path

    try:
        y, sr = load_audio(audio_path)
    finally:
        if temp_audio_path is not None:
            os.remove(temp_audio_path)

    energy = compute_energy(y, hop_length=hop_length)
    events = detect_events(energy, threshold_ratio)
    delta_result = compute_time_delta(events, sr, hop_length=hop_length)

    if not delta_result["success"]:
        return {
            "success": False,
            "error": delta_result["error"],
            "events_detected": len(events)
        }

    timestamps_ms = []
    for event in events:
        timestamps_ms.append((event * hop_length / sr) * 1000)

    return {
        "success": True,
        "time_delta_ms": delta_result["time_delta_ms"],
        "events_detected": len(events),
        "timestamps_ms": timestamps_ms
    }