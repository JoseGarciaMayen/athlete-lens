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

const MetricChart = ({ title, data, color, unit, decimals = 2 }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{title}</h3>
        {data && data.length > 0 ? (
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            formatter={(value) => {
                                const formattedValue = typeof value === 'number' ? value.toFixed(decimals) : value;
                                return [`${formattedValue} ${unit}`, title];
                            }}
                            labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-md border border-dashed border-gray-300 text-gray-400">
                No data available yet
            </div>
        )}
    </div>
);

function Dashboard() {
    const [data, setData] = useState({
        vertical_jump: [],
        sprint_30m: [],
        sprint_60m: [],
        horizontal_jump: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                <p className="text-gray-500 animate-pulse">Loading athlete data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl mx-auto p-6 mt-8">
                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                    Error: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 mt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Performance Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricChart
                    title="Vertical Jump (cm)"
                    data={data.vertical_jump}
                    color="#2563eb"
                    unit="cm"
                />
                <MetricChart
                    title="Horizontal Jump (cm)"
                    data={data.horizontal_jump}
                    color="#16a34a"
                    unit="cm"
                />
                <MetricChart
                    title="30m Sprint (s)"
                    data={data.sprint_30m}
                    color="#ea580c"
                    unit="s"
                    decimals={3}
                />
                <MetricChart
                    title="60m Sprint (s)"
                    data={data.sprint_60m}
                    color="#dc2626"
                    unit="s"
                    decimals={3}
                />
            </div>
        </div>
    );
}

export default Dashboard;