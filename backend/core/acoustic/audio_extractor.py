import subprocess
import tempfile
import os


def extract_audio_from_video(video_path: str) -> str:
    """
    Extracts audio from a video file using ffmpeg.
    Returns the path to a temporary WAV file.
    The caller is responsible for deleting the file after use.
    """
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    tmp.close()

    command = [
        "ffmpeg",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "44100",
        "-ac", "1",
        "-y",
        tmp.name
    ]

    subprocess.run(command, check=True, capture_output=True)

    return tmp.name