import WS from "jest-websocket-mock"
import { act, renderHook } from "@testing-library/react"
import {
    describe,
    it,
    beforeEach,
    afterEach,
    expect,
    jest,
} from "@jest/globals"
import useWebSocket from "../components/UseWebSocket"

describe("WebSocket Hook", () => {
    let server

    beforeEach(async () => {
        WS.clean()
        server = new WS("ws://localhost:8001/ws/glucose/")
    })

    afterEach(() => {
        WS.clean()
    })

    it("should establish a WebSocket connection", async () => {
        const onMessageReceived = jest.fn()
        renderHook(() => useWebSocket(onMessageReceived))

        await server.connected
        expect(server).toHaveReceivedMessages([])
    })

    it("should receive messages from WebSocket and call onMessageReceived", async () => {
        const onMessageReceived = jest.fn()
        renderHook(() => useWebSocket(onMessageReceived))

        // Wait for WebSocket connection to establish
        await expect(server.connected).resolves.toBeTruthy()

        // Simulate WebSocket message
        await act(async () => {
            server.send(JSON.stringify({ timestamp: 0, glucose: 10.0 }))
        })

        expect(onMessageReceived).toHaveBeenCalledWith({
            timestamp: 0,
            glucose: 10.0,
        })
    })

    it("should handle WebSocket errors", async () => {
        const onMessageReceived = jest.fn()
        renderHook(() => useWebSocket(onMessageReceived))

        await server.connected

        // Simulate WebSocket error
        act(() => {
            server.error()
        })

        await server.closed
    })

    it("should close WebSocket on unmount", async () => {
        const { unmount } = renderHook(() => useWebSocket(() => {}))

        await server.connected

        // Unmount the hook
        act(() => {
            unmount()
        })

        await server.closed
    })
})
