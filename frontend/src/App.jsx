// import react from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login.jsx"
import Register from "./pages/Register.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import { stopSimulation } from "./components/Simulations.jsx"
import { useEffect } from "react"
import { jwtDecode } from "jwt-decode"
import { ACCESS_TOKEN } from "./constants.js"
import axios from "axios"

function Logout() {
    stopSimulation()
    localStorage.clear()
    return <Navigate to="/login" />
}

function RegisterAndLogout() {
    localStorage.clear()
    return <Register />
}

function App() {
    useEffect(() => {
        const handleUnload = () => {
            try {
                const token = localStorage.getItem(ACCESS_TOKEN)
                if (!token) return

                const decoded = jwtDecode(token)
                const userId = decoded?.user_id
                if (!userId) return

                // Check if simulation is running, if so, stop simulation
                axios
                    .get(
                        `${import.meta.env.VITE_API_URL}/api/simulation-status/${userId}/`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    )
                    .then((response) => {
                        if (response.data.running) {
                            const url = `/api/stop-simulation/${userId}/`
                            const payload = JSON.stringify({
                                message:
                                    "Stopping simulation before closing...",
                            })

                            // Use sendBeacon for reliability
                            const blob = new Blob([payload], {
                                type: "application/json",
                            })
                            navigator.sendBeacon(url, blob)
                        }
                    })
                    .catch((error) =>
                        console.error(
                            "Error checking simulation status:",
                            error
                        )
                    )
            } catch (error) {
                console.error("Error stopping simulation:", error)
            }
        }

        if (window.history.length <= 1)
            window.history.replaceState(null, "", "/")

        // Attach events
        window.addEventListener("pagehide", handleUnload)

        // Cleanup function to remove listeners
        return () => {
            window.removeEventListener("pagehide", handleUnload)
        }
    }, [])

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<RegisterAndLogout />} />
                <Route path="*" element={<NotFound />} />
                <Route path="/logout" element={<Logout />} />
            </Routes>
        </BrowserRouter>
    )
}

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse

            // If navigation request fails, return index.html for React Router
            if (event.request.mode === "navigate")
                return caches.match("/index.html")

            return fetch(event.request)
        })
    )
})

export default App
