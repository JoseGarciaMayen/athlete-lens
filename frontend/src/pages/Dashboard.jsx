import { useState, useEffect } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const MOCK_DATA = { "vertical_jump": [{ "date": "2026-04-01", "value": 30.3 }, { "date": "2026-04-06", "value": 30.8 }, { "date": "2026-04-13", "value": 32.6 }, { "date": "2026-04-14", "value": 31.0 }, { "date": "2026-04-15", "value": 31.8 }, { "date": "2026-04-18", "value": 34.4 }, { "date": "2026-04-21", "value": 33.2 }, { "date": "2026-04-22", "value": 33.6 }, { "date": "2026-04-23", "value": 34.5 }, { "date": "2026-04-28", "value": 33.2 }, { "date": "2026-05-01", "value": 36.0 }, { "date": "2026-05-04", "value": 34.4 }, { "date": "2026-05-07", "value": 35.7 }, { "date": "2026-05-09", "value": 36.2 }, { "date": "2026-05-11", "value": 35.2 }, { "date": "2026-05-14", "value": 36.0 }, { "date": "2026-05-18", "value": 36.3 }, { "date": "2026-05-22", "value": 36.8 }, { "date": "2026-05-25", "value": 38.0 }, { "date": "2026-05-26", "value": 38.4 }, { "date": "2026-05-29", "value": 39.0 }, { "date": "2026-05-31", "value": 38.2 }], "sprint_30m": [{ "date": "2026-04-01", "value": 4.853 }, { "date": "2026-04-13", "value": 4.583 }, { "date": "2026-04-15", "value": 4.592 }, { "date": "2026-04-18", "value": 4.599 }, { "date": "2026-04-22", "value": 4.249 }, { "date": "2026-04-23", "value": 4.221 }, { "date": "2026-05-07", "value": 3.979 }, { "date": "2026-05-09", "value": 4.169 }, { "date": "2026-05-11", "value": 3.927 }, { "date": "2026-05-14", "value": 3.865 }, { "date": "2026-05-18", "value": 3.954 }, { "date": "2026-05-22", "value": 3.886 }, { "date": "2026-05-25", "value": 3.861 }, { "date": "2026-05-31", "value": 3.474 }], "sprint_60m": [{ "date": "2026-04-01", "value": 8.089 }, { "date": "2026-04-06", "value": 8.012 }, { "date": "2026-04-13", "value": 7.98 }, { "date": "2026-04-14", "value": 7.982 }, { "date": "2026-04-15", "value": 7.964 }, { "date": "2026-04-18", "value": 7.776 }, { "date": "2026-04-21", "value": 7.907 }, { "date": "2026-04-22", "value": 7.619 }, { "date": "2026-04-23", "value": 7.718 }, { "date": "2026-04-28", "value": 7.622 }, { "date": "2026-05-01", "value": 7.56 }, { "date": "2026-05-04", "value": 7.357 }, { "date": "2026-05-07", "value": 7.428 }, { "date": "2026-05-09", "value": 7.168 }, { "date": "2026-05-11", "value": 7.462 }, { "date": "2026-05-14", "value": 7.147 }, { "date": "2026-05-18", "value": 7.096 }, { "date": "2026-05-22", "value": 6.861 }, { "date": "2026-05-25", "value": 6.759 }, { "date": "2026-05-26", "value": 6.931 }, { "date": "2026-05-29", "value": 6.545 }, { "date": "2026-05-31", "value": 6.596 }], "horizontal_jump": [{ "date": "2026-04-01", "value": 217.9 }, { "date": "2026-04-06", "value": 217.3 }, { "date": "2026-04-13", "value": 227.7 }, { "date": "2026-04-15", "value": 228.6 }, { "date": "2026-04-18", "value": 231.9 }, { "date": "2026-04-23", "value": 231.7 }, { "date": "2026-04-28", "value": 233.3 }, { "date": "2026-05-04", "value": 238.3 }, { "date": "2026-05-14", "value": 240.4 }, { "date": "2026-05-22", "value": 241.5 }, { "date": "2026-05-26", "value": 244.3 }, { "date": "2026-05-29", "value": 250.1 }, { "date": "2026-05-31", "value": 250.2 }] };

const MetricChart = ({ title, data, color, unit, decimals = 2, isDark }) => {
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const tickColor = isDark ? '#9ca3af' : '#6b7280';
    const tooltipBg = isDark ? '#1f2937' : '#ffffff';
    const tooltipBorder = isDark ? '#374151' : '#e5e7eb';
    const tooltipLabelColor = isDark ? '#f3f4f6' : '#374151';

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{title}</h3>
            {data && data.length > 0 ? (
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 30, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
                            <Tooltip
                                formatter={(value) => {
                                    const formattedValue = typeof value === "number" ? value.toFixed(decimals) : value;
                                    return [`${formattedValue} ${unit}`, title];
                                }}
                                labelStyle={{ color: tooltipLabelColor, fontWeight: "bold" }}
                                contentStyle={{ borderRadius: "8px", border: `1px solid ${tooltipBorder}`, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: tooltipBg }}
                            />
                            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500">
                    No data available yet
                </div>
            )}
        </div>
    );
};

function Dashboard() {
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains("dark"));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    return (
        <div className="max-w-6xl mx-auto p-6 mt-8">
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Performance Dashboard</h2>
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full font-medium">Demo mode — sample data</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricChart title="Vertical Jump (cm)" data={MOCK_DATA.vertical_jump} color="#2563eb" unit="cm" decimals={1} isDark={isDark} />
                <MetricChart title="Horizontal Jump (cm)" data={MOCK_DATA.horizontal_jump} color="#16a34a" unit="cm" decimals={1} isDark={isDark} />
                <MetricChart title="30m Sprint (s)" data={MOCK_DATA.sprint_30m} color="#ea580c" unit="s" decimals={3} isDark={isDark} />
                <MetricChart title="60m Sprint (s)" data={MOCK_DATA.sprint_60m} color="#dc2626" unit="s" decimals={3} isDark={isDark} />
            </div>
        </div>
    );
}

export default Dashboard;