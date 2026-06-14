"""
explore_sprint_video.py
=======================
Exploration notebook for the sprint module.
Validates YOLOv8 hip crossing detection on a finish-line video.

Usage:
    python notebooks/explore_sprint_video.py
    python notebooks/explore_sprint_video.py path/to/your/video.mp4
"""

import sys
import cv2
import os
from ultralytics import YOLO

VIDEO_PATH          = sys.argv[1] if len(sys.argv) > 1 else "tests/core/sprint/fixtures/sprint.mp4"
MODEL_PATH          = "yolov8n-pose.pt"
OUTPUT_DIR          = "notebooks/sprint_explore_output"
ANALYSE_LAST_N_FRAMES = 200

os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"Video: {VIDEO_PATH}")

model = YOLO(MODEL_PATH)

# ── Video metadata ─────────────────────────────────────────────────────────────
cap        = cv2.VideoCapture(VIDEO_PATH)
fps        = cap.get(cv2.CAP_PROP_FPS)
total      = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
width      = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height     = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
duration   = total / fps
midpoint_x = width / 2

print("=" * 60)
print(f"Resolution : {width}x{height}")
print(f"FPS        : {fps}")
print(f"Frames     : {total}")
print(f"Duration   : {duration:.2f}s")
print(f"Midpoint X : {midpoint_x}")
print("=" * 60)

# ── Phase 1: scan last N frames ────────────────────────────────────────────────
print(f"\n[Phase 1] Scanning last {ANALYSE_LAST_N_FRAMES} frames for detections...")

start_frame = total - ANALYSE_LAST_N_FRAMES
detections  = []

for f in range(start_frame, total):
    cap.set(cv2.CAP_PROP_POS_FRAMES, f)
    ret, frame = cap.read()
    if not ret:
        continue

    results = model(frame, verbose=False)

    for r in results:
        if r.boxes is None or len(r.boxes) == 0:
            continue

        confs    = r.boxes.conf.tolist()
        best_idx = confs.index(max(confs))
        box      = r.boxes.xyxy[best_idx].tolist()
        conf     = confs[best_idx]

        x1, y1, x2, y2 = box
        cx = (x1 + x2) / 2

        hip_cx = None
        if r.keypoints is not None and len(r.keypoints.xy) > best_idx:
            kps       = r.keypoints.xy[best_idx]
            left_hip  = kps[11].tolist()
            right_hip = kps[12].tolist()
            if left_hip[0] > 0 and right_hip[0] > 0:
                hip_cx = (left_hip[0] + right_hip[0]) / 2

        detections.append({
            "frame"   : f,
            "time_s"  : round(f / fps, 3),
            "cx"      : round(cx, 1),
            "hip_cx"  : round(hip_cx, 1) if hip_cx else None,
            "conf"    : round(conf, 3),
            "bbox_mid": cx > midpoint_x,
            "hip_mid" : (hip_cx > midpoint_x) if hip_cx else None,
        })

# ── Phase 2: print table ───────────────────────────────────────────────────────
print(f"\nTotal detections: {len(detections)}")
print(f"\n{'frame':>6} | {'time_s':>7} | {'bbox_cx':>7} | {'hip_cx':>7} | {'conf':>6} | bbox>mid | hip>mid")
print("-" * 70)

first_bbox_crossing = None
first_hip_crossing  = None

for d in detections:
    bbox_flag = "YES <<" if d["bbox_mid"] else "no"
    hip_flag  = ("YES <<" if d["hip_mid"] else "no") if d["hip_cx"] else "N/A"

    if d["bbox_mid"] and first_bbox_crossing is None:
        first_bbox_crossing = d
    if d["hip_mid"] and first_hip_crossing is None:
        first_hip_crossing = d

    hip_str = f"{d['hip_cx']:>7.1f}" if d["hip_cx"] else "    N/A"
    print(
        f"{d['frame']:>6} | {d['time_s']:>7.3f} | {d['cx']:>7.1f} | "
        f"{hip_str} | {d['conf']:>6.3f} | {bbox_flag:<8} | {hip_flag}"
    )

# ── Phase 3: summary ──────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)

if first_bbox_crossing:
    print(f"First bbox crossing : frame {first_bbox_crossing['frame']} → {first_bbox_crossing['time_s']}s")
else:
    print("First bbox crossing : NOT FOUND in analysed range")

if first_hip_crossing:
    print(f"First hip crossing  : frame {first_hip_crossing['frame']} → {first_hip_crossing['time_s']}s")
else:
    print("First hip crossing  : NOT FOUND (keypoints missing?)")

print(f"\nVideo duration: {duration:.3f}s")

# ── Phase 4: save annotated frames around crossing ────────────────────────────
print("\n[Phase 4] Saving annotated frames around crossing...")

save_target = first_hip_crossing or first_bbox_crossing
if save_target:
    frame_range = range(max(0, save_target["frame"] - 10), min(total, save_target["frame"] + 10))
    for f in frame_range:
        cap.set(cv2.CAP_PROP_POS_FRAMES, f)
        ret, frame = cap.read()
        if not ret:
            continue
        results   = model(frame, verbose=False)
        annotated = results[0].plot()
        cv2.line(annotated, (int(midpoint_x), 0), (int(midpoint_x), height), (0, 0, 255), 3)
        cv2.putText(
            annotated, f"frame {f} | mid={midpoint_x:.0f}px",
            (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3
        )
        cv2.imwrite(f"{OUTPUT_DIR}/frame_{f:04d}.jpg", annotated)
    print(f"Saved frames to {OUTPUT_DIR}/")
else:
    print("No crossing found — saving all detected frames instead.")
    for d in detections[:20]:
        f = d["frame"]
        cap.set(cv2.CAP_PROP_POS_FRAMES, f)
        ret, frame = cap.read()
        if not ret:
            continue
        results   = model(frame, verbose=False)
        annotated = results[0].plot()
        cv2.line(annotated, (int(midpoint_x), 0), (int(midpoint_x), height), (0, 0, 255), 3)
        cv2.imwrite(f"{OUTPUT_DIR}/frame_{f:04d}.jpg", annotated)

cap.release()
print("\nDone.")