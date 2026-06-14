import { useState, useEffect } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

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
                        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: tickColor }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: tickColor }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                formatter={(value) => {
                                    const formattedValue = typeof value === 'number' ? value.toFixed(decimals) : value;
                                    return [`${formattedValue} ${unit}`, title];
                                }}
                                labelStyle={{ color: tooltipLabelColor, fontWeight: 'bold' }}
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: `1px solid ${tooltipBorder}`,
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    backgroundColor: tooltipBg,
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={3}
                                dot={{ r: 4, strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                            />
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
    const [data, setData] = useState({
        vertical_jump: [],
        sprint_30m: [],
        sprint_60m: [],
        horizontal_jump: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard`);
                if (!response.ok) {
                    throw new Error("Failed to fetch dashboard data");
                }
                const result = await response.json();

                const formattedData = result;   // sprint_30m y sprint_60m ya vienen en segundos
                setData(formattedData);

                setData(formattedData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-6 mt-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading athlete data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl mx-auto p-6 mt-8">
                <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                    Error: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 mt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Performance Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricChart
                    title="Vertical Jump (cm)"
                    data={data.vertical_jump}
                    color="#2563eb"
                    unit="cm"
                    isDark={isDark}
                />
                <MetricChart
                    title="Horizontal Jump (cm)"
                    data={data.horizontal_jump}
                    color="#16a34a"
                    unit="cm"
                    isDark={isDark}
                />
                <MetricChart
                    title="30m Sprint (s)"
                    data={data.sprint_30m}
                    color="#ea580c"
                    unit="s"
                    decimals={3}
                    isDark={isDark}
                />
                <MetricChart
                    title="60m Sprint (s)"
                    data={data.sprint_60m}
                    color="#dc2626"
                    unit="s"
                    decimals={3}
                    isDark={isDark}
                />
            </div>
        </div>
    );
}

export default Dashboard;
