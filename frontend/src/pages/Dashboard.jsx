import { useState, useEffect } from 'react'
import axios from 'axios'
import TimeInRangeBar from '../components/TimeInRangeBar'
import GlucoseChart from '../components/GlucoseChart'
import { ACCESS_TOKEN } from '../constants'
import '../styles/Dashboard.css'
import BasalAndBolus from '../components/BasalAndBolus'
import {
    toggleSimulation,
    getSimulationStatus,
} from '../components/Simulations'

const Dashboard = () => {
    const [userProfile, setUserProfile] = useState(null)
    const [timeInRangeData, setTimeInRangeData] = useState([])
    const [chartData, setChartData] = useState([])
    const [selectedChartTimespan, setSelectedChartTimespan] = useState(4)
    const [isRunning, setIsRunning] = useState(false)
    const [loading, setLoading] = useState(false)

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
                    glucoseTarget: parseFloat(res.data.glucose_target),
                    basalRate: parseFloat(res.data.basal_rate),
                    emEnabled: res.data.em_enabled,
                    carbRatio: parseFloat(res.data.carb_ratio),
                    correctionFactor: parseFloat(res.data.correction_factor),
                    iob: parseFloat(res.data.iob),
                    bolusMax: parseFloat(res.data.bolus_max),
                    diabeticProfile: res.data.diabetic_profile,
                    maxIOB: parseFloat(res.data.max_iob),
                    insulinDuration: parseInt(res.data.insulin_duration),
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
                    trend: item.trend || 'NODATA',
                    bolus_injected: item.bolus_injected || 0,
                    basal_injected: item.basal_injected || 0,
                }))
                console.log(formattedData)
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

    const handleClick = async () => {
        if (!userProfile) return
        setLoading(true)

        await toggleSimulation()
        const status = await getSimulationStatus() // Refresh status after toggle
        setIsRunning(status)

        setLoading(false)
    }

    return (
        <div>
            <h1>Dashboard</h1>

            <div className="btn-group">
                <button
                    onClick={handleClick}
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading
                        ? 'Processing...'
                        : isRunning
                          ? 'Stop Simulation'
                          : 'Start Simulation'}
                </button>
            </div>

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
                timeScale={selectedChartTimespan}
            />

            <BasalAndBolus
                basalrate={userProfile.basalRate}
                emEnabled={userProfile.emEnabled}
                iob={userProfile.iob}
            />
        </div>
    )
}

export default Dashboard
