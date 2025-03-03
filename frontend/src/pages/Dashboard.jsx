import {
    startSimulation,
    stopSimulation,
    getSimulationStatus,
} from '../components/Simulations.jsx'
import GlucoseChart from '../components/GlucoseChart.jsx'

function Dashboard() {
    return (
        <div>
            <div className="btn-group">
                <button onClick={startSimulation} className="btn btn-primary">
                    Start Simulation
                </button>
                <button onClick={stopSimulation} className="btn btn-primary">
                    Stop Simulation
                </button>
                <button
                    onClick={getSimulationStatus}
                    className="btn btn-primary"
                >
                    Get Simulation Status
                </button>
            </div>
            <GlucoseChart />
        </div>
    )
}

export default Dashboard
