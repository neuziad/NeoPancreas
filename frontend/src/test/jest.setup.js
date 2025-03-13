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
