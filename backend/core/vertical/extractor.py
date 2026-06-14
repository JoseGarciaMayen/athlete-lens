import cv2
import numpy as np
import ultralytics

GRAVITY_M_S2 = 9.80665

def load_video(video_path: str) -> dict:
    """
    Load video file and returns cap and fps
    """
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {
            "success": False,
            "error": f"{video_path} failed opening"
        }
    fps = cap.get(cv2.CAP_PROP_FPS)
    return {
        "success": True,
        "cap": cap,
        "fps": fps
    }

def track_ankles(cap: cv2.VideoCapture, model: ultralytics.YOLO, device: str ="cpu") -> dict:
    """
    Tracks ankles vertical position during the jump
    """
    ankle_y = []

    while True:
        ret, frame = cap.read() # ret indicates if read was successful
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
        elif len(ankle_y) > 0:
            ankle_y.append(ankle_y[-1])
        else:
            return {
                "success": False,
                "error": "No person detected in the first frame"
            }

    return {
        "success": True,
        "ankle_y": ankle_y
    }

def detect_takeoff_and_landing(ankle_y, fps, rest_frames=15, sustain_frames=2):
    """
    Detect takeoff and landing frames from ankle Y position over time.
    """
    ankle_y = np.array(ankle_y)

    if len(ankle_y) < rest_frames + sustain_frames * 2:
        return {"success": False, "error": "Not enough frames to analyze"}

    rest_position = float(np.median(ankle_y[0:rest_frames])) # median and not mean to avoid outliers
    peak_position = float(np.min(ankle_y))
    total_range = rest_position - peak_position

    if total_range <= 0:
        return {"success": False, "error": "No upward movement detected"}

    margin = 0.3 * total_range # dynamic margin to adapt to camera distance
    threshold = rest_position - margin

    takeoff_frame = None
    landing_frame = None

    # Takeoff
    for i in range(rest_frames, len(ankle_y) - sustain_frames):
        # Check if current frame and the next 'sustain_frames' all cross the threshold
        if np.all(ankle_y[i : i + sustain_frames] < threshold):
            takeoff_frame = i
            break

    if takeoff_frame is None:
        return {"success": False, "error": "Takeoff not detected"}

    # Landing
    peak_frame = int(np.argmin(ankle_y))

    for i in range(peak_frame, len(ankle_y) - sustain_frames):
        # Check if current frame and the next 'sustain_frames' all cross the threshold
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

def compute_jump_height(takeoff_frame: int, landing_frame: int, fps: int) -> dict:
    """
    Computes how high the jump is and returns its value in centimeters and its flight time in milliseconds
    """
    if (landing_frame <= takeoff_frame):
        return {
            "success": False,
            "error": "Landing frame is previous or equal to takeoff frame"
        }

    if fps <= 0:
        return {
            "success": False,
            "error": "FPS must be greater than 0"
        }

    t = (landing_frame - takeoff_frame) / fps
    h = (GRAVITY_M_S2 * (t ** 2))/8
    return {
        "success": True,
        "jump_height_cm": h * 100,
        "flight_time_ms": t * 1000
    }

def analyze(video_path: str, model: ultralytics.YOLO, device: str = "cpu") -> dict:
    """
    Orchestrates the full vertical analysis pipeline.
    Loads video, tracks ankles, detects takeoff and landing frames and computes jump height and flight time.
    """
    video_result = load_video(video_path)

    if not video_result["success"]:
        return {"success": False, "error": video_result["error"]}
    cap = video_result["cap"]
    fps = video_result["fps"]

    tracking_result = track_ankles(cap, model, device)
    cap.release()

    if not tracking_result["success"]:
        return {"success": False, "error": tracking_result["error"]}
    ankle_y = tracking_result["ankle_y"]

    detection_result = detect_takeoff_and_landing(ankle_y, fps)

    if not detection_result["success"]:
        return {"success": False, "error": detection_result["error"]}
    takeoff_frame = detection_result["takeoff_frame"]
    landing_frame = detection_result["landing_frame"]

    height_result = compute_jump_height(takeoff_frame, landing_frame, fps)
    if not height_result["success"]:
        return {"success": False, "error": height_result["error"]}

    return {
        "success": True,
        "jump_height_cm": height_result["jump_height_cm"],
        "flight_time_ms": height_result["flight_time_ms"],
        "takeoff_frame": takeoff_frame,
        "landing_frame": landing_frame,
        "fps_used": fps
    }

