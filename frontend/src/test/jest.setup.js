import "@testing-library/jest-dom"
import { TextEncoder, TextDecoder } from "text-encoding"

globalThis.TextEncoder = TextEncoder
globalThis.TextDecoder = TextDecoder
