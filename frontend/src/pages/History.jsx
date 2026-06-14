import { useState } from "react";

const MOCK_METRICS = [{ "id": 68, "type": "vertical", "date": "2026-05-31", "value": 38.2, "notes": null }, { "id": 69, "type": "sprint", "date": "2026-05-31", "value": 6.596, "distance_m": 60, "notes": null }, { "id": 70, "type": "sprint", "date": "2026-05-31", "value": 3.474, "distance_m": 30, "notes": null }, { "id": 71, "type": "horizontal", "date": "2026-05-31", "value": 250.2, "notes": null }, { "id": 65, "type": "vertical", "date": "2026-05-29", "value": 39.0, "notes": null }, { "id": 66, "type": "sprint", "date": "2026-05-29", "value": 6.545, "distance_m": 60, "notes": null }, { "id": 67, "type": "horizontal", "date": "2026-05-29", "value": 250.1, "notes": null }, { "id": 62, "type": "vertical", "date": "2026-05-26", "value": 38.4, "notes": null }, { "id": 63, "type": "sprint", "date": "2026-05-26", "value": 6.931, "distance_m": 60, "notes": null }, { "id": 64, "type": "horizontal", "date": "2026-05-26", "value": 244.3, "notes": null }, { "id": 59, "type": "vertical", "date": "2026-05-25", "value": 38.0, "notes": null }, { "id": 60, "type": "sprint", "date": "2026-05-25", "value": 6.759, "distance_m": 60, "notes": null }, { "id": 61, "type": "sprint", "date": "2026-05-25", "value": 3.861, "distance_m": 30, "notes": null }, { "id": 55, "type": "vertical", "date": "2026-05-22", "value": 36.8, "notes": null }, { "id": 56, "type": "sprint", "date": "2026-05-22", "value": 6.861, "distance_m": 60, "notes": null }, { "id": 57, "type": "sprint", "date": "2026-05-22", "value": 3.886, "distance_m": 30, "notes": null }, { "id": 58, "type": "horizontal", "date": "2026-05-22", "value": 241.5, "notes": null }, { "id": 52, "type": "vertical", "date": "2026-05-18", "value": 36.3, "notes": null }, { "id": 53, "type": "sprint", "date": "2026-05-18", "value": 7.096, "distance_m": 60, "notes": null }, { "id": 54, "type": "sprint", "date": "2026-05-18", "value": 3.954, "distance_m": 30, "notes": null }, { "id": 48, "type": "vertical", "date": "2026-05-14", "value": 36.0, "notes": null }, { "id": 49, "type": "sprint", "date": "2026-05-14", "value": 7.147, "distance_m": 60, "notes": null }, { "id": 50, "type": "sprint", "date": "2026-05-14", "value": 3.865, "distance_m": 30, "notes": null }, { "id": 51, "type": "horizontal", "date": "2026-05-14", "value": 240.4, "notes": null }, { "id": 45, "type": "vertical", "date": "2026-05-11", "value": 35.2, "notes": null }, { "id": 46, "type": "sprint", "date": "2026-05-11", "value": 7.462, "distance_m": 60, "notes": null }, { "id": 47, "type": "sprint", "date": "2026-05-11", "value": 3.927, "distance_m": 30, "notes": null }, { "id": 42, "type": "vertical", "date": "2026-05-09", "value": 36.2, "notes": null }, { "id": 43, "type": "sprint", "date": "2026-05-09", "value": 7.168, "distance_m": 60, "notes": null }, { "id": 44, "type": "sprint", "date": "2026-05-09", "value": 4.169, "distance_m": 30, "notes": null }, { "id": 39, "type": "vertical", "date": "2026-05-07", "value": 35.7, "notes": null }, { "id": 40, "type": "sprint", "date": "2026-05-07", "value": 7.428, "distance_m": 60, "notes": null }, { "id": 41, "type": "sprint", "date": "2026-05-07", "value": 3.979, "distance_m": 30, "notes": null }, { "id": 36, "type": "vertical", "date": "2026-05-04", "value": 34.4, "notes": null }, { "id": 37, "type": "sprint", "date": "2026-05-04", "value": 7.357, "distance_m": 60, "notes": null }, { "id": 38, "type": "horizontal", "date": "2026-05-04", "value": 238.3, "notes": null }, { "id": 34, "type": "vertical", "date": "2026-05-01", "value": 36.0, "notes": null }, { "id": 35, "type": "sprint", "date": "2026-05-01", "value": 7.56, "distance_m": 60, "notes": null }, { "id": 31, "type": "vertical", "date": "2026-04-28", "value": 33.2, "notes": null }, { "id": 32, "type": "sprint", "date": "2026-04-28", "value": 7.622, "distance_m": 60, "notes": null }, { "id": 33, "type": "horizontal", "date": "2026-04-28", "value": 233.3, "notes": null }, { "id": 27, "type": "vertical", "date": "2026-04-23", "value": 34.5, "notes": null }, { "id": 28, "type": "sprint", "date": "2026-04-23", "value": 7.718, "distance_m": 60, "notes": null }, { "id": 29, "type": "sprint", "date": "2026-04-23", "value": 4.221, "distance_m": 30, "notes": null }, { "id": 30, "type": "horizontal", "date": "2026-04-23", "value": 231.7, "notes": null }, { "id": 24, "type": "vertical", "date": "2026-04-22", "value": 33.6, "notes": null }, { "id": 25, "type": "sprint", "date": "2026-04-22", "value": 7.619, "distance_m": 60, "notes": null }, { "id": 26, "type": "sprint", "date": "2026-04-22", "value": 4.249, "distance_m": 30, "notes": null }, { "id": 22, "type": "vertical", "date": "2026-04-21", "value": 33.2, "notes": null }, { "id": 23, "type": "sprint", "date": "2026-04-21", "value": 7.907, "distance_m": 60, "notes": null }, { "id": 18, "type": "vertical", "date": "2026-04-18", "value": 34.4, "notes": null }, { "id": 19, "type": "sprint", "date": "2026-04-18", "value": 7.776, "distance_m": 60, "notes": null }, { "id": 20, "type": "sprint", "date": "2026-04-18", "value": 4.599, "distance_m": 30, "notes": null }, { "id": 21, "type": "horizontal", "date": "2026-04-18", "value": 231.9, "notes": null }, { "id": 14, "type": "vertical", "date": "2026-04-15", "value": 31.8, "notes": null }, { "id": 15, "type": "sprint", "date": "2026-04-15", "value": 7.964, "distance_m": 60, "notes": null }, { "id": 16, "type": "sprint", "date": "2026-04-15", "value": 4.592, "distance_m": 30, "notes": null }, { "id": 17, "type": "horizontal", "date": "2026-04-15", "value": 228.6, "notes": null }, { "id": 12, "type": "vertical", "date": "2026-04-14", "value": 31.0, "notes": null }, { "id": 13, "type": "sprint", "date": "2026-04-14", "value": 7.982, "distance_m": 60, "notes": null }, { "id": 8, "type": "vertical", "date": "2026-04-13", "value": 32.6, "notes": null }, { "id": 9, "type": "sprint", "date": "2026-04-13", "value": 7.98, "distance_m": 60, "notes": null }, { "id": 10, "type": "sprint", "date": "2026-04-13", "value": 4.583, "distance_m": 30, "notes": null }, { "id": 11, "type": "horizontal", "date": "2026-04-13", "value": 227.7, "notes": null }, { "id": 5, "type": "vertical", "date": "2026-04-06", "value": 30.8, "notes": null }, { "id": 6, "type": "sprint", "date": "2026-04-06", "value": 8.012, "distance_m": 60, "notes": null }, { "id": 7, "type": "horizontal", "date": "2026-04-06", "value": 217.3, "notes": null }, { "id": 1, "type": "vertical", "date": "2026-04-01", "value": 30.3, "notes": null }, { "id": 2, "type": "sprint", "date": "2026-04-01", "value": 8.089, "distance_m": 60, "notes": null }, { "id": 3, "type": "sprint", "date": "2026-04-01", "value": 4.853, "distance_m": 30, "notes": null }, { "id": 4, "type": "horizontal", "date": "2026-04-01", "value": 217.9, "notes": null }];

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
        const row = [metric.date, TYPE_LABELS[metric.type], formatValue(metric), (metric.notes || "").replace(/,/g, ";")];
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
    const [page, setPage] = useState(1);
    const metrics = MOCK_METRICS;

    const totalPages = Math.max(1, Math.ceil(metrics.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageMetrics = metrics.slice(startIndex, startIndex + PAGE_SIZE);

    return (
        <div className="max-w-4xl mx-auto p-6 mt-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">History</h1>
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full font-medium">Demo mode</span>
                </div>
                <button onClick={() => downloadCsv(metrics)} className="bg-blue-600 text-white rounded px-4 py-2 text-sm">
                    Export CSV
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-left">
                        <tr>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Type</th>
                            <th className="px-4 py-2">Value</th>
                            <th className="px-4 py-2">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageMetrics.map((metric) => (
                            <tr key={`${metric.type}-${metric.id}`} className="border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                                <td className="px-4 py-2">{metric.date}</td>
                                <td className="px-4 py-2">{TYPE_LABELS[metric.type]}</td>
                                <td className="px-4 py-2">{formatValue(metric)}</td>
                                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{metric.notes || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="px-3 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50">
                        Previous
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50">
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

export default History;