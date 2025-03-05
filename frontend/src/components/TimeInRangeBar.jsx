import { useEffect, useState } from 'react'
import axios from 'axios'
import { ACCESS_TOKEN } from '../constants'

const TimeInRangeBar = () => {
    const [data, setData] = useState([])
    const [glucoseMin, setGlucoseMin] = useState(4)
    const [glucoseMax, setGlucoseMax] = useState(10)

    // Fetch glucose data
    useEffect(() => {
        // Static timeScale set to 24 hours
        const timeScale = 24

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
                        trend:
                            item.trend && typeof item.trend === 'string'
                                ? item.trend
                                : 'NODATA',
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
                setGlucoseMin(parseFloat(res.data.glucose_min))
                setGlucoseMax(parseFloat(res.data.glucose_max))
            } catch (error) {
                console.error('Error fetching user profile:', error)
            }
        }

        fetchData()
        fetchUserProfile()
    }, [])

    if (glucoseMin === null || glucoseMax === null) {
        return <div>Loading...</div>
    }

    // Calculate the number of entries for each category
    const totalEntries = data.length
    const lowCount = data.filter((entry) => entry.glucose < glucoseMin).length
    const inRangeCount = data.filter(
        (entry) => entry.glucose >= glucoseMin && entry.glucose <= glucoseMax
    ).length
    const highCount = data.filter((entry) => entry.glucose > glucoseMax).length

    // Calculate percentages (if no data, set to 0)
    const lowPercentage = totalEntries ? (lowCount / totalEntries) * 100 : 0
    const inRangePercentage = totalEntries
        ? (inRangeCount / totalEntries) * 100
        : 0
    const highPercentage = totalEntries ? (highCount / totalEntries) * 100 : 0

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column',
            }}
        >
            <div
                style={{
                    width: '35%',
                    height: '30px',
                    borderRadius: '8px',
                    border: '3px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    fontFamily: 'Roboto',
                    textAlign: 'center',
                }}
            >
                {/* Red segment for low glucose */}
                <div
                    style={{
                        width: `${lowPercentage}%`,
                        backgroundColor: '#B53A3A',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'white',
                        fontSize: '25px',
                        borderRadius: '5px',
                    }}
                >
                    {lowPercentage > 0 ? `${lowPercentage.toFixed(0)}%` : ''}
                </div>
                {/* Green segment for in-range glucose */}
                <div
                    style={{
                        width: `${inRangePercentage}%`,
                        backgroundColor: '#3AA246',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'white',
                        fontSize: '25px',
                        fontWeight: 'bold',
                        borderRadius: '5px',
                    }}
                >
                    {inRangePercentage > 0 ? `${inRangePercentage.toFixed(0)}%` : ''}
                </div>
                {/* Yellow segment for high glucose */}
                <div
                    style={{
                        width: `${highPercentage}%`,
                        backgroundColor: '#CBA63F',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'white',
                        fontSize: '25px',
                        borderRadius: '5px',
                    }}
                >
                    {highPercentage > 0 ? `${highPercentage.toFixed(0)}%` : ''}
                </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '10px', fontFamily: 'Roboto' }}>
                Time in range (past 24 hours)
            </div>
        </div>
    )
}

export default TimeInRangeBar
