import { useState, useEffect } from "react";

const TYPE_LABELS = {
    vertical: "Vertical Jump",
    sprint: "Sprint",
    horizontal: "Horizontal Jump",
};

const PAGE_SIZE = 15;

function formatValue(metric) {
    if (metric.type === "sprint") {
        const distance = metric.distance_m ? ` (${metric.distance_m}m)` : "";
        return `${Number(metric.value).toFixed(3)} s${distance}`;
    }
    return `${Number(metric.value).toFixed(1)} cm`;
}

function downloadCsv(metrics) {
    const header = ["date", "type", "value", "notes"];
    const rows = [header.join(",")];

    for (const metric of metrics) {
        const row = [
            metric.date,
            TYPE_LABELS[metric.type],
            formatValue(metric),
            (metric.notes || "").replace(/,/g, ";"),
        ];
        rows.push(row.join(","));
    }

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "athlete_lens_history.csv";
    link.click();

    URL.revokeObjectURL(url);
}

function History() {
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchMetrics();
    }, []);

    async function fetchMetrics() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/metrics`);
            if (!response.ok) {
                throw new Error("Failed to fetch metrics");
            }
            const data = await response.json();
            setMetrics(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(metric) {
        const confirmed = window.confirm(
            `Delete this ${TYPE_LABELS[metric.type]} entry from ${metric.date}?`
        );
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/metrics/${metric.type}/${metric.id}`,
                { method: "DELETE" }
            );

            if (!response.ok) {
                throw new Error("Failed to delete metric");
            }

            setMetrics((prev) =>
                prev.filter((m) => !(m.type === metric.type && m.id === metric.id))
            );
        } catch (err) {
            setError(err.message);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-6 mt-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading history...</p>
            </div>
        );
    }

    const totalPages = Math.max(1, Math.ceil(metrics.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageMetrics = metrics.slice(startIndex, startIndex + PAGE_SIZE);

    return (
        <div className="max-w-4xl mx-auto p-6 mt-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">History</h1>
                <button
                    onClick={() => downloadCsv(metrics)}
                    disabled={metrics.length === 0}
                    className="bg-blue-600 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
                >
                    Export CSV
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                    {error}
                </div>
            )}

            {metrics.length === 0 ? (
                <div className="p-6 text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 border border-dashed dark:border-gray-700 rounded-lg">
                    No entries yet
                </div>
            ) : (
                <>
                    <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-left">
                                <tr>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Type</th>
                                    <th className="px-4 py-2">Value</th>
                                    <th className="px-4 py-2">Notes</th>
                                    <th className="px-4 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageMetrics.map((metric) => (
                                    <tr key={`${metric.type}-${metric.id}`} className="border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                        <td className="px-4 py-2">{metric.date}</td>
                                        <td className="px-4 py-2">{TYPE_LABELS[metric.type]}</td>
                                        <td className="px-4 py-2">{formatValue(metric)}</td>
                                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{metric.notes || "—"}</td>
                                        <td className="px-4 py-2 text-right">
                                            <button
                                                onClick={() => handleDelete(metric)}
                                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-4">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default History;
