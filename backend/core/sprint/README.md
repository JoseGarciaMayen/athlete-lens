# Sprint module: Technical decisions

This document records the key design choices made during development of the sprint timing module, and the reasoning behind each one.

---

## Overview

The sprint module measures the time an athlete takes to cover a fixed distance (e.g. 30 m or 60 m). The phone is placed at the finish line. A built-in countdown gives the athlete time to reach the start position. Three audible beeps signal the start; video recording begins on the third beep (T = 0). The athlete sprints toward the phone, and YOLOv8 detects the exact frame when the athlete crosses the finish line. Sprint time is `crossing_frame / fps`.

**Pipeline**: countdown → beeps → MediaRecorder starts → athlete runs → stop recording → upload → detect crossing frame → compute time.

---

## Why the acoustic module was replaced

The original sprint module used two-clap audio detection: one clap at the start (athlete far from phone), one at the finish (athlete near phone). The time delta between claps was the sprint time.

This approach failed for a fundamental reason: **asymmetric clap energy**. The start clap is produced ~60 m from the microphone and competes with ambient noise (footsteps, wind, breathing) that occurs close to the microphone. No single threshold heuristic (relative thresholds, per-half energy maximums, background-energy factors) was reliable across recordings. The signal-to-noise problem is not solvable with heuristics on the audio signal alone.

**Decision:** eliminate audio start detection entirely. The start event is handled by the frontend (countdown + beeps); the backend only needs to detect the finish event from video.

---

## T = 0: the third beep, not frame 0 of the recording

The `MediaRecorder` starts exactly when the third beep begins. Frame 0 of the video therefore corresponds to T = 0 of the sprint. Sprint time is `crossing_frame / fps`. No offset needed.

**Implementation detail:** `playCountdownBeeps` (frontend) schedules three beeps via the Web Audio API. `MediaRecorder.start()` is called after a `setTimeout` of `BEEP_GAP * 2 * 1000` ms (1000 ms), which corresponds exactly to when the third beep begins.

---

## Finish line detection: hip center crossing X = width / 2

The phone is placed at the finish line pointing perpendicular to the sprint direction. "Crossing the finish line" is defined as the athlete's hip center (average of keypoints 11 and 12) crossing the horizontal midpoint of the frame (`X = width / 2`).

**Why hip keypoints instead of bounding box center:**
Hip keypoints represent the athlete's center of mass more accurately than the bounding box center, which is affected by arm swing and stride asymmetry. Both methods produced the same crossing frame on the test video, but hip keypoints are semantically more correct.

**Fallback:** if hip keypoints are missing or invalid (both coordinates = 0), the function falls back to the bounding box center. This handles partial occlusions at frame entry.

---

## Direction auto-detection

The module infers the athlete's direction of travel from the first frame in which a detection is made. If `hip_cx ≤ width / 2` on that frame, the athlete is moving left-to-right; otherwise right-to-left. The crossing condition is evaluated against the inferred direction.

This means the phone can be placed facing either direction without any manual configuration, and recordings where the athlete is briefly visible at the wrong edge before entering the frame are handled correctly.

---

## Early exit

`detect_finish_crossing` iterates frames sequentially and returns as soon as the first crossing is detected. It does not process the rest of the video. This is valid because:

1. The athlete always crosses the midpoint (by protocol; the recording is stopped after crossing).
2. The crossing is the only event of interest; there is no need for a full trajectory.
3. For a ~10 s sprint video at 60 fps, early exit saves processing ~580 frames after the crossing.

---

## The crossing is monotonic: no smoothing needed

The exploration notebook confirmed that `hip_cx` increases monotonically from ~2 px to ~644 px across 39 frames without any jitter or backward movement. The simple threshold `hip_cx > width / 2` is therefore sufficient. No rolling average or sustain_frames requirement needed (unlike the vertical module, which needed `sustain_frames=2` to filter noise spikes).

This is expected: a sprinting athlete moves consistently in one direction.

---

## FPS: metadata or override

`MediaRecorder` (the browser recording API) does not embed a valid FPS value in the WebM container; metadata often reads as `1000` or `0`. The endpoint accepts an optional `fps` form field; when provided, it overrides the metadata value. The frontend reads `videoTrack.getSettings().frameRate` and sends it as `fps`.

If `fps_override` is not provided and metadata FPS is outside the range `(0, 240]`, the endpoint returns an error rather than computing silently wrong results.

---

## Inference device

At startup, `main.py` checks `torch.cuda.is_available()` and stores the result in `app.state.device`. The device string is passed to `detect_finish_crossing` and used in every `model()` call.

---

## Distance stored per metric, not per session

`SprintMetric.distance_m` is a column on the metric row, not on the session. This allows multiple sprint distances in the same session (e.g. a 30 m and a 60 m effort on the same day). The dashboard query filters by `distance_m` to produce separate series for each distance. Distance is declared by the user at upload time; it is not measured from the video.

---

## Reaction time is included

The athlete starts on the third beep. The time between the beep and the athlete's first movement (reaction time, typically 120–200 ms) is included in `sprint_time_s`. This is consistent with how sprint times are measured in field conditions (reaction to a gun or whistle).

For comparison between sessions to be valid, the protocol must be consistent: same distance, same starting position relative to the phone, same beep-to-start behavior.

---

## Manual entry

The endpoint accepts `sprint_time_s` directly (no video) for cases where the athlete measures time manually. In this case `crossing_frame` and `fps_used` are `NULL` in the database. Manual and video-derived times compete equally in the dashboard's `MIN(sprint_time_s)` aggregation.

---

## Error contract: `{success, error}` throughout the module

Identical to the vertical module. All functions in `extractor.py` return dicts. See [vertical README](../vertical/README.md) for the rationale.

---

## Model injected as parameter

`analyze(video_path, model, device, fps_override)` receives the YOLOv8 model and device string as parameters. The model is loaded once at startup via the FastAPI `lifespan` handler and stored in `app.state.model`.

---

## Video format: WebM from MediaRecorder

The frontend uses the browser's `MediaRecorder` API, which produces WebM video. OpenCV reads WebM natively on most platforms. No server-side transcoding is needed.

**Known risk:** some older Android browsers may produce MP4 instead of WebM. If `cv2.VideoCapture` fails to open the file, the endpoint returns `{"success": False, "error": "... failed opening"}`.

**Input modes:** the upload component supports three modes: Record (countdown + camera, recommended), Upload video (file from device, for iOS compatibility or pre-recorded videos), and Manual (direct time entry, no video required).
