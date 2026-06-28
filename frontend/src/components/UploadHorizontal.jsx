import { useState } from "react";

function UploadHorizontal() {
    const [sessionDate, setSessionDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [distanceCm, setDistanceCm] = useState("");
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
        formData.append("session_date", sessionDate);
        formData.append("jump_distance_cm", distanceCm);

        if (notes) {
            formData.append("notes", notes);
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analyze/horizontal`,
                { method: "POST", body: formData }
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
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Horizontal Jump</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Session date</label>
                    <input
                        type="date"
                        required
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Distance (cm)</label>
                    <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={distanceCm}
                        onChange={(e) => setDistanceCm(e.target.value)}
                        placeholder="e.g. 230"
                        className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="block w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
                >
                    {loading ? "Saving..." : "Save result"}
                </button>
            </form>

            {error && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                    <p className="font-medium">Data saved successfully!</p>
                    <p>Jump distance: {result.jump_distance_cm} cm</p>
                </div>
            )}
        </>
    );
}

export default UploadHorizontal;
