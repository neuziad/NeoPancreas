import { jwtDecode } from 'jwt-decode'
import { ACCESS_TOKEN } from '../constants'
import api from '../api'

export async function startSimulation() {
    const token = localStorage.getItem(ACCESS_TOKEN)

    if (!token) {
        alert('You need to log in first!')
        return
    }

    try {
        // Decode JWT to get user ID
        const decoded = jwtDecode(token)
        const userId = decoded.user_id

        if (!userId) {
            alert('Invalid token: User ID missing.')
            return
        }

        // console.log('Decoded JWT:', decoded)

        // Send a POST request with the Authorization header
        const response = await api.post(
            `/api/start-simulation/${userId}/`,
            null,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        )

        console.log('Simulation started:', response.data)
        alert('Simulation started successfully!')
    } catch (error) {
        console.error('Error starting simulation:', error)

        if (error.response) {
            alert(
                `Error: ${error.response.data.detail || 'Failed to start simulation.'}`
            )
        } else {
            alert('An error occurred. Please try again.')
        }
    }
}

export async function stopSimulation() {
    const token = localStorage.getItem(ACCESS_TOKEN)

    if (!token) {
        alert('You need to log in first!')
        return
    }

    try {
        // Decode JWT to get user ID
        const decoded = jwtDecode(token)
        const userId = decoded.user_id

        if (!userId) {
            alert('Invalid token: User ID missing.')
            return
        }

        // console.log('Decoded JWT:', decoded)

        // Send a POST request with the Authorization header
        const response = await api.post(
            `/api/stop-simulation/${userId}/`,
            null,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        )

        console.log('Simulation stopped:', response.data)
        alert('Simulation stopped successfully!')
    } catch (error) {
        console.error('Error stopping simulation:', error)

        if (error.response) {
            alert(
                `Error: ${error.response.data.detail || 'Failed to stop simulation.'}`
            )
        } else {
            alert('An error occurred. Please try again.')
        }
    }
}

export async function getSimulationStatus() {
    const token = localStorage.getItem(ACCESS_TOKEN)

    if (!token) {
        alert('You need to log in first!')
        return
    }

    try {
        // Decode JWT to get user ID
        const decoded = jwtDecode(token)
        const userId = decoded.user_id

        if (!userId) {
            alert('Invalid token: User ID missing.')
            return
        }

        // Send a GET request with the Authorization header
        const response = await api.get(`/api/simulation-status/${userId}/`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        console.log('Simulation status:', response.data)
        const status = response.data.running ? 'running' : 'stopped'
        alert(`Simulation status: ${status}`)
    } catch (error) {
        console.error('Error fetching simulation status:', error)

        if (error.response) {
            alert(
                `Error: ${error.response.data.detail || 'Failed to fetch simulation status.'}`
            )
        } else {
            alert('An error occurred. Please try again.')
        }
    }
}
