import { useEffect, useState } from 'react'
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea,
} from 'recharts'
import { io } from 'socket.io-client'
import axios from 'axios'
import { ACCESS_TOKEN } from '../constants'
import '../styles/DashboardBody.css'

// Web socket address
const socket = io(import.meta.env.WEBSOCKET_URL)

const GlucoseChart = () => {
    const [data, setData] = useState([])
    const [timeScale, setTimeScale] = useState(4)
    const [glucoseMin, setGlucoseMin] = useState(4)
    const [glucoseMax, setGlucoseMax] = useState(10)

    // TO-DO: Fix trend data not being processed by front-end correctly
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem(ACCESS_TOKEN)
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/glucose-readings?timespan=${timeScale}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                )
                const formattedData = res.data.map((item) => {
                    const [hours, minutes] = item.timestamp
                        .split(':')
                        .map(Number) // Convert "HH:MM" to numbers
                    const timeInMinutes = hours * 60 + minutes // Convert to numeric value
                    return {
                        timestamp: timeInMinutes,
                        glucose: parseFloat(item.glucose).toFixed(1),
                        trend: item.trend && typeof item.trend === "string"
                                ? item.trend
                                : "NODATA",
                        basal_injected: item.basal_injected || 0,
                        bolus_injected: item.bolus_injected || 0,
                    }
                })

                console.log(formattedData)
                setData(formattedData)
            } catch (error) {
                console.error('Error fetching glucose readings:', error)
            }
        }

        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem(ACCESS_TOKEN)
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/user-profile/`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                )
                setGlucoseMin(res.data.glucose_min)
                setGlucoseMax(res.data.glucose_max)
            } catch (error) {
                console.error('Error fetching user profile:', error)
            }
        }

        fetchData()
        fetchUserProfile()
    }, [timeScale])

    // Listen for live glucose readings from web socket
    useEffect(() => {
        const handleNewReading = (message) => {
            // Check the structure of the received message
            console.log('WebSocket Received:', message)

            const formattedMessage = {
                timestamp: message.timestamp,
                glucose: message.glucose,
                trend: message.trend ? message.trend : "NODATA",
                bolus_injected: message.bolus_injected,
                basal_injected: message.basal_injected
            }

            setData((prevData) => [...prevData, formattedMessage])
        }

        socket.on('send_glucose_reading', handleNewReading)

        return () => {
            socket.off('send_glucose_reading', handleNewReading)
        }
    }, [])

    // Compute starting time
    const nowInMinutes = new Date().getHours() * 60 + new Date().getMinutes()
    const startTime = Math.max(0, nowInMinutes - timeScale * 60)

    return (
        <div className="body">
            {/* Current glucose reading */}
            <div className="current-glucose">
                <h1>
                    {data[data.length - 1]?.glucose
                        ? `${parseFloat(data[data.length - 1].glucose).toFixed(1)} mmol/L`
                        : ''}{' '}
                    {data[data.length - 1]?.trend !== 'NODATA'    // Do not display trend error when no data 
                        ? data[data.length - 1]?.trend
                        : ''}
                </h1>
            </div>

            {/* Time scale selector */}
            <div>
                {[4, 8, 12, 24].map((hrs) => (
                    <button key={hrs} onClick={() => setTimeScale(hrs)}>
                        {hrs}hr
                    </button>
                ))}
            </div>

            {/* Chart */}
            {data.length > 0 ? (
                <ResponsiveContainer
                    width="100%"
                    height={300}
                    key={data.length}
                >
                    <ScatterChart data={data}>
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={[startTime, nowInMinutes + 5]}
                            tickFormatter={(minutes) => {
                                if (isNaN(minutes)) return '' // Prevent NaN display
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
                        {/* Below min */}
                        <ReferenceArea
                            y1={2}
                            y2={glucoseMin}
                            fill="#B53A3A"
                            fillOpacity={0.75}
                        />
                        {/* Normal range */}
                        <ReferenceArea
                            y1={glucoseMin}
                            y2={glucoseMax}
                            fill="#3AA246"
                            fillOpacity={0.75}
                        />
                        {/* Above max */}
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
                <h1>Loading glucose data...</h1> // Fallback message instead of crashing
            )}
        </div>
    )
}

export default GlucoseChart
