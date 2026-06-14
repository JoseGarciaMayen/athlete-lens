import { useState } from "react";

function UploadSprint() {
    const [file, setFile] = useState(null);
    const [sessionDate, setSessionDate] = useState("");
    const [notes, setNotes] = useState("");
    const [distanceM, setDistanceM] = useState("");
    const [manualTimeS, setManualTimeS] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();

        if (!file && !manualTimeS) {
            setError("You must upload a video file or input time manually");
            return;
        }

        if (!distanceM) {
            setError("Distance is required");
            return;
        }

        setLoading(true);
        setResult(null);
        setError(null);

        const formData = new FormData();
        formData.append("session_date", sessionDate);
        formData.append("distance_m", distanceM);

        if (file) {
            formData.append("file", file);
        }

        if (manualTimeS) {
            formData.append("sprint_time_s", parseFloat(manualTimeS));
        }

        if (notes) {
            formData.append("notes", notes);
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analyze/sprint`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setError(data.detail || "Unknown error");
            } else {
                setResult(data);
                setFile(null);
                setManualTimeS("");
            }
        } catch (err) {
            setError("Could not connect to the server");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <h2 className="text-xl font-bold mb-4">Sprint</h2>

            <div className="flex flex-col gap-4">
                <div>
                    <label className="block mb-1 font-medium">Session date</label>
                    <input
                        type="date"
                        required
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="block w-full border rounded px-2 py-1"
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium">Distance (m)</label>
                    <div className="flex gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => setDistanceM("30")}
                            className={`px-3 py-1 rounded border ${distanceM === "30" ? "bg-blue-600 text-white" : "bg-white"}`}
                        >
                            30m
                        </button>
                        <button
                            type="button"
                            onClick={() => setDistanceM("60")}
                            className={`px-3 py-1 rounded border ${distanceM === "60" ? "bg-blue-600 text-white" : "bg-white"}`}
                        >
                            60m
                        </button>
                    </div>
                    <input
                        type="number"
                        min="1"
                        value={distanceM}
                        onChange={(e) => setDistanceM(e.target.value)}
                        placeholder="Custom distance"
                        className="block w-full border rounded px-2 py-1"
                    />
                </div>

                <div className="p-4 bg-gray-50 border rounded space-y-4">
                    <div>
                        <label className="block mb-1 font-medium">Option A: Video</label>
                        <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100
                                cursor:pointer"
                        />
                    </div>

                    <div className="text-center text-sm font-medium text-gray-400">— OR —</div>

                    <div>
                        <label className="block mb-1 font-medium">Option B: Manual time (seconds)</label>
                        <input
                            type="number"
                            step="any"
                            min="0"
                            value={manualTimeS}
                            onChange={(e) => setManualTimeS(e.target.value)}
                            className="block w-full border rounded px-2 py-1"
                        />
                    </div>
                </div>

                <div>
                    <label className="block mb-1 font-medium">Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="block w-full border rounded px-2 py-1"
                    />
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
                >
                    {loading ? "Analyzing..." : "Analyze"}
                </button>
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
                    <p>Sprint time: {result.sprint_time_s.toFixed(3)} s</p>
                    {result.crossing_frame && (
                        <p className="text-sm text-green-700 mt-1">
                            Detected at frame {result.crossing_frame} ({result.fps_used} fps)
                        </p>
                    )}
                </div>
            )}
        </>
    );
}

export default UploadSprint;