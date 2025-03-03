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

// Web socket address
const socket = io(import.meta.env.WEBSOCKET_URL)

const GlucoseChart = () => {
    const [data, setData] = useState([])
    const [timeScale, setTimeScale] = useState(4)
    const [glucoseMin, setGlucoseMin] = useState(4)
    const [glucoseMax, setGlucoseMax] = useState(10)

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
                    return { timestamp: timeInMinutes, glucose: item.glucose }
                })
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

    // Listen for live glucose readings from WebSocket
    useEffect(() => {
        const handleNewReading = (message) => {
            // Assume message has the same structure as { timestamp, glucose }
            setData((prevData) => [...prevData, message])
        }

        socket.on('send_glucose_reading', handleNewReading)

        // Cleanup on unmount
        return () => {
            socket.off('send_glucose_reading', handleNewReading)
        }
    }, [])

    return (
        <div>
            {/* Time scale selector */}
            <div>
                {[4, 8].map((hrs) => (
                    <button key={hrs} onClick={() => setTimeScale(hrs)}>
                        {hrs}hr
                    </button>
                ))}
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={300} key={data.length}>
                <ScatterChart data={data}>
                    <XAxis
                        dataKey="timestamp"
                        type="number"
                        domain={['auto', 'auto']}
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
                    />
                    <YAxis domain={[2, 22]} />
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
                    />
                    {/* Background Coloring */}
                    <ReferenceArea
                        y1={2}
                        y2={glucoseMin}
                        fill="#B53A3A"
                        fillOpacity={0.75}
                    />
                    {/* Below min */}
                    <ReferenceArea
                        y1={glucoseMin}
                        y2={glucoseMax}
                        fill="#3AA246"
                        fillOpacity={0.75}
                    />
                    {/* Normal range */}
                    <ReferenceArea
                        y1={glucoseMax}
                        y2={22}
                        fill="#CBA63F"
                        fillOpacity={0.75}
                    />
                    {/* Above max */}
                    <Scatter dataKey="glucose" fill="#000000" />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    )
}

export default GlucoseChart
