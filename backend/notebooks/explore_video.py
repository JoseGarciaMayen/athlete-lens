import cv2
from ultralytics import YOLO
import matplotlib.pyplot as plt

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
        print("\nKeypoints detected in first frame")
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

# Visualize YOLO ankle position overlay

import sys
sys.path.append("..")
from core.vertical.extractor import detect_takeoff_and_landing

ankle_y = [(l + r) / 2 for l, r in zip(left_ankle_y, right_ankle_y)] # mean of the positions of right and left ankles

result = detect_takeoff_and_landing(ankle_y, fps)
print(result)

cap = cv2.VideoCapture(VIDEO_PATH)
fps = cap.get(cv2.CAP_PROP_FPS)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

fourcc = cv2.VideoWriter_fourcc(*"mp4v")
out = cv2.VideoWriter("notebooks/ankle_overlay.mp4", fourcc, fps, (width, height))

rest_position = int(result["rest_position"])
threshold = int(result["threshold"])

frame_idx = 0
while True:
    ret, frame = cap.read()
    if not ret:
        break

    # rest position line
    cv2.line(frame, (0, rest_position), (width, rest_position), (0, 255, 0), 2)
    cv2.putText(frame, "rest", (10, rest_position - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

    # threshold line
    cv2.line(frame, (0, threshold), (width, threshold), (255, 0, 0), 2)
    cv2.putText(frame, "threshold", (10, threshold - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)

    if frame_idx < len(ankle_y):
        y = int(ankle_y[frame_idx])
        x = 400
        cv2.circle(frame, (x, y), 8, (0, 0, 255), -1)

    out.write(frame)
    frame_idx += 1

cap.release()
out.release()

