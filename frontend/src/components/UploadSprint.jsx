import { useState, useRef, useEffect } from "react";

const BEEP_FREQ = 1500;
const BEEP_DURATION = 0.50;
const BEEP_GAP = 1;

function playCountdownBeeps(audioCtx) {
    for (let i = 0; i < 3; i++) {
        const startTime = audioCtx.currentTime + i * BEEP_GAP;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "square";
        osc.frequency.value = BEEP_FREQ;
        gain.gain.value = 1.0;

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + BEEP_DURATION);
    }
}

function UploadSprint() {
    const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
    const [notes, setNotes] = useState("");
    const [distanceM, setDistanceM] = useState("");
    const [manualTimeS, setManualTimeS] = useState("");
    const [preparationS, setPreparationS] = useState("");

    const [phase, setPhase] = useState("idle");
    const [countdown, setCountdown] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);
    const videoRef = useRef(null);
    const audioCtxRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [phase]);

    function validate() {
        if (!sessionDate) return "Session date is required";
        if (!distanceM) return "Distance is required";
        return null;
    }

    async function handleStartCountdown() {
        const validationError = validate();
        if (validationError) { setError(validationError); return; }

        const prepSeconds = parseInt(preparationS, 10);
        if (!prepSeconds || prepSeconds < 1) { setError("Preparation time is required"); return; }

        // Request camera before countdown
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
                startRecording(stream);
            }
        }, 1000);
    }

    async function startRecording(stream) {
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const audioCtx = audioCtxRef.current;
        playCountdownBeeps(audioCtx);

        await new Promise((resolve) => setTimeout(resolve, BEEP_GAP * 2 * 1000));

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
    }

    function handleStopRecording() {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            setPhase("uploading");
        }
    }

    async function uploadVideo() {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });

        const formData = new FormData();
        formData.append("session_date", sessionDate);
        formData.append("distance_m", distanceM);
        formData.append("file", blob, "sprint.webm");
        if (notes) formData.append("notes", notes);

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analyze/sprint`,
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
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        setPhase("idle");
        setResult(null);
        setError(null);
        setCountdown(null);
        chunksRef.current = [];
        mediaRecorderRef.current = null;
    }

    const isFormDisabled = phase !== "idle";
    const showFullscreen = phase === "preparing" || phase === "recording";

    return (
        <>
            {showFullscreen && (
                <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        {phase === "preparing" && (
                            <>
                                <p className="text-white text-lg mb-4 drop-shadow">Place phone at finish line</p>
                                <p className="text-white text-9xl font-bold drop-shadow">{countdown}</p>
                            </>
                        )}

                        {phase === "recording" && (
                            <div className="absolute bottom-16 w-full flex justify-center pointer-events-auto">
                                <button
                                    onClick={handleStopRecording}
                                    className="bg-red-600 text-white rounded-full px-12 py-6 text-2xl font-bold shadow-lg"
                                >
                                    Stop
                                </button>
                            </div>
                        )}

                        {phase === "recording" && (
                            <div className="absolute top-10 flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-white text-xl font-semibold drop-shadow">Recording</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Sprint</h2>

            <div className="flex flex-col gap-4">
                <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Date</label>
                    <input type="date" required value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        disabled={isFormDisabled}
                        className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50" />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Distance (m)</label>
                    <div className="flex gap-2 mb-2">
                        {["30", "60"].map((d) => (
                            <button key={d} type="button" disabled={isFormDisabled}
                                onClick={() => setDistanceM(d)}
                                className={`px-3 py-1 rounded border disabled:opacity-50 ${distanceM === d ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"}`}>
                                {d}m
                            </button>
                        ))}
                    </div>
                    <input type="number" min="1" value={distanceM}
                        onChange={(e) => setDistanceM(e.target.value)}
                        disabled={isFormDisabled} placeholder="Custom distance"
                        className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50" />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Preparation time (s)</label>
                    <div className="flex gap-2 mb-2">
                        {["15", "30", "45"].map((s) => (
                            <button key={s} type="button" disabled={isFormDisabled}
                                onClick={() => setPreparationS(s)}
                                className={`px-3 py-1 rounded border disabled:opacity-50 ${preparationS === s ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"}`}>
                                {s}s
                            </button>
                        ))}
                    </div>
                    <input type="number" min="1" value={preparationS}
                        onChange={(e) => setPreparationS(e.target.value)}
                        disabled={isFormDisabled} placeholder="Custom time"
                        className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50" />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                        disabled={isFormDisabled}
                        className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50" />
                </div>

                {phase === "idle" && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded space-y-2">
                        <label className="block font-medium text-sm text-gray-600 dark:text-gray-400">
                            Manual entry (optional — skip countdown)
                        </label>
                        <input type="number" step="any" min="0" value={manualTimeS}
                            onChange={(e) => setManualTimeS(e.target.value)}
                            placeholder="Sprint time (seconds)"
                            className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        {manualTimeS && (
                            <button type="button" onClick={async () => {
                                const validationError = validate();
                                if (validationError) { setError(validationError); return; }
                                setError(null);
                                setPhase("uploading");
                                const formData = new FormData();
                                formData.append("session_date", sessionDate);
                                formData.append("distance_m", distanceM);
                                formData.append("sprint_time_s", parseFloat(manualTimeS));
                                if (notes) formData.append("notes", notes);
                                try {
                                    const response = await fetch(
                                        `${import.meta.env.VITE_API_URL}/api/analyze/sprint`,
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
                        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Uploading and analyzing...</p>
                    </div>
                )}

                {(phase === "done" || phase === "error") && (
                    <button type="button" onClick={handleReset}
                        className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded px-4 py-2">
                        New sprint
                    </button>
                )}
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">{error}</div>
            )}

            {result && (
                <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                    <p className="font-semibold">Sprint time: {result.sprint_time_s.toFixed(3)} s</p>
                    {result.crossing_frame && (
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                            Detected at frame {result.crossing_frame} ({result.fps_used} fps)
                        </p>
                    )}
                </div>
            )}
        </>
    );
}

export default UploadSprint;
