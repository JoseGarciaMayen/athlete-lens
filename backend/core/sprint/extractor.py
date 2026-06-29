import cv2
import ultralytics


def load_video(video_path: str) -> dict:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"success": False, "error": f"{video_path} failed opening"}

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    return {"success": True, "cap": cap, "width": width}


def detect_finish_crossing(cap: cv2.VideoCapture, width: int, model: ultralytics.YOLO, device: str = "cpu") -> dict:
    """
    Iterate frames until the athlete's hip center crosses the horizontal midpoint (width / 2).

    Direction is inferred from the first frame where the athlete is detected:
    if hip_cx <= midpoint_x the athlete moves left-to-right, otherwise right-to-left.

    Uses hip keypoints 11 (left hip) and 12 (right hip) when both are visible.
    Falls back to bounding box center when hip keypoints are missing.
    Stops as soon as the crossing is detected (early exit).
    """
    midpoint_x = width / 2
    direction = None  # "ltr" | "rtl"

    frame_idx = 0
    all_timestamps_ms = []
    prev_hip_cx = None
    prev_ts = None

    while True:
        ts = cap.get(cv2.CAP_PROP_POS_MSEC)
        ret, frame = cap.read()
        if not ret:
            break

        all_timestamps_ms.append(ts)
        results = model(frame, verbose=False, device=device)

        has_detection = results[0].boxes is not None and len(results[0].boxes) > 0

        if has_detection:
            confs = results[0].boxes.conf.tolist()
            best_idx = confs.index(max(confs))

            hip_cx = None
            if results[0].keypoints is not None and len(results[0].keypoints.xy) > best_idx:
                kps = results[0].keypoints.xy[best_idx]
                left_hip = kps[11].tolist()
                right_hip = kps[12].tolist()

                left_valid = left_hip[0] > 0 and left_hip[1] > 0
                right_valid = right_hip[0] > 0 and right_hip[1] > 0

                if left_valid and right_valid:
                    hip_cx = (left_hip[0] + right_hip[0]) / 2

            if hip_cx is None:
                box = results[0].boxes.xyxy[best_idx].tolist()
                x1, _, x2, _ = box
                hip_cx = (x1 + x2) / 2

            if direction is None:
                direction = "ltr" if hip_cx <= midpoint_x else "rtl"

            crossed = (direction == "ltr" and hip_cx > midpoint_x) or (direction == "rtl" and hip_cx < midpoint_x)

            if crossed:
                if prev_hip_cx is not None and hip_cx != prev_hip_cx:
                    alpha = (midpoint_x - prev_hip_cx) / (hip_cx - prev_hip_cx)
                    alpha = max(0.0, min(1.0, alpha))
                    crossing_timestamp_ms = prev_ts + alpha * (ts - prev_ts)
                else:
                    crossing_timestamp_ms = ts
                return {
                    "success": True,
                    "crossing_frame": frame_idx,
                    "crossing_timestamp_ms": crossing_timestamp_ms,
                    "all_timestamps_ms": all_timestamps_ms,
                }

            prev_hip_cx = hip_cx
            prev_ts = ts

        frame_idx += 1

    return {"success": False, "error": "Athlete never crossed the frame midpoint"}


def compute_fps_from_timestamps(timestamps_ms: list[float]) -> float | None:
    if len(timestamps_ms) < 2:
        return None
    duration_s = (timestamps_ms[-1] - timestamps_ms[0]) / 1000.0
    if duration_s <= 0:
        return None
    return (len(timestamps_ms) - 1) / duration_s


def analyze(video_path: str, model: ultralytics.YOLO, device: str = "cpu", fps_override: float | None = None) -> dict:
    video_result = load_video(video_path)

    if not video_result["success"]:
        return {"success": False, "error": video_result["error"]}

    cap = video_result["cap"]
    width = video_result["width"]

    crossing_result = detect_finish_crossing(cap, width, model, device)
    cap.release()

    if not crossing_result["success"]:
        return {"success": False, "error": crossing_result["error"]}

    all_timestamps_ms = crossing_result["all_timestamps_ms"]
    fps = compute_fps_from_timestamps(all_timestamps_ms)
    if fps is None or fps <= 0 or fps > 240:
        fps = fps_override
    if fps is None or fps <= 0 or fps > 240:
        return {"success": False, "error": "Could not determine video FPS"}

    sprint_time_s = round(crossing_result["crossing_timestamp_ms"] / 1000.0, 3)

    return {
        "success": True,
        "crossing_frame": crossing_result["crossing_frame"],
        "fps_used": fps,
        "sprint_time_s": sprint_time_s,
    }
