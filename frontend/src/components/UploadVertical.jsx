import { useState } from "react";

function UploadVertical() {
    const [file, setFile] = useState(null);
    const [sessionDate, setSessionDate] = useState("");
    const [notes, setNotes] = useState("");
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
                    <label className="block mb-1 font-medium">Video</label>
                    <input
                        type="file"
                        accept="video/*"
                        required
                        onChange={(e) => setFile(e.target.files[0])}
                        className="block w-full"
                    />
                </div>

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
                    <p>Height: {result.jump_height_cm.toFixed(1)} cm</p>
                    <p>Flight time: {result.flight_time_ms.toFixed(0)} ms</p>
                    <p>Frames: {result.takeoff_frame} → {result.landing_frame}</p>
                </div>
            )}
        </>
    );
}

export default UploadVertical;