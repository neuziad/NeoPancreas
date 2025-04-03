import { Navigate } from "react-router-dom"
import { jwtDecode } from "jwt-decode"
import api from "../api"
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../constants"
import { useState, useEffect } from "react"
import PropTypes from "prop-types"

function ProtectedRoute({ children }) {
    const [isAuthorized, setIsAuthorized] = useState(null)

    useEffect(() => {
        const auth = async () => {
            const token = localStorage.getItem(ACCESS_TOKEN)
            if (!token) {
                console.log("❌ No access token found")
                setIsAuthorized(false)
                return
            }

            const decoded = jwtDecode(token)
            if (!decoded.exp) {
                console.log("❌ Token has no expiration field")
                setIsAuthorized(false)
                return
            }

            const tokenExpiration = decoded.exp
            const now = Date.now() / 1000

            console.log(`⏳ Token Expiration: ${tokenExpiration}, Now: ${now}`)

            if (tokenExpiration < now) {
                console.log("🟢 Token expired! Checking refresh options...")

                if (navigator.onLine) {
                    await refreshToken()
                } else {
                    console.log("🌐 Offline: Allowing limited access")
                    setIsAuthorized(true) // Allow offline mode
                }
            } else {
                console.log("✅ Token still valid")
                setIsAuthorized(true)
            }
        }

        auth().catch(() => setIsAuthorized(false))
    }, [])

    useEffect(() => {
        console.log("isAuthorized:", isAuthorized)
    }, [isAuthorized])

    const refreshToken = async () => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN)
        if (!refreshToken) {
            console.log("❌ No refresh token found")
            setIsAuthorized(false)
            return
        }

        if (!navigator.onLine) {
            console.log("🌐 Offline: Cannot refresh token")
            setIsAuthorized(true) // Allow offline mode if refresh isn't available
            return
        }

        try {
            const res = await api.post("/api/token/refresh/", {
                refresh: refreshToken,
            })
            if (res.status === 200) {
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                setIsAuthorized(true)
            } else {
                console.log("Unexpected response from API: ", res)
                setIsAuthorized(false)
            }
        } catch (error) {
            console.log("Protected Route error: ", error)
            setIsAuthorized(false)
        }
    }

    return isAuthorized === null ? (
        <div data-testid="loading">Loading...</div>
    ) : isAuthorized ? (
        children
    ) : (
        <Navigate to="/login" replace />
    )
}

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
}

export default ProtectedRoute
