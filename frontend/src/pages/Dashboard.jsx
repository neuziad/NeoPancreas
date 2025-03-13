import { useState, useEffect } from "react"
import axios from "axios"
import TimeInRangeBar from "../components/TimeInRangeBar"
import GlucoseChart from "../components/GlucoseChart"
import { ACCESS_TOKEN } from "../constants"
import "../styles/Dashboard.css"
import BasalAndBolus from "../components/BasalAndBolus"
import GlucoseReading from "../components/GlucoseReading"
import {
    toggleSimulation,
    getSimulationStatus,
} from "../components/Simulations"
import { ToggleButton, ToggleButtonGroup } from "@mui/material"

const WEBSOCKET_URL =
    import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:8000/ws/glucose/"

const Dashboard = () => {
    const [userProfile, setUserProfile] = useState(null)
    const [timeInRangeData, setTimeInRangeData] = useState([])
    const [chartData, setChartData] = useState([])
    const [selectedChartTimespan, setSelectedChartTimespan] = useState(4)
    const [isRunning, setIsRunning] = useState(false)
    const [loading, setLoading] = useState(false)
    const [glucoseData, setGlucoseData] = useState([])
    const [currentUser, setCurrentUser] = useState([])

    // Fetch status of simulation
    useEffect(() => {
        const status = getSimulationStatus()
        status.then((res) => setIsRunning(res))
    }, [])

    // API fetching user profile attributes
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem(ACCESS_TOKEN)
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/user-profile/`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
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
                console.error("❌ Error fetching user profile:", error)
            }
        }

        fetchUserProfile()
    }, [])

    // API fetching glucose data for 24h (Time in range bar)
    useEffect(() => {
        const fetchDataForTimeInRange = async () => {
            try {
                const token = localStorage.getItem(ACCESS_TOKEN)
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/glucose-readings?timespan=24`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                )
                const formattedData = res.data.map((item) => ({
                    timestamp:
                        parseInt(item.timestamp.split(":")[0]) * 60 +
                        parseInt(item.timestamp.split(":")[1]),
                    glucose: parseFloat(item.glucose),
                }))
                setTimeInRangeData(formattedData)
                console.log("Initial time in range data:", formattedData)
            } catch (error) {
                console.error("❌ Error fetching 24h glucose readings:", error)
            }
        }

        fetchDataForTimeInRange()
    }, [])

    // API fetching glucose data for the chart
    useEffect(() => {
        const fetchDataForChart = async () => {
            try {
                const token = localStorage.getItem(ACCESS_TOKEN)
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/glucose-readings?timespan=${selectedChartTimespan}`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                )
                const formattedData = res.data.map((item) => ({
                    timestamp:
                        parseInt(item.timestamp.split(":")[0]) * 60 +
                        parseInt(item.timestamp.split(":")[1]),
                    glucose: parseFloat(item.glucose),
                    trend: item.trend || "NODATA",
                    bolus_injected: item.bolus_injected || 0,
                    basal_injected: item.basal_injected || 0,
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

    // Fetch user full name (we must retrieve from User as opposed to UserProfile)
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem(ACCESS_TOKEN)
                const res = await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/user/`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                )
                setCurrentUser(res.data)
            } catch (error) {
                console.error("❌ Error fetching user:", error)
            }
        }

        fetchUser()
    }, [currentUser])

    // WebSocket for real-time updates
    useEffect(() => {
        const socket = new WebSocket(WEBSOCKET_URL)

        socket.onopen = () => console.log("✅ WebSocket Connected")

        socket.onmessage = (event) => {
            const newReading = JSON.parse(event.data)
            console.log("📡 WebSocket Data:", newReading)

            const formattedReading = {
                timestamp: new Date().getHours() * 60 + new Date().getMinutes(),
                glucose: parseFloat(newReading.glucose),
                trend: newReading.trend || "NODATA",
                bolus_injected: newReading.bolus_injected || 0,
                basal_injected: newReading.basal_injected || 0,
            }

            // Append new glucose data (Real-time)
            setGlucoseData((prev) => [...prev, formattedReading])

            // Keep chartData updated (Filter old data)
            setChartData((prev) => {
                const updatedData = [...prev, formattedReading]
                const cutoffTime =
                    new Date().getTime() -
                    selectedChartTimespan * 60 * 60 * 1000
                const filteredData = updatedData.filter(
                    (entry) => entry.timestamp * 60 * 1000 >= cutoffTime
                )
                return filteredData.length > 0 ? filteredData : updatedData
            })

            // Update profile-related attributes
            setUserProfile((prevProfile) => ({
                ...prevProfile,
                glucoseMin: prevProfile.glucose_min
                    ? parseFloat(prevProfile.glucose_min)
                    : prevProfile?.glucoseMin,
                glucoseMax: prevProfile.glucose_max
                    ? parseFloat(prevProfile.glucose_max)
                    : prevProfile?.glucoseMax,
                glucoseTarget: prevProfile.glucose_target
                    ? parseFloat(prevProfile.glucose_target)
                    : prevProfile?.glucoseTarget,
                basalRate: prevProfile.basal_rate
                    ? parseFloat(prevProfile.basal_rate)
                    : prevProfile?.basalRate,
                emEnabled:
                    prevProfile.em_enabled !== undefined
                        ? prevProfile.em_enabled
                        : prevProfile?.emEnabled,
                carbRatio: prevProfile.carb_ratio
                    ? parseFloat(prevProfile.carb_ratio)
                    : prevProfile?.carbRatio,
                correctionFactor: prevProfile.correction_factor
                    ? parseFloat(prevProfile.correction_factor)
                    : prevProfile?.correctionFactor,
                iob: prevProfile.iob
                    ? parseFloat(prevProfile.iob)
                    : prevProfile?.iob,
                bolusMax: prevProfile.bolus_max
                    ? parseFloat(prevProfile.bolus_max)
                    : prevProfile?.bolusMax,
                diabeticProfile: prevProfile.diabetic_profile
                    ? prevProfile.diabetic_profile
                    : prevProfile?.diabeticProfile,
                maxIOB: prevProfile.max_iob
                    ? parseFloat(prevProfile.max_iob)
                    : prevProfile?.maxIOB,
                insulinDuration: prevProfile.insulin_duration
                    ? parseInt(prevProfile.insulin_duration)
                    : prevProfile?.insulinDuration,
            }))

            // Update data for time in range bar
            setTimeInRangeData((prev) => {
                const updatedData = [
                    ...prev,
                    {
                        timestamp: formattedReading.timestamp,
                        glucose: formattedReading.glucose,
                    },
                ]
                return updatedData
            })
        }

        socket.onerror = (error) => console.error("❌ WebSocket Error:", error)

        return () => socket.close()
    }, [selectedChartTimespan])

    if (!userProfile) return <h1>Loading dashboard...</h1>

    const handleClick = async () => {
        if (!userProfile) return
        setLoading(true)

        await toggleSimulation()
        const status = await getSimulationStatus()
        setIsRunning(status)

        setLoading(false)
    }

    // TO-DO: Add dashboard header
    return (
        <div>
            {/* Header */}
            <div className="dash-header">
                <div>
                    <img src="/sensorsetting.svg" className="header-icon" />
                    <img src="/pumpsetting.svg" className="header-icon" />
                </div>
                <h1 className="header-title">
                    {currentUser.first_name} {currentUser.last_name}&apos;s
                    Dashboard
                </h1>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.5rem",
                    justifyContent: "center",
                    marginTop: "2rem",
                }}
            >
                {/* Left section: glucose reading & time in range */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "flow",
                        alignItems: "center",
                    }}
                >
                    <GlucoseReading
                        data={glucoseData}
                        startData={timeInRangeData[timeInRangeData.length - 1]}
                        glucoseMin={userProfile.glucoseMin}
                        glucoseMax={userProfile.glucoseMax}
                    />
                    <TimeInRangeBar
                        data={timeInRangeData}
                        glucoseMin={userProfile.glucoseMin}
                        glucoseMax={userProfile.glucoseMax}
                    />
                </div>

                {/* Vertical separator */}
                <div
                    style={{
                        width: "1px",
                        height: "410px",
                        background:
                            "linear-gradient(to bottom, #FCFFFE 0%, #FCFFFE 20%, #B6B6B6 20%, #B6B6B6 80%, #FCFFFE 80%, #FCFFFE 100%)",
                    }}
                ></div>

                {/* Right section: IOB, exercise mode, bolus, basal */}
                <BasalAndBolus
                    basalrate={userProfile.basalRate}
                    emEnabled={userProfile.emEnabled}
                    iob={userProfile.iob}
                    isRunning={isRunning}
                    // bolusMax={userProfile.bolusMax}
                    // currentGlucose={glucoseData[glucoseData.length - 1].glucose}
                    // carbRatio={userProfile.carbRatio}
                    // correctionFactor={userProfile.correctionFactor}
                    // glucoseTarget={userProfile.glucoseTarget}
                    // glucoseMin={userProfile.glucoseMin}
                />
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    flexDirection: "row-reverse",
                }}
            >
                {/* Time selector */}
                <ToggleButtonGroup
                    value={selectedChartTimespan}
                    exclusive
                    onChange={(_, newValue) => {
                        if (newValue !== null)
                            setSelectedChartTimespan(newValue)
                    }}
                    aria-label="chart timespan"
                    sx={{
                        borderBottom: "2px solid #666",
                        borderRadius: 0,
                        width: "11%",
                        justifyContent: "flex-start",
                        height: "2.3rem",
                        marginTop: "0.9rem",
                        marginRight: "0.8rem",
                    }}
                >
                    {[4, 8, 12, 24].map((hrs) => (
                        <ToggleButton
                            key={hrs}
                            value={hrs}
                            sx={{
                                textTransform: "none",
                                fontWeight: "bold",
                                color: "#666",
                                "&.Mui-selected": {
                                    color: "black",
                                    borderBottom: "2px solid black",
                                    backgroundColor: "transparent",
                                },
                                "&:hover": {
                                    backgroundColor: "transparent",
                                },
                            }}
                        >
                            {hrs}hr
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                {/* Start/stop button */}
                <div
                    className="btn-group"
                    style={{
                        flexGrow: 0.035,
                        display: "flex",
                        justifyContent: "flex-end",
                    }}
                >
                    {loading ? (
                        <span>Processing...</span>
                    ) : (
                        <img
                            src={isRunning ? "/stopsim.svg" : "/startsim.svg"}
                            alt={
                                isRunning
                                    ? "Stop Simulation"
                                    : "Start Simulation"
                            }
                            width="50"
                            height="50"
                            onClick={handleClick}
                            style={{ cursor: "pointer" }}
                        />
                    )}
                </div>
            </div>

            <GlucoseChart
                chartData={chartData}
                glucoseMin={userProfile.glucoseMin}
                glucoseMax={userProfile.glucoseMax}
                timeScale={selectedChartTimespan}
            />

            {/* Footer */}
            {/* <div className="dash-footer">
                <p>Copyright / Attributions</p>
                <p>Medical Disclaimer</p>
            </div> */}
        </div>
    )
}

export default Dashboard
