import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import axios from "axios"
import BasalAndBolus from "../components/BasalAndBolus"
import {
    describe,
    it,
    expect,
    beforeEach,
    jest,
    afterEach,
} from "@jest/globals"

// Mocking dependencies
jest.mock("axios")

describe("BasalAndBolus Component", () => {
    let props

    beforeEach(() => {
        props = {
            basalrate: 1.2,
            emEnabled: false,
            iob: 3.5,
            isRunning: true,
            onOpenBolus: jest.fn(),
        }
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it("renders IOB correctly when simulation is running", () => {
        render(<BasalAndBolus {...props} />)

        expect(screen.getByText(/IOB/i)).toBeInTheDocument()
        expect(screen.getByText("3.5U")).toBeInTheDocument()
    })

    it("renders IOB as '--U' when simulation is not running", () => {
        props.isRunning = false
        render(<BasalAndBolus {...props} />)

        expect(screen.getByText("--U")).toBeInTheDocument()
    })

    it("renders basal rate correctly", () => {
        render(<BasalAndBolus {...props} />)

        expect(screen.getByText("1.2")).toBeInTheDocument()
        expect(screen.getByText("U/hr")).toBeInTheDocument()
    })

    it("should update UI when exercise mode toggled", async () => {
        // Mock the axios GET request for toggling exercise mode
        axios.get.mockResolvedValue({ status: 200 })

        render(<BasalAndBolus {...props} />)

        const button = screen.getByRole("button", { name: /exercise mode\?/i })
        expect(button).toHaveTextContent("OFF")

        fireEvent.click(button)

        // Wait for UI update
        await waitFor(() => {
            expect(screen.getByText("ON")).toBeInTheDocument()
        })
    })

    it("should trigger bolus modal when bolus button is clicked", () => {
        render(<BasalAndBolus {...props} />)

        const bolusSection = screen
            .getByText(/click here to administer bolus/i)
            .closest("div")
        fireEvent.click(bolusSection)

        expect(props.onOpenBolus).toHaveBeenCalled()
    })
})
