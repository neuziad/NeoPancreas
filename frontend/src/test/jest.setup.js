import "@testing-library/jest-dom"
import { TextEncoder, TextDecoder } from "text-encoding"
import { jest } from "@jest/globals"

// Text encoder/decoder
globalThis.TextEncoder = TextEncoder
globalThis.TextDecoder = TextDecoder

// Resize observer
globalThis.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}))

// Audio implementation
globalThis.Audio = jest.fn().mockImplementation(() => ({
    play: jest.fn().mockResolvedValue(),
    pause: jest.fn(),
    currentTime: 0,
}))

// Navigation
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: jest.fn(() => jest.fn()),
}))

// Ensure Notification API is available globally
globalThis.Notification = jest.fn().mockImplementation((title, options) => ({
    title,
    options,
}))

globalThis.Notification.permission = "granted"

// Properly mock Notification.requestPermission
globalThis.Notification.requestPermission = jest
    .fn()
    .mockResolvedValue("granted")
