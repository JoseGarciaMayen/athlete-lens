import librosa
import librosa.display
import matplotlib.pyplot as plt
import numpy as np

AUDIO_PATH = "../tests/core/acoustic/fixtures/video.wav"

y, sr = librosa.load(AUDIO_PATH, sr=None)
# y: array of amplitude values (the waveform)
# sr: sample rate (snapshots per second) sr=None keeps original quality

print(f"Duration: {librosa.get_duration(y=y, sr=sr):.2f} segundos")
print(f"Sample rate: {sr} Hz")
print(f"Total samples: {len(y)}")
print(f"Maximum amplitude value: {np.max(np.abs(y)):.4f}")

# Visualize the waveform
plt.figure(figsize=(12, 4))
librosa.display.waveshow(y, sr=sr)
plt.title("Waveform")
plt.xlabel("Time (s)")
plt.ylabel("Amplitude")
plt.savefig("waveform.png", dpi=150, bbox_inches="tight")
print("Plot saved to waveform.png")

# Sliding window parameters
frame_length = 2048
hop_length = 512

num_frames = (len(y) - frame_length) // hop_length
energy = np.zeros(num_frames)

# Squaring the amplitude (abs**2) forces all values to be positive
# and amplifies the signal peaks against the background noise.
for i in range(num_frames):
    start = i * hop_length
    frame = y[start : start + frame_length]
    energy[i] = np.sum(np.abs(frame) ** 2)

# Generate time axis for the energy array
times = librosa.frames_to_time(
    np.arange(num_frames),
    sr = sr,
    hop_length = hop_length
)

# Plot energy
plt.figure(figsize=(12, 4))
plt.plot(times, energy)
plt.title("Short-time energy")
plt.xlabel("Time (s)")
plt.ylabel("Energy")
plt.savefig("energy.png", dpi=150, bbox_inches="tight")
print("Energy plot saved to energy.png")