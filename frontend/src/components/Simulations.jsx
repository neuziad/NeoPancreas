import { jwtDecode } from "jwt-decode"
import { ACCESS_TOKEN } from "../constants"
import api from "../api"

// Function to get the authenticated user's ID
function getUserId() {
    const token = localStorage.getItem(ACCESS_TOKEN)
    if (!token) return null

    try {
        const decoded = jwtDecode(token)
        return decoded.user_id || null
    } catch (error) {
        console.error("Error decoding token:", error)
        return null
    }
}

// Function to start the simulation
export async function startSimulation() {
    const userId = getUserId()
    if (!userId) {
        window.alert("You need to log in first!")
        return false
    }

    try {
        const response = await api.post(
            `/api/start-simulation/${userId}/`,
            null,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`,
                },
            }
        )
        console.log("Simulation started:", response.data)
        return true
    } catch (error) {
        console.error("Error starting simulation:", error)
        return false
    }
}

// Function to stop the simulation
export async function stopSimulation() {
    const userId = getUserId()
    if (!userId) {
        window.alert("You need to log in first!")
        return false
    }

    try {
        const response = await api.post(
            `/api/stop-simulation/${userId}/`,
            null,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`,
                },
            }
        )
        console.log("Simulation stopped:", response.data)
        return true
    } catch (error) {
        console.error("Error stopping simulation:", error)
        return false
    }
}

// Function to check simulation status
export async function getSimulationStatus() {
    const userId = getUserId()
    if (!userId) {
        window.alert("You need to log in first!")
        return false
    }

    try {
        const response = await api.get(`/api/simulation-status/${userId}/`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN)}`,
            },
        })
        return response.data.running
    } catch (error) {
        console.error("Error fetching simulation status:", error)
        return false
    }
}

// Function to toggle simulation state
export async function toggleSimulation() {
    const isRunning = await getSimulationStatus()
    if (isRunning) {
        const stopped = await stopSimulation()
        if (stopped) window.alert("Simulation stopped successfully!")
    } else {
        const started = await startSimulation()
        if (started) window.alert("Simulation started successfully!")
    }
}

export default {
    startSimulation,
    stopSimulation,
    getSimulationStatus,
    toggleSimulation,
}
