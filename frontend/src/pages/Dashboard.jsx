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
import {
    SensorModal,
    PumpModal,
    BolusModal,
    FooterModals,
} from "../components/Modals"
import AlertMonitor from "../components/Alerts"

const WEBSOCKET_URL =
    import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:8001/ws/glucose/"

const Dashboard = () => {
    const [userProfile, setUserProfile] = useState(null)
    const [timeInRangeData, setTimeInRangeData] = useState([])
    const [chartData, setChartData] = useState([])
    const [selectedChartTimespan, setSelectedChartTimespan] = useState(4)
    const [isRunning, setIsRunning] = useState(false)
    const [loading, setLoading] = useState(false)
    const [glucoseData, setGlucoseData] = useState([])
    const [currentUser, setCurrentUser] = useState([])
    const [isSensorOpen, setIsSensorOpen] = useState(false)
    const [isPumpOpen, setIsPumpOpen] = useState(false)
    const [isBolusOpen, setIsBolusOpen] = useState(false)
    let carbs = 0

    // Fetch status of simulation
    useEffect(() => {
        const status = getSimulationStatus()
        status.then((res) => setIsRunning(res))
    }, [])

    // API fetching user profile attributes
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

    useEffect(() => {
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
    }, [])

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
            fetchUserProfile()

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

    return (
        <div>
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-10 bg-[#eac6eb] flex items-center px-3 h-[3.5rem]">
                {/* Left Icons */}
                <div className="flex items-center space-x-2 header-icon">
                    <img
                        src="/sensorsetting.svg"
                        className="w-xs h-xs cursor-pointer"
                        onClick={() => setIsSensorOpen(true)}
                        alt="Sensor Settings"
                    />
                    <img
                        src="/pumpsetting.svg"
                        className="w-xs h-xs cursor-pointer"
                        onClick={() => setIsPumpOpen(true)}
                        alt="Pump Settings"
                    />
                </div>

                {/* User's Name Centered */}
                <h1 className="absolute inset-x-0 text-center text-[1.1rem] font-bold text-black">
                    {currentUser.first_name} {currentUser.last_name}&apos;s
                    Dashboard
                </h1>
            </div>

            {/* Modals */}
            <AlertMonitor
                glucoseData={glucoseData}
                glucoseMin={userProfile.glucoseMin}
                glucoseMax={userProfile.glucoseMax}
            />
            <SensorModal
                isOpen={isSensorOpen}
                onClose={() => setIsSensorOpen(false)}
                diabeticProfile={userProfile.diabeticProfile}
                glucoseMin={userProfile.glucoseMin}
                glucoseTarget={userProfile.glucoseTarget}
                glucoseMax={userProfile.glucoseMax}
                correctionFactor={userProfile.correctionFactor}
                fetchUserProfile={fetchUserProfile}
                setIsSensorOpen={() => setIsSensorOpen(false)}
            />
            <PumpModal
                isOpen={isPumpOpen}
                onClose={() => setIsPumpOpen(false)}
                basalRate={userProfile.basalRate}
                maxIOB={userProfile.maxIOB}
                maxBolus={userProfile.bolusMax}
                insulinDuration={userProfile.insulinDuration}
                carbRatio={userProfile.carbRatio}
                fetchUserProfile={fetchUserProfile}
                setIsPumpOpen={() => setIsPumpOpen(false)}
            />
            <BolusModal
                isOpen={isBolusOpen}
                onClose={() => setIsBolusOpen(false)}
                emEnabled={userProfile.emEnabled}
                carbs={carbs}
                currentGlucose={
                    glucoseData.length > 0 &&
                    typeof glucoseData[glucoseData.length - 1].glucose ===
                        "number"
                        ? glucoseData[glucoseData.length - 1].glucose
                        : timeInRangeData.length > 0 &&
                            typeof timeInRangeData[timeInRangeData.length - 1]
                                .glucose === "number"
                          ? timeInRangeData[timeInRangeData.length - 1].glucose
                          : undefined // On start-up, there will be nothing in glucoseData, so we get the most recent historic data in such a case
                }
                carbRatio={userProfile.carbRatio}
                correctionFactor={userProfile.correctionFactor}
                glucoseTarget={userProfile.glucoseTarget}
                glucoseMin={userProfile.glucoseMin}
                insulinOnBoard={userProfile.iob}
                maxBolus={userProfile.bolusMax}
                setIsBolusOpen={() => setIsBolusOpen(false)}
            />

            <div className="flex items-center justify-center gap-8 mt-8 pt-8">
                {/* Left section: glucose reading & time in range */}
                <div className="flex items-center">
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
                <div className="w-px h-[350px] bg-gradient-to-b from-white via-gray-400 to-white" />

                {/* Right section: IOB, exercise mode, bolus, basal */}
                <div className="flex flex-col gap-4">
                    <BasalAndBolus
                        basalrate={userProfile.basalRate}
                        emEnabled={userProfile.emEnabled}
                        iob={userProfile.iob}
                        isRunning={isRunning}
                        onOpenBolus={() => setIsBolusOpen(true)}
                    />
                </div>
            </div>

            <div className="flex justify-between items-center px-4">
                {/* Start/stop button */}
                <div className="flex items-center">
                    {loading ? (
                        <span className="text-sm">Processing...</span>
                    ) : (
                        <img
                            src={isRunning ? "/stopsim.svg" : "/startsim.svg"}
                            alt={
                                isRunning
                                    ? "Stop Simulation"
                                    : "Start Simulation"
                            }
                            className="w-10 h-10 cursor-pointer"
                            onClick={handleClick}
                        />
                    )}
                </div>

                {/* Time selector */}
                <ToggleButtonGroup
                    value={selectedChartTimespan}
                    exclusive
                    onChange={(_, newValue) => {
                        if (newValue !== null)
                            setSelectedChartTimespan(newValue)
                    }}
                    aria-label="chart timespan"
                    className="flex items-center justify-end"
                >
                    {[4, 8, 12, 24].map((hrs) => (
                        <ToggleButton
                            key={hrs}
                            value={hrs}
                            className="text-sm font-bold text-gray-600 hover:bg-transparent hover:text-gray-900"
                        >
                            {hrs}hr
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </div>

            <GlucoseChart
                chartData={chartData}
                glucoseMin={userProfile.glucoseMin}
                glucoseMax={userProfile.glucoseMax}
                timeScale={selectedChartTimespan}
            />

            {/* Footer */}
            <FooterModals />
        </div>
    )
}

export default Dashboard
