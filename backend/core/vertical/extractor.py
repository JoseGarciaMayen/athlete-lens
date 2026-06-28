import cv2
import numpy as np
import ultralytics

GRAVITY_M_S2 = 9.80665


def load_video(video_path: str) -> dict:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"success": False, "error": f"{video_path} failed opening"}
    return {"success": True, "cap": cap}


def track_ankles(cap: cv2.VideoCapture, model: ultralytics.YOLO, device: str = "cpu") -> dict:
    ankle_y = []
    timestamps_ms = []

    while True:
        ts = cap.get(cv2.CAP_PROP_POS_MSEC)
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, verbose=False, device=device)

        has_detection = results[0].keypoints is not None and len(results[0].keypoints.xy) > 0

        valid_ankles = False
        if has_detection:
            keypoints = results[0].keypoints.xy[0]
            left_ankle = keypoints[15]
            right_ankle = keypoints[16]

            left_valid = not (left_ankle[0] == 0 and left_ankle[1] == 0)
            right_valid = not (right_ankle[0] == 0 and right_ankle[1] == 0)
            valid_ankles = left_valid and right_valid

        if valid_ankles:
            ankle_y.append((float(left_ankle[1]) + float(right_ankle[1])) / 2)
            timestamps_ms.append(ts)
        elif len(ankle_y) > 0:
            ankle_y.append(ankle_y[-1])
            timestamps_ms.append(ts)
        else:
            return {"success": False, "error": "No person detected in the first frame"}

    return {"success": True, "ankle_y": ankle_y, "timestamps_ms": timestamps_ms}


def compute_fps_from_timestamps(timestamps_ms: list[float]) -> float | None:
    if len(timestamps_ms) < 2:
        return None
    duration_s = (timestamps_ms[-1] - timestamps_ms[0]) / 1000.0
    if duration_s <= 0:
        return None
    return (len(timestamps_ms) - 1) / duration_s


def detect_takeoff_and_landing(ankle_y, fps=None, rest_frames=15, sustain_frames=2):
    ankle_y = np.array(ankle_y)

    if len(ankle_y) < rest_frames + sustain_frames * 2:
        return {"success": False, "error": "Not enough frames to analyze"}

    rest_position = float(np.median(ankle_y[0:rest_frames]))
    peak_position = float(np.min(ankle_y))
    total_range = rest_position - peak_position

    if total_range <= 0:
        return {"success": False, "error": "No upward movement detected"}

    margin = 0.3 * total_range
    threshold = rest_position - margin

    takeoff_frame = None
    landing_frame = None

    for i in range(rest_frames, len(ankle_y) - sustain_frames):
        if np.all(ankle_y[i : i + sustain_frames] < threshold):
            takeoff_frame = i
            break

    if takeoff_frame is None:
        return {"success": False, "error": "Takeoff not detected"}

    peak_frame = int(np.argmin(ankle_y))

    for i in range(peak_frame, len(ankle_y) - sustain_frames):
        if np.all(ankle_y[i : i + sustain_frames] > threshold):
            landing_frame = i
            break

    if landing_frame is None:
        return {"success": False, "error": "Landing not detected"}

    return {
        "success": True,
        "takeoff_frame": takeoff_frame,
        "landing_frame": landing_frame,
        "rest_position": rest_position,
        "peak_position": peak_position,
        "threshold": threshold,
        "error": None,
    }


def compute_jump_height(flight_time_ms: float) -> dict:
    if flight_time_ms <= 0:
        return {"success": False, "error": "Flight time must be greater than 0"}

    t = flight_time_ms / 1000.0
    h = (GRAVITY_M_S2 * (t**2)) / 8
    return {"success": True, "jump_height_cm": h * 100}


def analyze(video_path: str, model: ultralytics.YOLO, device: str = "cpu", fps_override: float | None = None) -> dict:
    video_result = load_video(video_path)

    if not video_result["success"]:
        return {"success": False, "error": video_result["error"]}
    cap = video_result["cap"]

    tracking_result = track_ankles(cap, model, device)
    cap.release()

    if not tracking_result["success"]:
        return {"success": False, "error": tracking_result["error"]}
    ankle_y = tracking_result["ankle_y"]
    timestamps_ms = tracking_result["timestamps_ms"]

    if len(timestamps_ms) < 2:
        return {"success": False, "error": "Not enough frames to analyze"}

    detection_result = detect_takeoff_and_landing(ankle_y, fps=None)

    if not detection_result["success"]:
        return {"success": False, "error": detection_result["error"]}
    takeoff_frame = detection_result["takeoff_frame"]
    landing_frame = detection_result["landing_frame"]

    flight_time_ms = timestamps_ms[landing_frame] - timestamps_ms[takeoff_frame]

    height_result = compute_jump_height(flight_time_ms)
    if not height_result["success"]:
        return {"success": False, "error": height_result["error"]}

    local_fps = compute_fps_from_timestamps(timestamps_ms[takeoff_frame : landing_frame + 1])

    return {
        "success": True,
        "jump_height_cm": height_result["jump_height_cm"],
        "flight_time_ms": flight_time_ms,
        "takeoff_frame": takeoff_frame,
        "landing_frame": landing_frame,
        "fps_used": local_fps,
    }
