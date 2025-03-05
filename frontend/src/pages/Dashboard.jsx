import { useState, useEffect } from 'react'
import axios from 'axios'
import TimeInRangeBar from '../components/TimeInRangeBar'
import GlucoseChart from '../components/GlucoseChart'
import { ACCESS_TOKEN } from '../constants'
import '../styles/Dashboard.css'
import BasalAndBolus from '../components/BasalAndBolus'

const Dashboard = () => {
    const [userProfile, setUserProfile] = useState(null)
    const [timeInRangeData, setTimeInRangeData] = useState([])
    const [chartData, setChartData] = useState([])
    const [selectedChartTimespan, setSelectedChartTimespan] = useState(4)

    useEffect(() => {
        const token = localStorage.getItem(ACCESS_TOKEN)

        // Fetch user profile (common for both components)
        const fetchUserProfile = async () => {
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/user-profile/`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                setUserProfile({
                    glucoseMin: parseFloat(res.data.glucose_min),
                    glucoseMax: parseFloat(res.data.glucose_max),
                    basalrate: parseFloat(res.data.basalrate), // TO-DO: Fix basal rate not printing out properly (NaN)
                    emEnabled: res.data.em_enabled,
                    iob: parseFloat(res.data.iob),
                })
            } catch (error) {
                console.error('❌ Error fetching user profile:', error)
            }
        }

        fetchUserProfile()
    }, [])

    useEffect(() => {
        const token = localStorage.getItem(ACCESS_TOKEN)
        const fetchDataForTimeInRange = async () => {
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/glucose-readings?timespan=24`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                const formattedData = res.data.map((item) => ({
                    timestamp:
                        parseInt(item.timestamp.split(':')[0]) * 60 +
                        parseInt(item.timestamp.split(':')[1]),
                    glucose: parseFloat(item.glucose),
                }))
                setTimeInRangeData(formattedData)
            } catch (error) {
                console.error('❌ Error fetching 24h glucose readings:', error)
            }
        }

        fetchDataForTimeInRange()
    }, [])

    useEffect(() => {
        const token = localStorage.getItem(ACCESS_TOKEN)
        const fetchDataForChart = async () => {
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/glucose-readings?timespan=${selectedChartTimespan}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                const formattedData = res.data.map((item) => ({
                    timestamp:
                        parseInt(item.timestamp.split(':')[0]) * 60 +
                        parseInt(item.timestamp.split(':')[1]),
                    glucose: parseFloat(item.glucose),
                    trend:
                        item.trend && typeof item.trend === 'string'
                            ? item.trend
                            : 'NODATA',
                }))
                setChartData(formattedData)
            } catch (error) {
                console.error(
                    `❌ Error fetching ${selectedChartTimespan}h glucose readings:`,
                    error
                )
            }
        }

        fetchDataForChart()
    }, [selectedChartTimespan])

    if (!userProfile) return <h1>Loading dashboard...</h1>

    return (
        <div>
            <h1>Dashboard</h1>
            <h2>Time in Range (24h)</h2>
            <TimeInRangeBar
                data={timeInRangeData}
                glucoseMin={userProfile.glucoseMin}
                glucoseMax={userProfile.glucoseMax}
            />

            <h2>Glucose Chart</h2>
            <div>
                {[4, 8, 12, 24].map((hrs) => (
                    <button
                        key={hrs}
                        onClick={() => setSelectedChartTimespan(hrs)}
                    >
                        {hrs}hr
                    </button>
                ))}
            </div>
            <GlucoseChart
                data={chartData}
                glucoseMin={userProfile.glucoseMin}
                glucoseMax={userProfile.glucoseMax}
            />

            <BasalAndBolus
                basalrate={userProfile.basalrate}
                emEnabled={userProfile.emEnabled}
                iob={userProfile.iob}
            />
        </div>
    )
}

export default Dashboard
