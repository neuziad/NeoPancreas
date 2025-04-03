import PropTypes from "prop-types"
import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ReferenceArea,
} from "recharts"

const GlucoseChart = ({ chartData, glucoseMin, glucoseMax, timeScale }) => {
    const nowInMinutes = new Date().getHours() * 60 + new Date().getMinutes()
    const startTime = Math.max(0, nowInMinutes - timeScale * 60)
    return (
        // Addition of min-height to reduce large layout shifts
        <div
            data-testid="scatter-chart"
            style={{ minHeight: "300px" }}
            className="w-screen relative"
        >
            {/* Chart */}
            {chartData.length > 0 ? (
                <ResponsiveContainer width="98%" height={440}>
                    <ScatterChart
                        data={chartData}
                        margin={{ top: 10, bottom: 10 }}
                    >
                        {/* Background coloring */}
                        <ReferenceArea
                            y1={2}
                            y2={glucoseMin}
                            fill="#B53A3A"
                            fillOpacity={0.75}
                        />
                        <ReferenceArea
                            y1={glucoseMin}
                            y2={glucoseMax}
                            fill="#3AA246"
                            fillOpacity={0.75}
                        />
                        <ReferenceArea
                            y1={glucoseMax}
                            y2={22}
                            fill="#CBA63F"
                            fillOpacity={0.75}
                        />

                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={[
                                startTime,
                                timeScale === 24
                                    ? nowInMinutes
                                    : nowInMinutes + 5,
                            ]}
                            tickFormatter={(minutes) => {
                                if (isNaN(minutes)) return ""
                                const hh = Math.floor(minutes / 60)
                                    .toString()
                                    .padStart(2, "0")
                                const mm = (minutes % 60)
                                    .toString()
                                    .padStart(2, "0")
                                return `${hh}:${mm}`
                            }}
                            tick={{
                                fontSize: 18,
                                fill: "#222",
                                fontWeight: "bold",
                            }}
                        />
                        <YAxis
                            domain={[2, 22]}
                            mirror={true} // Ensures it mirrors
                            tick={{
                                fontSize: 16,
                                fill: "#222",
                                fontWeight: "bold",
                                visibility: "visible",
                                zIndex: 1000,
                            }}
                            tickLine={{ stroke: "#222", zIndex: 1000 }}
                            axisLine={{ stroke: "#222", zIndex: 1000 }}
                        />
                        <Scatter dataKey="glucose" fill="#000000" />
                    </ScatterChart>
                </ResponsiveContainer>
            ) : (
                <div className="text-center mt-4">
                    <h1>Loading data if available...</h1>
                </div>
            )}
        </div>
    )
}

GlucoseChart.propTypes = {
    chartData: PropTypes.arrayOf(
        PropTypes.shape({
            timestamp: PropTypes.number.isRequired,
            glucose: PropTypes.number.isRequired,
            trend: PropTypes.string,
            bolus_injected: PropTypes.number,
            basal_injected: PropTypes.number,
        })
    ).isRequired,
    glucoseMin: PropTypes.number.isRequired,
    glucoseMax: PropTypes.number.isRequired,
    timeScale: PropTypes.number.isRequired,
}

export default GlucoseChart
