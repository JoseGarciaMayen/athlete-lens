# Vertical module: Technical decisions

This document records the key design choices made during development of the vertical jump analysis module, and the reasoning behind each one.

---

## Overview

The vertical module measures jump height (cm) and flight time (ms) from a video recording. The phone records the athlete performing a countermovement jump from the side. YOLOv8 Pose tracks ankle position frame by frame, takeoff and landing frames are detected from the resulting Y-trajectory, and jump height is derived from flight time using free-fall kinematics.

**Pipeline**: record/load video → track ankles → detect takeoff + landing → compute height.

---

## Pose estimation: YOLOv8 instead of MediaPipe

The original design used MediaPipe. MediaPipe 0.10.x dropped the legacy `mp.solutions` API entirely, and the last version that had it (`0.10.14`) has no wheels for Python 3.12+.

**Decision:** switch to `ultralytics` (YOLOv8n-pose, `yolov8n-pose.pt`). It supports modern Python, has equivalent keypoint quality for this use case, and is actively maintained.

**Practical difference:** YOLOv8 returns keypoints in absolute pixel coordinates, not normalized 0–1 values. Ankle keypoints are indices 15 (left) and 16 (right). This is irrelevant for the height calculation because jump height is derived from flight time, not pixel displacement.

---

## Inference device

At startup, `main.py` checks `torch.cuda.is_available()` and stores the result in `app.state.device`. The device string (`"cuda"` or `"cpu"`) is passed down to `track_ankles` and used in every `model()` call. CPU processes the test video (218 frames, 60 fps) in ~10 s, acceptable for a synchronous endpoint with personal-use frequency.

---

## Tracking: average of both ankles

`track_ankles` averages keypoints 15 (left ankle) and 16 (right ankle) into a single `ankle_y` series. For a symmetric vertical jump both ankles follow nearly identical trajectories, so averaging reduces per-keypoint noise without losing relevant information.

**Known limitation:** for jumps with significant asymmetry (rotation, unequal push-off), averaging could hide that information. Not a concern for the intended use case (straight vertical jump, self-recorded on a tripod).

---

## Frames without detection: forward-fill

If YOLO fails to detect a person in a frame (occasional missed detections), `track_ankles` repeats the last valid `ankle_y` value. This keeps the series continuous without gaps.

**Special case: frame 0 without detection.** there is no prior value to repeat, so the function returns `{"success": False, "error": "No person detected in the first frame"}`. Backward-fill was not implemented because under normal use the athlete is visible from the first frame.

---

## Person selection: first YOLO detection

`track_ankles` uses `keypoints.xy[0]`, the first person YOLO detects in each frame. If multiple people are visible the result is indeterminate. This is accepted because the intended setup is one person self-recording in an empty space.

---

## Takeoff and landing detection: relative threshold

`detect_takeoff_and_landing` computes:

- `rest_position`: median of the first `rest_frames` (default 15) ankle-Y values. Median instead of mean to be robust against occasional detection outliers.
- `peak_position`: global minimum of `ankle_y` (lowest Y value = highest point in image coordinates).
- `total_range = rest_position − peak_position`.
- `threshold = rest_position − margin_ratio × total_range`.

**Takeoff** is the first frame (after `rest_frames`) where `ankle_y` drops below the threshold and stays below for `sustain_frames` (default 2) consecutive frames, to filter single-frame noise spikes.

**Landing** is the symmetric crossing, searched forward from the peak frame.

### Calibration of `margin_ratio`

Starting value `0.1` (10% of total range) produced takeoff detection ~3 frames too early against frame-by-frame visual inspection of the test video. `margin_ratio = 0.3` matched the visual read closely. **This value was calibrated on a single 60 fps CMJ video** and is exposed as a parameter for future recalibration without code changes.

### Known limitation: the ankle is not the foot

During takeoff the heel rises while the toes remain on the ground; during landing the reverse happens. The ankle moves before the foot fully leaves the ground, and stops after the foot fully lands. This introduces a systematic bias in `flight_time_ms` and therefore in `jump_height_cm`. Calibrating `margin_ratio` to your own setup should fix it.

---

## Jump height formula: `h = g·t²/8`

For a symmetric vertical jump (equal ascent and descent, each `t/2`):

```
h = g · (t/2)² / 2  =  g · t² / 8
```

`GRAVITY_M_S2 = 9.80665` (standard gravity).

---

## FPS: not used for the height calculation

`MediaRecorder` produces WebM video with unreliable FPS metadata (often `1000`, `0`, or a nominal value that disagrees with the actual frame cadence). Real validation showed errors of up to 22% in jump height when FPS was wrong, because `h ∝ t²` amplifies FPS errors quadratically.

The module does not use FPS to compute flight time. Instead, `track_ankles` reads `cv2.CAP_PROP_POS_MSEC` before every `cap.read()` to collect the real timestamp of each frame as stored in the WebM container:

```python
ts = cap.get(cv2.CAP_PROP_POS_MSEC)
ret, frame = cap.read()
timestamps_ms.append(ts)
```

Flight time is then computed using sub-frame interpolation (see below), not raw frame timestamps.

No FPS value is involved in the height calculation at any point. A local FPS is computed from the timestamps between takeoff and landing and reported in the response for informational purposes only.

The endpoint still accepts an optional `fps` form field as a last-resort fallback if timestamp extraction fails entirely (e.g. malformed container with all-zero timestamps).

---

## Sub-frame interpolation at takeoff and landing

At 30 fps each frame interval is ~33 ms. Using raw frame indices for takeoff and landing quantizes the flight time to the nearest frame, which introduces up to ±33 ms error. Since `h ∝ t²`, a ±33 ms error on a 500 ms flight time produces ~13% height error.

`interpolate_threshold_crossing` finds the exact moment the ankle-Y trajectory crosses the detection threshold between two consecutive frames using linear interpolation:

```python
alpha = (threshold - y[frame-1]) / (y[frame] - y[frame-1])
t_crossing = timestamps_ms[frame-1] + alpha * (timestamps_ms[frame] - timestamps_ms[frame-1])
```

The resulting `t_takeoff` and `t_landing` are sub-frame timestamps, and flight time is:

```python
flight_time_ms = t_landing - t_takeoff
```

This reduces timing error to approximately ±2-5 ms regardless of the recording frame rate.

**Input modes:** the upload component supports three modes: Record (countdown + camera, recommended), Upload video (file from device, for iOS compatibility or pre-recorded videos), and Manual (direct height entry, no video required).

---

## Error contract: `{success, error}` throughout the module

All functions in `extractor.py` return dicts with `success: bool` and, on failure, `error: str`. Python exceptions would be more idiomatic, but the module was fully implemented and tested with the dict pattern before the question arose. All subsequent modules follow the same contract for consistency.

---

## Model injected as parameter

`analyze(video_path, model, device, fps_override)` receives the YOLOv8 model and device string as parameters. The model is loaded once at startup via the FastAPI `lifespan` handler and stored in `app.state.model`. This avoids the ~1–2 s model-load cost on every request.

---

## `ankle_y` series not included in the response

`track_ankles` computes the full ankle trajectory but `analyze` does not include it in the return dict. Adding it is one line when needed (e.g. for overlaying the trajectory on the video). It is omitted now to avoid sending 200+ floats per request with no consumer.
