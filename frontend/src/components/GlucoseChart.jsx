import PropTypes from 'prop-types'
import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceArea,
} from 'recharts'

const GlucoseChart = ({ chartData, glucoseMin, glucoseMax, timeScale }) => {
    const nowInMinutes = new Date().getHours() * 60 + new Date().getMinutes()
    const startTime = Math.max(0, nowInMinutes - timeScale * 60)
    return (
        <div className="body">
            {/* Chart */}
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={440}>
                    <ScatterChart data={chartData} style={{ marginLeft: "-0.5rem"}}>
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
                                if (isNaN(minutes)) return ''
                                const hh = Math.floor(minutes / 60)
                                    .toString()
                                    .padStart(2, '0')
                                const mm = (minutes % 60)
                                    .toString()
                                    .padStart(2, '0')
                                return `${hh}:${mm}`
                            }}
                            tick={{ fontSize: 14 }}
                        />
                        <YAxis
                            domain={[2, 22]}
                            tickLine={true}
                            axisLine={true}
                            tick={{ fontSize: 14 }}
                        />
                        <Tooltip
                            formatter={(value, name) => {
                                if (name === 'glucose') {
                                    return [value.toFixed(1), 'Blood Glucose']
                                } else if (name === 'bolus_injected') {
                                    return [value, 'Bolus Injected']
                                } else if (name === 'basal_injected') {
                                    return [value, 'Basal Injected']
                                }
                                return value
                            }}
                            labelFormatter={(label) => {
                                const hh = Math.floor(label / 60)
                                    .toString()
                                    .padStart(2, '0')
                                const mm = (label % 60)
                                    .toString()
                                    .padStart(2, '0')
                                return `Time: ${hh}:${mm}`
                            }}
                            labelStyle={{ fontSize: 14 }}
                            itemStyle={{ fontSize: 14 }}
                        />

                        {/* Background colouring */}
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

                        <Scatter dataKey="glucose" fill="#000000" />
                    </ScatterChart>
                </ResponsiveContainer>
            ) : (
                <div>
                    <h1>Loading glucose data...</h1>
                    <p>
                        If this takes too long to load, you may not have any
                        data for this range.
                    </p>
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
