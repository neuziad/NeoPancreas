// import react from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login.jsx"
import Register from "./pages/Register.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import { stopSimulation } from "./components/Simulations.jsx"
import { useEffect, useState } from "react"

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
    const [isOffline, setIsOffline] = useState(!navigator.onLine)

    // Prvent navigation to blank page
    useEffect(() => {
        if (window.history.length <= 1)
            window.history.replaceState(null, "", "/")
    }, [])

    // Update online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOffline(false)
        const handleOffline = () => setIsOffline(true)

        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)

        return () => {
            window.removeEventListener("online", handleOnline)
            window.removeEventListener("offline", handleOffline)
        }
    }, [])

    return (
        <BrowserRouter>
            <div>
                {isOffline && (
                    <div className="bg-[#f4e0ff] text-black text-center py-2">
                        You are offline. Using last saved glucose data.
                    </div>
                )}
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
            </div>
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
