import { useState, useEffect, useCallback } from "react"
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
import { cacheGlucoseReading, retrieveCacheReadings } from "../components/UseCache"

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
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    let carbs = 0

    const fallbackData = retrieveCacheReadings()

    // Fetch status of simulation
    useEffect(() => {
        const status = getSimulationStatus()
        status.then((res) => setIsRunning(res))
    }, [])

    // Memoized API fetching user profile attributes
    const fetchUserProfile = useCallback(async () => {
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
    }, [])

    useEffect(() => {
        fetchUserProfile()
    }, [fetchUserProfile])

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
                
                // Set time in range data
                setTimeInRangeData(formattedData)

                // Set cached data
                formattedData.forEach((item) => {
                    cacheGlucoseReading(item)
                })

                console.log("Initial time in range data:", formattedData)
            } catch (error) {
                console.error("❌ Error fetching 24h glucose readings:", error)

                // Set cached data
                retrieveCacheReadings().then(cachedData => setTimeInRangeData(cachedData))
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

                // Set cached data
                setChartData(fallbackData)
            }
        }

        fetchDataForChart()
    }, [selectedChartTimespan, fallbackData])

    // Fetch user full name (we must retrieve from User as opposed to UserProfile)
    const fetchUser = useCallback(async () => {
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
    }, [])

    useEffect(() => {
        fetchUser()
    }, [fetchUser])

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
    }, [fetchUserProfile, selectedChartTimespan])

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
                <div className="hidden sm:flex items-center space-x-2 header-icon">
                    <img
                        src="/sensorsetting.svg"
                        className="w-[3rem] h-[3rem] cursor-pointer"
                        onClick={() => {
                            setIsSensorOpen(true)
                            setIsMenuOpen(false)
                        }}
                        alt="Sensor Settings"
                    />
                    <img
                        src="/pumpsetting.svg"
                        className="w-[3rem] h-[3rem] cursor-pointer"
                        onClick={() => {
                            setIsPumpOpen(true)
                            setIsMenuOpen(false)
                        }}
                        alt="Pump Settings"
                    />
                </div>

                {/* Mobile menu collapsable */}
                <div className="sm:hidden flex items-center">
                    <img
                        src="/menu.svg"
                        className="w-6 h-6 cursor-pointer z-50"
                        onClick={() =>
                            setIsMenuOpen((prev) => {
                                return !prev
                            })
                        }
                        alt="Menu"
                    />
                </div>

                {/* Patient's name */}
                <h1 className="absolute inset-x-0 text-center text-black font-bold text-[1rem] sm:text-[1.2rem]">
                    {currentUser.first_name} {currentUser.last_name}&apos;s
                    Dashboard
                </h1>

                {isMenuOpen && (
                    <div className="absolute top-[3.5rem] left-0 right-0 bg-[#eac6eb] shadow-lg flex flex-col items-center py-2">
                        <button
                            onClick={() => {
                                setIsSensorOpen(true)
                                setIsMenuOpen(false)
                            }}
                            className="py-2 px-4 w-full text-left"
                        >
                            <img
                                src="/sensorsetting.svg"
                                className="w-6 h-6 inline-block mr-2"
                                alt="Sensor Settings"
                            />
                            Sensor Settings
                        </button>
                        <button
                            onClick={() => {
                                setIsPumpOpen(true)
                                setIsMenuOpen(false)
                            }}
                            className="py-2 px-4 w-full text-left"
                        >
                            <img
                                src="/pumpsetting.svg"
                                className="w-6 h-6 inline-block mr-2"
                                alt="Pump Settings"
                            />
                            Pump Settings
                        </button>
                    </div>
                )}
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

            <div className="w-full overflow-x-auto px-8 lg:flex justify-center">
                <div className="flex flex-nowrap items-center justify-start gap-8 md:mt-8 mt-12 pt-8 pd-4">
                    {/* Left section: glucose reading & time in range */}
                    <div className="flex items-center min-w-max">
                        <GlucoseReading
                            data={glucoseData}
                            startData={
                                timeInRangeData[timeInRangeData.length - 1]
                            }
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
                    <div className="hidden md:block w-px h-[350px] bg-gradient-to-b from-white via-gray-400 to-white" />

                    {/* Right section: IOB, exercise mode, bolus, basal */}
                    <div className="flex flex-col gap-4 min-w-max pr-12 pd-4">
                        <BasalAndBolus
                            basalrate={userProfile.basalRate}
                            emEnabled={userProfile.emEnabled}
                            iob={userProfile.iob}
                            isRunning={isRunning}
                            onOpenBolus={() => setIsBolusOpen(true)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center px-4 pt-2 sm:pt-4">
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
