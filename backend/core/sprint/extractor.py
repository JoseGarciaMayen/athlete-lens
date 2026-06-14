import cv2
import ultralytics


def load_video(video_path: str) -> dict:
    """
    Load video file and return cap and metadata.
    """
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return {"success": False, "error": f"{video_path} failed opening"}

    fps          = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))

    if total_frames == 0 or fps == 0:
        cap.release()
        return {"success": False, "error": "Video has no frames or invalid FPS"}

    return {
        "success":      True,
        "cap":          cap,
        "fps":          fps,
        "total_frames": total_frames,
        "width":        width,
    }


def detect_finish_crossing(cap: cv2.VideoCapture, width: int, fps: float, model: ultralytics.YOLO) -> dict:
    """
    Iterate frames until the athlete's hip center crosses the horizontal midpoint (width / 2).

    Uses hip keypoints 11 (left hip) and 12 (right hip) when both are visible.
    Falls back to bounding box center when hip keypoints are missing.
    Stops as soon as the crossing is detected (early exit).
    """
    midpoint_x = width / 2

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, verbose=False, device="cpu")

        has_detection = results[0].boxes is not None and len(results[0].boxes) > 0

        if has_detection:
            confs    = results[0].boxes.conf.tolist()
            best_idx = confs.index(max(confs))

            # Try hip keypoints first
            hip_cx = None
            if results[0].keypoints is not None and len(results[0].keypoints.xy) > best_idx:
                kps       = results[0].keypoints.xy[best_idx]
                left_hip  = kps[11].tolist()
                right_hip = kps[12].tolist()

                left_valid  = left_hip[0] > 0 and left_hip[1] > 0
                right_valid = right_hip[0] > 0 and right_hip[1] > 0

                if left_valid and right_valid:
                    hip_cx = (left_hip[0] + right_hip[0]) / 2

            # Fall back to bounding box center
            if hip_cx is None:
                box           = results[0].boxes.xyxy[best_idx].tolist()
                x1, _, x2, _ = box
                hip_cx        = (x1 + x2) / 2

            if hip_cx > midpoint_x:
                return {
                    "success":        True,
                    "crossing_frame": frame_idx,
                    "sprint_time_s":  round(frame_idx / fps, 3),
                }

        frame_idx += 1

    return {"success": False, "error": "Athlete never crossed the frame midpoint"}


def analyze(video_path: str, model: ultralytics.YOLO) -> dict:
    """
    Orchestrates the full sprint analysis pipeline.
    Loads video, iterates frames, detects the finish crossing and computes sprint time.
    """
    video_result = load_video(video_path)

    if not video_result["success"]:
        return {"success": False, "error": video_result["error"]}

    cap   = video_result["cap"]
    fps   = video_result["fps"]
    width = video_result["width"]

    crossing_result = detect_finish_crossing(cap, width, fps, model)
    cap.release()

    if not crossing_result["success"]:
        return {"success": False, "error": crossing_result["error"]}

    return {
        "success":        True,
        "crossing_frame": crossing_result["crossing_frame"],
        "fps_used":       fps,
        "sprint_time_s":  crossing_result["sprint_time_s"],
    }
