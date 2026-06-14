import { useState, useRef, useEffect } from "react";

const BEEP_FREQ = 1500;
const BEEP_DURATION = 0.3;

function playBeep(audioCtx) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "square";
    osc.frequency.value = BEEP_FREQ;
    gain.gain.value = 1.0;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + BEEP_DURATION);
}

function UploadVertical() {
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
    const [notes, setNotes] = useState("");
    const [manualHeightCm, setManualHeightCm] = useState("");
    const [preparationS, setPreparationS] = useState("");
    const [recordingS, setRecordingS] = useState("");

    const [phase, setPhase] = useState("idle");
    const [countdown, setCountdown] = useState(null);
    const [recordingLeft, setRecordingLeft] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);
    const videoRef = useRef(null);

    // Attach stream to video element when available
    useEffect(() => {
        if (videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [phase]);

    function validate() {
        if (!sessionDate) return "Session date is required";
        return null;
    }

    async function handleStartCountdown() {
        const validationError = validate();
        if (validationError) { setError(validationError); return; }

        const prepSeconds = parseInt(preparationS, 10);
        if (!prepSeconds || prepSeconds < 1) { setError("Preparation time is required"); return; }

        const recSeconds = parseInt(recordingS, 10);
        if (!recSeconds || recSeconds < 1) { setError("Recording duration is required"); return; }

        // Request camera access before countdown starts
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch {
            setError("Could not access camera");
            return;
        }

        streamRef.current = stream;
        setError(null);
        setResult(null);
        setPhase("preparing");
        setCountdown(prepSeconds);

        let remaining = prepSeconds;

        timerRef.current = setInterval(() => {
            remaining -= 1;
            setCountdown(remaining);

            if (remaining <= 0) {
                clearInterval(timerRef.current);
                startRecording(recSeconds, stream);
            }
        }, 1000);
    }

    async function startRecording(recSeconds, stream) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        playBeep(audioCtx);

        await new Promise((resolve) => setTimeout(resolve, BEEP_DURATION * 1000));

        chunksRef.current = [];
        const recorder = new MediaRecorder(stream);

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            uploadVideo();
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
        setPhase("recording");
        setRecordingLeft(recSeconds);

        let recRemaining = recSeconds;
        timerRef.current = setInterval(() => {
            recRemaining -= 1;
            setRecordingLeft(recRemaining);

            if (recRemaining <= 0) {
                clearInterval(timerRef.current);
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                    mediaRecorderRef.current.stop();
                    setPhase("uploading");
                }
            }
        }, 1000);
    }

    async function uploadVideo() {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });

        const formData = new FormData();
        formData.append("session_date", sessionDate);
        formData.append("file", blob, "vertical.webm");
        if (notes) formData.append("notes", notes);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analyze/vertical`,
                { method: "POST", body: formData }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || "Unknown error");
                setPhase("error");
            } else {
                setResult(data);
                setPhase("done");
            }
        } catch {
            setError("Could not connect to the server");
            setPhase("error");
        }
    }

    function handleReset() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        clearInterval(timerRef.current);
        setPhase("idle");
        setResult(null);
        setError(null);
        setCountdown(null);
        setRecordingLeft(null);
        chunksRef.current = [];
        mediaRecorderRef.current = null;
    }

    const isFormDisabled = phase !== "idle";
    const showFullscreen = phase === "preparing" || phase === "recording";

    return (
        <>
            {/* Fullscreen camera preview */}
            {showFullscreen && (
                <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        {phase === "preparing" && (
                            <>
                                <p className="text-white text-lg mb-4 drop-shadow">Get ready to jump</p>
                                <p className="text-white text-9xl font-bold drop-shadow">{countdown}</p>
                            </>
                        )}

                        {phase === "recording" && (
                            <>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-white text-xl font-semibold drop-shadow">Jump now!</span>
                                </div>
                                <p className="text-white text-9xl font-bold drop-shadow">{recordingLeft}</p>
                            </>
                        )}
                    </div>
                </div>
            )}

            <h2 className="text-xl font-bold mb-4">Vertical Jump</h2>

            <div className="flex flex-col gap-4">
                <div>
                    <label className="block mb-1 font-medium">Date</label>
                    <input
                        type="date"
                        required
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        disabled={isFormDisabled}
                        className="block w-full border rounded px-2 py-1 disabled:opacity-50"
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium">Preparation time (s)</label>
                    <div className="flex gap-2 mb-2">
                        {["5", "10", "15"].map((s) => (
                            <button key={s} type="button" disabled={isFormDisabled}
                                onClick={() => setPreparationS(s)}
                                className={`px-3 py-1 rounded border disabled:opacity-50 ${preparationS === s ? "bg-blue-600 text-white" : "bg-white"}`}>
                                {s}s
                            </button>
                        ))}
                    </div>
                    <input type="number" min="1" value={preparationS}
                        onChange={(e) => setPreparationS(e.target.value)}
                        disabled={isFormDisabled} placeholder="Custom time"
                        className="block w-full border rounded px-2 py-1 disabled:opacity-50" />
                </div>

                <div>
                    <label className="block mb-1 font-medium">Recording duration (s)</label>
                    <div className="flex gap-2 mb-2">
                        {["5", "7", "10"].map((s) => (
                            <button key={s} type="button" disabled={isFormDisabled}
                                onClick={() => setRecordingS(s)}
                                className={`px-3 py-1 rounded border disabled:opacity-50 ${recordingS === s ? "bg-blue-600 text-white" : "bg-white"}`}>
                                {s}s
                            </button>
                        ))}
                    </div>
                    <input type="number" min="1" value={recordingS}
                        onChange={(e) => setRecordingS(e.target.value)}
                        disabled={isFormDisabled} placeholder="Custom duration"
                        className="block w-full border rounded px-2 py-1 disabled:opacity-50" />
                </div>

                <div>
                    <label className="block mb-1 font-medium">Notes (optional)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                        disabled={isFormDisabled}
                        className="block w-full border rounded px-2 py-1 disabled:opacity-50" />
                </div>

                {phase === "idle" && (
                    <div className="p-4 bg-gray-50 border rounded space-y-2">
                        <label className="block font-medium text-sm text-gray-600">
                            Manual entry (optional — skip countdown)
                        </label>
                        <input type="number" step="any" min="0" value={manualHeightCm}
                            onChange={(e) => setManualHeightCm(e.target.value)}
                            placeholder="Jump height (cm)"
                            className="block w-full border rounded px-2 py-1" />
                        {manualHeightCm && (
                            <button type="button" onClick={async () => {
                                const validationError = validate();
                                if (validationError) { setError(validationError); return; }
                                setError(null);
                                setPhase("uploading");
                                const formData = new FormData();
                                formData.append("session_date", sessionDate);
                                formData.append("jump_height_cm", parseFloat(manualHeightCm));
                                if (notes) formData.append("notes", notes);
                                try {
                                    const response = await fetch(
                                        `${import.meta.env.VITE_API_URL}/api/analyze/vertical`,
                                        { method: "POST", body: formData }
                                    );
                                    const data = await response.json();
                                    if (!response.ok) { setError(data.detail || "Unknown error"); setPhase("error"); }
                                    else { setResult(data); setPhase("done"); }
                                } catch { setError("Could not connect to the server"); setPhase("error"); }
                            }} className="w-full bg-gray-600 text-white rounded px-4 py-2">
                                Save manually
                            </button>
                        )}
                    </div>
                )}

                {phase === "idle" && (
                    <button type="button" onClick={handleStartCountdown}
                        className="bg-blue-600 text-white rounded px-4 py-2">
                        Start countdown
                    </button>
                )}

                {phase === "uploading" && (
                    <div className="text-center py-6">
                        <p className="text-gray-500 animate-pulse">Uploading and analyzing...</p>
                    </div>
                )}

                {(phase === "done" || phase === "error") && (
                    <button type="button" onClick={handleReset}
                        className="bg-gray-200 text-gray-700 rounded px-4 py-2">
                        New jump
                    </button>
                )}
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
            )}

            {result && (
                <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
                    <p className="font-semibold">Height: {Number(result.jump_height_cm).toFixed(1)} cm</p>
                    {result.flight_time_ms != null && (
                        <p>Flight time: {Number(result.flight_time_ms).toFixed(0)} ms</p>
                    )}
                    {result.takeoff_frame != null && (
                        <p className="text-sm text-green-700 mt-1">
                            Frames: {result.takeoff_frame} → {result.landing_frame} ({result.fps_used} fps)
                        </p>
                    )}
                </div>
            )}
        </>
    );
}

export default UploadVertical;