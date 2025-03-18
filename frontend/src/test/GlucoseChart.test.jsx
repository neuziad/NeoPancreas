import { render, screen, waitFor } from "@testing-library/react"
import GlucoseChart from "../components/GlucoseChart"
import { describe, expect, it } from "@jest/globals"
import "@testing-library/jest-dom"

describe("GlucoseChart", () => {
    const chartData = [
        { timestamp: 0, glucose: 5.2 },
        { timestamp: 60, glucose: 6.3 },
        { timestamp: 120, glucose: 5.8 },
    ]

    const glucoseMin = 3.9
    const glucoseMax = 11.0
    const timeScale = 24

    it("renders without crashing when data is available", () => {
        render(
            <GlucoseChart
                chartData={chartData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
                timeScale={timeScale}
            />
        )

        // Check that an SVG element (which Recharts uses) is present
        expect(screen.getByTestId("scatter-chart")).toBeInTheDocument()
    })

    it('displays "Loading glucose data..." when chartData is empty', () => {
        render(
            <GlucoseChart
                chartData={[]}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
                timeScale={timeScale}
            />
        )

        expect(screen.getByText(/Loading glucose data.../)).toBeInTheDocument()
    })

    it("correctly calculates the XAxis domain based on timeScale", async () => {
        const timeScale = 4
        const chartData = [{ timestamp: 5, glucose: 4.8 }]

        // Now, test if XAxis received the correct domain prop
        const nowInMinutes =
            new Date().getHours() * 60 + new Date().getMinutes()
        const xAxis = screen.getByTestId("x-axis")
        const startTime = Math.max(
            0,
            new Date().getHours() * 60 +
                new Date().getMinutes() -
                timeScale * 60
        )

        render(
            <GlucoseChart
                chartData={chartData}
                glucoseMin={3.9}
                glucoseMax={11}
                timeScale={timeScale}
            />
        )

        // Wait for the component to render and ensure no loading state
        await waitFor(() =>
            expect(
                screen.queryByText(/Loading glucose data/i)
            ).not.toBeInTheDocument()
        )

        expect(xAxis).toHaveAttribute(
            "data-domain",
            JSON.stringify([startTime, nowInMinutes])
        )
    })

    it("renders correct background colors for glucoseMin, glucoseMax", () => {
        render(
            <GlucoseChart
                chartData={chartData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
                timeScale={timeScale}
            />
        )

        const referenceAreas = screen.getElementsByTagName("rect")

        // Checking for the correct fill colors based on glucoseMin and glucoseMax
        expect(referenceAreas[0]).toHaveAttribute("fill", "#B53A3A") // Red (Low)
        expect(referenceAreas[1]).toHaveAttribute("fill", "#3AA246") // Green (Normal)
        expect(referenceAreas[2]).toHaveAttribute("fill", "#CBA63F") // Yellow (High)
    })

    it("correctly formats the XAxis ticks", () => {
        render(
            <GlucoseChart
                chartData={chartData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
                timeScale={timeScale}
            />
        )

        // Check if the XAxis is formatted correctly (e.g., 01:00, 02:00, etc.)
        const tickText = screen.getByText(/00:00/)
        expect(tickText).toBeInTheDocument()
    })
})
