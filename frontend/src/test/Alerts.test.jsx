import { render, screen, fireEvent } from "@testing-library/react"
import AlertMonitor from "../components/Alerts"
import { describe, it, expect } from "@jest/globals"

describe("Alerts Component", () => {
    it("should not render AlertModal when no alert type is triggered", () => {
        render(
            <AlertMonitor glucoseData={[]} glucoseMin={3.9} glucoseMax={11.2} />
        )
        // No alert should be shown
        expect(screen.queryByText(/Urgent/i)).toBeNull()
    })

    it("should render AlertModal when glucose level is high (greater than 11.2 mmol/L)", () => {
        const glucoseData = [11.0, 12.5, 14.8] // High glucose levels in mmol/L
        render(
            <AlertMonitor
                glucoseData={glucoseData}
                glucoseMin={3.9}
                glucoseMax={11.2}
            />
        )

        // The "Urgent high blood glucose" message should appear
        expect(
            screen.getByText("Urgent high blood glucose")
        ).toBeInTheDocument()
        expect(globalThis.Audio).toHaveBeenCalledWith("/sound/urgent_high.ogg")
    })

    it("should render AlertModal when glucose level is low (less than 3.9 mmol/L)", () => {
        const glucoseData = [3.5, 3.2, 3.0] // Low glucose levels in mmol/L
        render(
            <AlertMonitor
                glucoseData={glucoseData}
                glucoseMin={3.9}
                glucoseMax={11.2}
            />
        )

        // The "Urgent low blood glucose" message should appear
        expect(screen.getByText("Urgent low blood glucose")).toBeInTheDocument()
        expect(globalThis.Audio).toHaveBeenCalledWith("/sound/urgent_low.ogg")
    })

    it("should render AlertModal when there are connection issues", () => {
        const glucoseData = [0, 0, 0] // Simulate connection issues with 0 values
        render(
            <AlertMonitor
                glucoseData={glucoseData}
                glucoseMin={3.9}
                glucoseMax={11.2}
            />
        )

        // The "Sensor/pump signal lost" message should appear
        expect(screen.getByText("Sensor/pump signal lost")).toBeInTheDocument()
        expect(globalThis.Audio).toHaveBeenCalledWith(
            "/sound/connection_error.ogg"
        )
    })

    it('should stop the alarm when clicking the "Stop Alarm" button', () => {
        const glucoseData = [12.0] // High glucose data
        render(
            <AlertMonitor
                glucoseData={glucoseData}
                glucoseMin={3.9}
                glucoseMax={11.2}
            />
        )

        // Simulate clicking the "Stop Alarm" button
        const stopButton = screen.getByText("Stop Alarm")
        fireEvent.click(stopButton)

        // Ensure the audio is paused and reset
        expect(globalThis.Audio.mock.results[0].value.pause).toHaveBeenCalled()
        expect(globalThis.Audio.mock.results[0].value.currentTime).toBe(0)
    })

    it("should not show alerts for glucose within the acceptable range (3.9 - 11.2 mmol/L)", () => {
        const glucoseData = [5.0, 6.0, 6.5] // Normal glucose range in mmol/L
        render(
            <AlertMonitor
                glucoseData={glucoseData}
                glucoseMin={3.9}
                glucoseMax={11.2}
            />
        )

        // No high or low glucose alerts should be shown
        expect(screen.queryByText("Urgent high blood glucose")).toBeNull()
        expect(screen.queryByText("Urgent low blood glucose")).toBeNull()
    })
})
