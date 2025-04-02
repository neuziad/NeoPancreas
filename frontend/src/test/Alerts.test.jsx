import { render, screen, fireEvent } from "@testing-library/react"
import AlertMonitor from "../components/Alerts"
import { describe, it, expect, jest, beforeEach } from "@jest/globals"

describe("Alerts Component", () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("should not render AlertModal when no alert type is triggered", () => {
        render(
            <AlertMonitor glucoseData={[]} glucoseMin={3.9} glucoseMax={11.2} />
        )
        // No alert should be shown
        expect(screen.queryByText(/Urgent/i)).toBeNull()
    })

    it("should render AlertModal when glucose level is high (greater than 11.2 mmol/L)", () => {
        const glucoseData = [
            {
                timestamp: 105,
                glucose: 12.5, // High glucose levels in mmol/L
                trend: "NODATA",
                bolus_injected: 0,
                basal_injected: 0,
            },
        ]

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
        const glucoseData = [
            {
                timestamp: 105,
                glucose: 3.2, // Low glucose levels in mmol/L
                trend: "NODATA",
                bolus_injected: 0,
                basal_injected: 0,
            },
        ]

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
        const glucoseData = [
            {
                timestamp: 105,
                glucose: 12.5, // High glucose levels in mmol/L
                trend: "NODATA",
                bolus_injected: 0,
                basal_injected: 0,
            },
        ]

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
        const glucoseData = [
            {
                timestamp: 105,
                glucose: 7.6, // Glucose in range
                trend: "NODATA",
                bolus_injected: 0,
                basal_injected: 0,
            },
        ]

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

    it("should trigger a push notification when an alert is shown", async () => {
        const glucoseData = [
            {
                timestamp: 105,
                glucose: 12.5, // High glucose levels in mmol/L
                trend: "NODATA",
                bolus_injected: 0,
                basal_injected: 0,
            },
        ]

        render(
            <AlertMonitor
                glucoseData={glucoseData}
                glucoseMin={3.9}
                glucoseMax={11.2}
            />
        )

        // Wait for effect to trigger
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Ensure a notification was triggered
        expect(globalThis.Notification).toHaveBeenCalledTimes(1)
        expect(globalThis.Notification).toHaveBeenCalledWith(
            "Urgent high blood glucose",
            {
                body: "Check your glucose levels now!",
                icon: "/urgenthigh.svg",
            }
        )
    })

    it("should not trigger a push notification when glucose is normal", () => {
        const glucoseData = [
            {
                timestamp: 105,
                glucose: 5.9, // Glucose in range
                trend: "NODATA",
                bolus_injected: 0,
                basal_injected: 0,
            },
        ]

        render(
            <AlertMonitor
                glucoseData={glucoseData}
                glucoseMin={3.9}
                glucoseMax={11.2}
            />
        )

        // Ensure no notifications were triggered
        expect(globalThis.Notification).not.toHaveBeenCalled()
    })
})
