import {
    startSimulation,
    stopSimulation,
    getSimulationStatus,
    toggleSimulation,
} from "../components/Simulations"
import api from "../api"
import { jwtDecode } from "jwt-decode"
import { ACCESS_TOKEN } from "../constants"
import { describe, it, expect, jest, beforeEach } from "@jest/globals"
import "jest-localstorage-mock"

// Mocking dependencies
jest.mock("jwt-decode")
jest.mock("../api")

describe("Simulation Functions Component", () => {
    const mockToken =
        "Yf5zfjwkdPs1AroQise4Omm1ajOiciGgI9K1AcAeI0EyudtVDYTB7sZGQhAM58xB"
    const mockUserId = "64"

    beforeEach(() => {
        jest.clearAllMocks()
        localStorage.clear()

        localStorage.setItem(ACCESS_TOKEN, mockToken)
        jwtDecode.mockReturnValue({ user_id: mockUserId })

        jest.spyOn(window, "alert").mockImplementation(() => {})
    })

    describe("startSimulation", () => {
        it("should start simulation only when user is logged in", async () => {
            api.post.mockResolvedValue({
                data: { message: "Simulation started" },
            })

            const result = await startSimulation()
            expect(result).toBe(true)
            expect(api.post).toHaveBeenCalledWith(
                "/api/start-simulation/",
                null,
                expect.objectContaining({
                    headers: {
                        Authorization: `Bearer ${mockToken}`,
                    },
                })
            )
        })

        it("should show alert if user is not logged in", async () => {
            localStorage.removeItem(ACCESS_TOKEN)
            const alertSpy = jest
                .spyOn(window, "alert")
                .mockImplementation(() => {})

            const result = await startSimulation()
            expect(result).toBe(false)
            expect(alertSpy).toHaveBeenCalledWith("You need to log in first!")
        })

        it("should handle API error", async () => {
            api.post.mockRejectedValue(new Error("API error"))

            const result = await startSimulation()
            expect(result).toBe(false)
            expect(api.post).toHaveBeenCalled()
        })
    })

    describe("stopSimulation", () => {
        it("should stop simulation only when user is logged in", async () => {
            api.post.mockResolvedValue({
                data: { message: "Simulation stopped" },
            })

            const result = await stopSimulation()
            expect(result).toBe(true)
            expect(api.post).toHaveBeenCalledWith(
                `/api/stop-simulation/`,
                null,
                expect.objectContaining({
                    headers: {
                        Authorization: `Bearer ${mockToken}`,
                    },
                })
            )
        })

        it("should show alert if user is not logged in", async () => {
            localStorage.removeItem(ACCESS_TOKEN)
            const alertSpy = jest
                .spyOn(window, "alert")
                .mockImplementation(() => {})

            const result = await stopSimulation()
            expect(result).toBe(false)
            expect(alertSpy).toHaveBeenCalledWith("You need to log in first!")
        })

        it("should handle API error", async () => {
            api.post.mockRejectedValue(new Error("API error"))

            const result = await stopSimulation()
            expect(result).toBe(false)
            expect(api.post).toHaveBeenCalled()
        })
    })

    describe("getSimulationStatus", () => {
        it("should return simulation status when user is logged in", async () => {
            api.get.mockResolvedValue({ data: { running: true } })

            const result = await getSimulationStatus()
            expect(result).toBe(true)
            expect(api.get).toHaveBeenCalledWith(
                `/api/simulation-status/`,
                expect.objectContaining({
                    headers: {
                        Authorization: `Bearer ${mockToken}`,
                    },
                })
            )
        })

        it("should show alert if user is not logged in", async () => {
            localStorage.removeItem(ACCESS_TOKEN)
            const alertSpy = jest
                .spyOn(window, "alert")
                .mockImplementation(() => {})

            const result = await getSimulationStatus()
            expect(result).toBe(false)
            expect(alertSpy).toHaveBeenCalledWith("You need to log in first!")
        })

        it("should handle API error", async () => {
            api.get.mockRejectedValue(new Error("API error"))

            const result = await getSimulationStatus()
            expect(result).toBe(false)
            expect(api.get).toHaveBeenCalled()
        })
    })

    describe("toggleSimulation", () => {
        it("should stop simulation if it is running", async () => {
            api.get.mockResolvedValue({ data: { running: true } })
            api.post.mockResolvedValue({
                data: { message: "Simulation stopped" },
            })
            const alertSpy = jest
                .spyOn(window, "alert")
                .mockImplementation(() => {})

            await toggleSimulation()
            expect(alertSpy).toHaveBeenCalledWith(
                "Simulation stopped successfully!"
            )
        })

        it("should start simulation if it is not running", async () => {
            api.get.mockResolvedValue({ data: { running: false } })
            api.post.mockResolvedValue({
                data: { message: "Simulation started" },
            })
            const alertSpy = jest
                .spyOn(window, "alert")
                .mockImplementation(() => {})

            await toggleSimulation()
            expect(alertSpy).toHaveBeenCalledWith(
                "Simulation started successfully!"
            )
        })

        it("should handle API errors when toggling simulation", async () => {
            api.get.mockResolvedValue({ data: { running: false } })
            api.post.mockRejectedValue(new Error("API error"))

            const result = await toggleSimulation()
            expect(result).toBe(undefined)
        })
    })
})
