import { useState, useEffect } from 'react'
import {
    toggleSimulation,
    getSimulationStatus,
} from '../components/Simulations.jsx'
import GlucoseChart from '../components/GlucoseChart.jsx'

const Dashboard = () => {
    const [isRunning, setIsRunning] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const checkStatus = async () => {
            const status = await getSimulationStatus()
            setIsRunning(status)
        }
        checkStatus()
    }, [])

    const handleClick = async () => {
        if (loading) return
        setLoading(true)

        await toggleSimulation()
        const status = await getSimulationStatus() // Refresh status after toggle
        setIsRunning(status)

        setLoading(false)
    }

    return (
        <div>
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
            <GlucoseChart />
        </div>
    )
}

export default Dashboard
