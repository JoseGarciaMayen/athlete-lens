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
    const [inputMode, setInputMode] = useState("record");
    const [uploadFile, setUploadFile] = useState(null);

    const [phase, setPhase] = useState("idle");
    const [countdown, setCountdown] = useState(null);
    const [recordingLeft, setRecordingLeft] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [saveToast, setSaveToast] = useState(false);
    const [downloadEnabled, setDownloadEnabled] = useState(true);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);
    const videoRef = useRef(null);
    const audioCtxRef = useRef(null);
    const fpsRef = useRef(null);
    const debugMetaRef = useRef(null);

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
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        playBeep(audioCtxRef.current);

        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        const capabilities = videoTrack.getCapabilities?.() ?? {};
        fpsRef.current = settings.frameRate || 30;
        debugMetaRef.current = {
            fps: settings.frameRate ?? null,
            fps_range: capabilities.frameRate
                ? { min: capabilities.frameRate.min, max: capabilities.frameRate.max }
                : null,
            resolution: { width: settings.width ?? null, height: settings.height ?? null },
            recorded_at: new Date().toISOString(),
            recording_stopped_at: null,
            duration_s: null,
        };

        await new Promise((resolve) => setTimeout(resolve, BEEP_DURATION * 1000));

        chunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = () => {
            const stoppedAt = new Date().toISOString();
            if (debugMetaRef.current) {
                debugMetaRef.current.recording_stopped_at = stoppedAt;
                const startMs = new Date(debugMetaRef.current.recorded_at).getTime();
                debugMetaRef.current.duration_s = (Date.now() - startMs) / 1000;
            }
            stream.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            const blob = new Blob(chunksRef.current, { type: "video/webm" });
            if (downloadEnabled) downloadVideo(blob);
            uploadVideo(blob);
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

    function downloadVideo(blob) {
        const ts = new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
        const baseName = `vertical_${ts}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${baseName}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        if (debugMetaRef.current) {
            const json = JSON.stringify(debugMetaRef.current, null, 2);
            const jsonBlob = new Blob([json], { type: "application/json" });
            const jsonUrl = URL.createObjectURL(jsonBlob);
            const b = document.createElement("a");
            b.href = jsonUrl;
            b.download = `${baseName}_debug.json`;
            b.click();
            URL.revokeObjectURL(jsonUrl);
        }

        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 3000);
    }

    async function uploadVideo(fileOverride) {
        const isUserFile = fileOverride instanceof File;
        const file = fileOverride || new Blob(chunksRef.current, { type: "video/webm" });
        const filename = isUserFile ? fileOverride.name : "vertical.webm";

        const formData = new FormData();
        formData.append("session_date", sessionDate);
        formData.append("file", file, filename);
        if (fpsRef.current) formData.append("fps", fpsRef.current);
        if (notes) formData.append("notes", notes);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analyze/vertical`,
                { method: "POST", body: formData }
            );
            const data = await response.json();
            if (!response.ok) { setError(data.detail || "Unknown error"); setPhase("error"); }
            else { setResult(data); setPhase("done"); }
        } catch {
            setError("Could not connect to the server");
            setPhase("error");
        }
    }

    async function handleUploadSubmit() {
        const validationError = validate();
        if (validationError) { setError(validationError); return; }
        if (!uploadFile) { setError("Please select a video file"); return; }
        setError(null);
        setPhase("uploading");
        await uploadVideo(uploadFile);
    }

    function handleReset() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        clearInterval(timerRef.current);
        if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
        setPhase("idle");
        setResult(null);
        setError(null);
        setCountdown(null);
        setRecordingLeft(null);
        setUploadFile(null);
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        fpsRef.current = null;
    }

    const isFormDisabled = phase !== "idle";
    const showFullscreen = phase === "preparing" || phase === "recording";
    const btnBase = "flex-1 py-2 text-sm font-medium rounded border transition-colors";
    const btnActive = "bg-blue-600 text-white border-blue-600";
    const btnInactive = "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600";

    return (
        <>
            {saveToast && (
                <div className="fixed bottom-6 right-6 z-[9999] bg-gray-900 text-white text-sm px-4 py-3 rounded-lg shadow-lg">
                    Video guardado en tu dispositivo
                </div>
            )}

            {showFullscreen && (
                <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
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

            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Vertical Jump</h2>

            <div className="flex flex-col gap-4">
                <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Date</label>
                    <input type="date" required value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)} disabled={isFormDisabled}
                        className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50" />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isFormDisabled}
                        className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50" />
                </div>

                {phase === "idle" && (
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setInputMode("record")}
                            className={`${btnBase} ${inputMode === "record" ? btnActive : btnInactive}`}>
                            Record
                        </button>
                        <button type="button" onClick={() => setInputMode("upload")}
                            className={`${btnBase} ${inputMode === "upload" ? btnActive : btnInactive}`}>
                            Upload video
                        </button>
                        <button type="button" onClick={() => setInputMode("manual")}
                            className={`${btnBase} ${inputMode === "manual" ? btnActive : btnInactive}`}>
                            Manual
                        </button>
                    </div>
                )}

                {phase === "idle" && inputMode === "record" && (
                    <>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Preparation time (s)</label>
                            <div className="flex gap-2 mb-2">
                                {["5", "10", "15"].map((s) => (
                                    <button key={s} type="button" onClick={() => setPreparationS(s)}
                                        className={`px-3 py-1 rounded border ${preparationS === s ? btnActive : btnInactive}`}>
                                        {s}s
                                    </button>
                                ))}
                            </div>
                            <input type="number" min="1" value={preparationS}
                                onChange={(e) => setPreparationS(e.target.value)} placeholder="Custom time"
                                className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Recording duration (s)</label>
                            <div className="flex gap-2 mb-2">
                                {["5", "7", "10"].map((s) => (
                                    <button key={s} type="button" onClick={() => setRecordingS(s)}
                                        className={`px-3 py-1 rounded border ${recordingS === s ? btnActive : btnInactive}`}>
                                        {s}s
                                    </button>
                                ))}
                            </div>
                            <input type="number" min="1" value={recordingS}
                                onChange={(e) => setRecordingS(e.target.value)} placeholder="Custom duration"
                                className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                            <input type="checkbox" checked={downloadEnabled} onChange={(e) => setDownloadEnabled(e.target.checked)} className="w-4 h-4" />
                            Save video to device
                        </label>
                        <button type="button" onClick={handleStartCountdown}
                            className="bg-blue-600 text-white rounded px-4 py-2">
                            Start countdown
                        </button>
                    </>
                )}

                {phase === "idle" && inputMode === "upload" && (
                    <>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Video file</label>
                            <input type="file" accept="video/*" onChange={(e) => setUploadFile(e.target.files[0])}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                        </div>
                        <button type="button" onClick={handleUploadSubmit}
                            className="bg-blue-600 text-white rounded px-4 py-2">
                            Analyze
                        </button>
                    </>
                )}

                {phase === "idle" && inputMode === "manual" && (
                    <>
                        <input type="number" step="any" min="0" value={manualHeightCm}
                            onChange={(e) => setManualHeightCm(e.target.value)} placeholder="Jump height (cm)"
                            className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
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
                            }} className="bg-gray-600 text-white rounded px-4 py-2">
                                Save manually
                            </button>
                        )}
                    </>
                )}

                {phase === "uploading" && (
                    <div className="text-center py-6">
                        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Uploading and analyzing...</p>
                    </div>
                )}

                {(phase === "done" || phase === "error") && (
                    <button type="button" onClick={handleReset}
                        className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded px-4 py-2">
                        New jump
                    </button>
                )}
            </div>

            {error && <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">{error}</div>}

            {result && (
                <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                    <p className="font-semibold">Height: {Number(result.jump_height_cm).toFixed(1)} cm</p>
                    {result.flight_time_ms != null && (
                        <p>Flight time: {Number(result.flight_time_ms).toFixed(0)} ms</p>
                    )}
                    {result.fps_used != null && (
                        <p className="text-sm text-green-700 dark:text-green-400">
                            FPS: {Number(result.fps_used).toFixed(2)}
                        </p>
                    )}
                    {result.takeoff_frame != null && (
                        <p className="text-sm text-green-700 dark:text-green-400">
                            Frames: {result.takeoff_frame} → {result.landing_frame}
                        </p>
                    )}
                </div>
            )}
        </>
    );
}

export default UploadVertical;