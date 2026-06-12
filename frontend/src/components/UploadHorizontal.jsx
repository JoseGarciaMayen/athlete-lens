import { useState } from "react";

function UploadHorizontal() {
    const [sessionDate, setSessionDate] = useState("");
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

        // Utilizamos FormData tal cual para que coincida con el backend Form(...)
        const formData = new FormData();
        formData.append("session_date", sessionDate);
        formData.append("jump_distance_cm", distanceCm);

        if (notes) {
            formData.append("notes", notes);
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/analyze/horizontal`,
                {
                    method: "POST",
                    body: formData, // El navegador configurará Content-Type automáticamente
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
            <h2 className="text-xl font-bold mb-4">Horizontal Jump</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                    <label className="block mb-1 font-medium">Distance (cm)</label>
                    <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={distanceCm}
                        onChange={(e) => setDistanceCm(e.target.value)}
                        placeholder="e.g. 230"
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
                    {loading ? "Saving..." : "Save result"}
                </button>
            </form>

            {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            {result && (
                <div className="mt-4 p-3 bg-green-100 text-green-800 rounded">
                    <p className="font-medium">Data saved successfully!</p>
                    <p>Jump distance: {result.jump_distance_cm} cm</p>
                </div>
            )}
        </>
    );
}

export default UploadHorizontal;