import { useEffect, useState } from 'react'
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
import axios from 'axios'
import { ACCESS_TOKEN } from '../constants'

const WEBSOCKET_URL =
    import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000/ws/glucose/'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const GlucoseChart = ({ glucoseMin, glucoseMax, timeScale }) => {
    const [data, setData] = useState([])
    const token = localStorage.getItem(ACCESS_TOKEN)

    const nowInMinutes = new Date().getHours() * 60 + new Date().getMinutes()
    const startTime = Math.max(0, nowInMinutes - timeScale * 60)

    // Fetch initial glucose data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(
                    `${API_URL}/api/glucose-readings?timespan=${timeScale}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                )

                const formattedData = res.data.map((item) => ({
                    timestamp: convertTimeToMinutes(item.timestamp),
                    glucose: parseFloat(item.glucose),
                    trend: item.trend,
                    bolus_injected: parseFloat(item.bolus_injected),
                    basal_injected: parseFloat(item.basal_injected),
                }))

                setData(formattedData)
            } catch (error) {
                console.error('❌ Error fetching glucose readings:', error)
            }
        }

        fetchData()
    }, [timeScale, token])

    // Handle WebSocket updates
    useEffect(() => {
        const socket = new WebSocket(WEBSOCKET_URL)

        socket.onopen = () => {
            console.log('✅ WebSocket Connected')
        }

        socket.onmessage = (event) => {
            const newReading = JSON.parse(event.data)
            console.log('📡 WebSocket Data:', newReading)

            const formattedReading = {
                timestamp: convertTimeToMinutes(newReading.timestamp),
                glucose: parseFloat(newReading.glucose),
                trend: newReading.trend,
                bolus_injected: parseFloat(newReading.bolus_injected),
                basal_injected: parseFloat(newReading.basal_injected),
            }

            setData((prevData) => [...prevData, formattedReading]) // Append new reading
        }

        socket.onerror = (error) => {
            console.error('❌ WebSocket Error:', error)
        }

        return () => socket.close() // Cleanup WebSocket on unmount
    }, [])

    // Helper function: Convert "HH:MM" string to minutes
    const convertTimeToMinutes = (timeString) => {
        const [hh, mm] = timeString.split(':').map(Number)
        return hh * 60 + mm
    }

    return (
        <div className="body">
            {/* Current glucose reading */}
            <div className="current-glucose">
                <h1>
                    {data.length > 0
                        ? `${parseFloat(data[data.length - 1].glucose).toFixed(1)} mmol/L`
                        : ''}{' '}
                    {data.length > 0 && data[data.length - 1].trend !== 'NODATA'
                        ? data[data.length - 1].trend
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
                                if (name === 'glucose')
                                    return value ? value.toFixed(1) : ''
                                if (name === 'trend')
                                    return value === 'NODATA' ? (
                                        <i>No trend data available</i>
                                    ) : (
                                        value
                                    )
                                if (name === 'bolus_injected')
                                    return value ? `+${value.toFixed(1)}U` : ''
                                if (name === 'basal_injected')
                                    return value
                                        ? `+${value.toFixed(1)}U/hr`
                                        : ''
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
                        data for this range.
                    </p>
                </div>
            )}
        </div>
    )
}

GlucoseChart.propTypes = {
    glucoseMin: PropTypes.number.isRequired,
    glucoseMax: PropTypes.number.isRequired,
    timeScale: PropTypes.number.isRequired,
}

export default GlucoseChart
