import { useState } from "react";

function UploadAcoustic() {
    const [file, setFile] = useState(null);
    const [sessionDate, setSessionDate] = useState("");
    const [notes, setNotes] = useState("");
    const [distanceM, setDistanceM] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("session_date", sessionDate);
        if (notes) {
            formData.append("notes", notes);
        }
        if (distanceM) {
            formData.append("distance_m", distanceM);
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analyze/acoustic`,
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
            }
        } catch (err) {
            setError("Could not connect to the server");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <h2 className="text-xl font-bold mb-4">Reaction Time / Sprint</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block mb-1 font-medium">Audio or video</label>
                    <input
                        type="file"
                        accept="audio/*,video/*"
                        required
                        onChange={(e) => setFile(e.target.files[0])}
                        className="block w-full"
                    />
                </div>

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
                    <label className="block mb-1 font-medium">Distance (m, optional)</label>
                    <div className="flex gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => setDistanceM("30")}
                            className={`px-3 py-1 rounded border ${distanceM === "30" ? "bg-blue-600 text-white" : "bg-white"
                                }`}
                        >
                            30m
                        </button>
                        <button
                            type="button"
                            onClick={() => setDistanceM("60")}
                            className={`px-3 py-1 rounded border ${distanceM === "60" ? "bg-blue-600 text-white" : "bg-white"
                                }`}
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

                <div>
                    <label className="block mb-1 font-medium">Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="block w-full border rounded px-2 py-1"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
                >
                    {loading ? "Analyzing..." : "Analyze"}
                </button>
            </form>

            {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
                    <p>Time delta: {(result.time_delta_ms / 1000).toFixed(2)} s</p>
                    <p>Events detected: {result.events_detected}</p>
                </div>
            )}
        </>
    );
}

export default UploadAcoustic;