import { useState } from "react";

function UploadVertical() {
    const [file, setFile] = useState(null);
    const [sessionDate, setSessionDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [notes, setNotes] = useState("");
    const [manualHeightCm, setManualHeightCm] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();

        if (!file && !manualHeightCm) {
            setError("You must upload a video or input height manually");
            return;
        }

        setLoading(true);
        setResult(null);
        setError(null);

        const formData = new FormData();
        formData.append("session_date", sessionDate);

        if (file) {
            formData.append("file", file);
        }

        if (manualHeightCm) {
            formData.append("jump_height_cm", manualHeightCm);
        }

        if (notes) {
            formData.append("notes", notes);
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analyze/vertical`,
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
                setManualHeightCm("");
            }
        } catch (err) {
            setError("Could not connect to the server");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <h2 className="text-xl font-bold mb-4">Vertical jump</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block mb-1 font-medium">Date</label>
                    <input
                        type="date"
                        required
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
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
                                cursor-pointer"
                        />
                    </div>

                    <div className="text-center text-sm font-medium text-gray-400">— OR —</div>

                    <div>
                        <label className="block mb-1 font-medium">Option B: Manual Height (cm)</label>
                        <input
                            type="number"
                            step="any"
                            min="0"
                            value={manualHeightCm}
                            onChange={(e) => setManualHeightCm(e.target.value)}
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
                    <p>Height: {Number(result.jump_height_cm).toFixed(1)} cm</p>
                    {result.flight_time_ms != null && (
                        <p>Flight time: {Number(result.flight_time_ms).toFixed(0)} ms</p>
                    )}
                    {result.takeoff_frame != null && (
                        <p>Frames: {result.takeoff_frame} → {result.landing_frame}</p>
                    )}
                </div>
            )}
        </>
    );
}

export default UploadVertical;