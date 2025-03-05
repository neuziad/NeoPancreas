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

const GlucoseChart = ({ data, glucoseMin, glucoseMax }) => {
    const nowInMinutes = new Date().getHours() * 60 + new Date().getMinutes()
    const startTime = nowInMinutes - 24 * 60 // Show past 24 hours

    return (
        <div className="body">
            {/* Current glucose reading */}
            <div className="current-glucose">
                <h1>
                    {data[data.length - 1]?.glucose
                        ? `${parseFloat(data[data.length - 1].glucose).toFixed(1)} mmol/L`
                        : ''}{' '}
                    {data[data.length - 1]?.trend !== 'NODATA'
                        ? data[data.length - 1]?.trend
                        : ''}
                </h1>
            </div>

            {/* Chart */}
            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={data}>
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={[startTime, nowInMinutes + 5]}
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
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 14 }}
                        />
                        <Tooltip
                            formatter={(value, name) => {
                                if (name === 'timestamp') {
                                    const hh = Math.floor(value / 60)
                                        .toString()
                                        .padStart(2, '0')
                                    const mm = (value % 60)
                                        .toString()
                                        .padStart(2, '0')
                                    return `${hh}:${mm}`
                                }
                                return value
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
                        data for this range
                    </p>
                </div>
            )}
        </div>
    )
}

GlucoseChart.propTypes = {
    data: PropTypes.array.isRequired,
    glucoseMin: PropTypes.number.isRequired,
    glucoseMax: PropTypes.number.isRequired,
}

export default GlucoseChart
