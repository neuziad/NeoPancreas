import { useEffect } from 'react'

const WEBSOCKET_URL =
    import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000/ws/glucose/'

const useWebSocket = (onMessageReceived) => {
    useEffect(() => {
        const socket = new WebSocket(WEBSOCKET_URL)

        // Connection opened
        socket.onopen = () => {
            console.log('✅ WebSocket connected!')
        }

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data)
            console.log('📡 WebSocket update: ', data)
            onMessageReceived(data)
        }

        socket.onerror = (error) => {
            console.error('❌ WebSocket error: ', error)
        }
        return () => socket.close()
    }, [onMessageReceived])

    return null
}

export default useWebSocket
