import axios from "axios"
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
})

const token = localStorage.getItem(ACCESS_TOKEN)

api.interceptors.request.use(
    (config) => {
        if (token) config.headers.Authorization = `Bearer ${token}`
        return config
    },
    (error) => {
        console.log(error)
        return Promise.reject(error)
    }
)

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        // If token is expired, try refreshing
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true
            try {
                const refreshToken = localStorage.getItem(REFRESH_TOKEN)
                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/token/refresh/`,
                    { refresh: refreshToken }
                )

                // Store new access token
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                originalRequest.headers.Authorization = `Bearer ${res.data.access}`
                return api(originalRequest)
            } catch (error) {
                console.log(error)
            }
        }

        return Promise.reject(error)
    }
)

export default api
