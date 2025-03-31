import { render, screen, waitFor } from "@testing-library/react"
import GlucoseChart from "../components/GlucoseChart"
import { describe, expect, it } from "@jest/globals"
import "@testing-library/jest-dom"

/* Recharts renders the final result in SVG components that are labelled and processed
differently to the code we initially write, so we'll have to use image snapshot unit
testing to make sure we get the result we want, as directly testing divs here won't work. */
import { toMatchImageSnapshot } from "jest-image-snapshot"
expect.extend({ toMatchImageSnapshot })

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

        expect(
            screen.getByText(/Loading data if available.../)
        ).toBeInTheDocument()
    })

    it("correctly renders various chart aspects when data is available", async () => {
        render(
            <GlucoseChart
                chartData={chartData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
                timeScale={timeScale}
            />
        )

        // Wait for the component to render and ensure no loading state
        await waitFor(() =>
            expect(
                screen.queryByText(/Loading data if available.../i)
            ).not.toBeInTheDocument()
        )

        // Snapshot the entire chart
        const chart = screen.getByTestId("scatter-chart")
        expect(chart).toMatchSnapshot()
    })
})
