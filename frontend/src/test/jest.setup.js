import "@testing-library/jest-dom"
import { TextEncoder, TextDecoder } from "text-encoding"
import { jest } from "@jest/globals"

globalThis.TextEncoder = TextEncoder
globalThis.TextDecoder = TextDecoder

globalThis.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}))

globalThis.Audio = jest.fn().mockImplementation(() => ({
    play: jest.fn().mockResolvedValue(),
    pause: jest.fn(),
    currentTime: 0,
}))
