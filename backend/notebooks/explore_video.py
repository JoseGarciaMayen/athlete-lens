import cv2
from ultralytics import YOLO
import matplotlib.pyplot as plt
import numpy as np

VIDEO_PATH = "tests/core/vertical/fixtures/video.mp4"

model = YOLO("yolov8n-pose.pt")

# Open video
cap = cv2.VideoCapture(VIDEO_PATH)

fps = cap.get(cv2.CAP_PROP_FPS)
frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
duration = frame_count / fps

print(f"FPS: {fps}")
print(f"Total frames: {frame_count}")
print(f"Resolution: {width}x{height}")
print(f"Duration: {duration:.2f} seconds")

# Process first frame with detected person
cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
ret, frame = cap.read()

if ret:
    results = model(frame, verbose=False)
    if results[0].keypoints is not None and len(results[0].keypoints.xy) > 0:
        keypoints = results[0].keypoints.xy[0]
        left_ankle = keypoints[15]
        right_ankle = keypoints[16]
        print(f"\nKeypoints detected in first frame")
        print(f"Left ankle:  x={left_ankle[0]:.1f}, y={left_ankle[1]:.1f}")
        print(f"Right ankle: x={right_ankle[0]:.1f}, y={right_ankle[1]:.1f}")
    else:
        print("No person detected in first frame")

cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

left_ankle_y = []
right_ankle_y = []
frames = []
frame_number = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame, verbose=False)

    if results[0].keypoints is not None and len(results[0].keypoints.xy) > 0:
        keypoints = results[0].keypoints.xy[0]
        left_ankle_y.append(float(keypoints[15][1]))
        right_ankle_y.append(float(keypoints[16][1]))
        frames.append(frame_number)

    frame_number += 1

cap.release()

plt.figure(figsize=(12, 4))
plt.plot(frames, left_ankle_y, label="Left ankle")
plt.plot(frames, right_ankle_y, label="Right ankle")
plt.title("Ankle Y position over time")
plt.xlabel("Frame")
plt.ylabel("Y position (pixels)")
plt.legend()
plt.gca().invert_yaxis()
plt.savefig("notebooks/ankle_tracking.png", dpi=150, bbox_inches="tight")
print("Plot saved to notebooks/ankle_tracking.png")
