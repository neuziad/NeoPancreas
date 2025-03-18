import { render, screen } from "@testing-library/react"
import GlucoseReading from "../components/GlucoseReading"
import { describe, expect, it, jest, beforeEach } from "@jest/globals"

describe("GlucoseReading Component", () => {
    const mockData = [
        { glucose: 5.6, trend: "↑" },
        { glucose: 6.2, trend: "→" },
    ]
    const mockStartData = { glucose: 5.0, trend: "↓" }
    const glucoseMin = 3.9
    const glucoseMax = 11.0

    beforeEach(() => {
        // Clear any mocks before each test
        jest.clearAllMocks()
    })

    it("renders correctly with valid data", () => {
        render(
            <GlucoseReading
                data={mockData}
                startData={mockStartData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
            />
        )

        const glucoseValueElement = screen.getByText(/6.2/)
        expect(glucoseValueElement).toBeInTheDocument()

        const trendElement = screen.getByText(/→/)
        expect(trendElement).toBeInTheDocument()

        const glucoseUnitElement = screen.getByText(/mmol\/L/)
        expect(glucoseUnitElement).toBeInTheDocument()
    })

    it("displays correct border color for glucose value within normal range", () => {
        render(
            <GlucoseReading
                data={mockData}
                startData={mockStartData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
            />
        )

        const glucoseCircle = screen.getByTestId("glucose-circle")
        expect(glucoseCircle).toHaveStyle("border-color: #3AA246") // Green for normal range
    })

    it("displays correct border color for low glucose value", () => {
        const lowData = [{ glucose: 3.5, trend: "↓" }]
        render(
            <GlucoseReading
                data={lowData}
                startData={mockStartData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
            />
        )

        const glucoseCircle = screen.getByTestId("glucose-circle")
        expect(glucoseCircle).toHaveStyle("border-color: #B53A3A") // Red for low range
    })

    it("displays correct border color for high glucose value", () => {
        const highData = [{ glucose: 12.0, trend: "↑" }]
        render(
            <GlucoseReading
                data={highData}
                startData={mockStartData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
            />
        )

        const glucoseCircle = screen.getByTestId("glucose-circle")
        expect(glucoseCircle).toHaveStyle("border-color: #CBA63F") // Yellow for high range
    })

    it("displays grey border color for zero glucose value", () => {
        const noReadingsYet = {}

        const zeroData = {
            glucose: 0.0,
            trend: "NODATA",
        }

        render(
            <GlucoseReading
                data={noReadingsYet}
                startData={zeroData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
            />
        )

        const glucoseCircle = screen.getByTestId("glucose-circle")
        expect(glucoseCircle).toHaveStyle("border-color: #B3B3B3") // Grey for zero glucose value
    })

    it("updates glucose value and trend when new data is passed", () => {
        const { rerender } = render(
            <GlucoseReading
                data={mockData}
                startData={mockStartData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
            />
        )

        // Verify initial glucose value
        const initialGlucoseValue = screen.getByText(/6.2/)
        expect(initialGlucoseValue).toBeInTheDocument()

        // New data
        const newData = [{ glucose: 4.2, trend: "↓" }]
        rerender(
            <GlucoseReading
                data={newData}
                startData={mockStartData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
            />
        )

        // Verify updated glucose value
        const updatedGlucoseValue = screen.getByText(/4.2/)
        expect(updatedGlucoseValue).toBeInTheDocument()

        const updatedTrend = screen.getByText(/↓/)
        expect(updatedTrend).toBeInTheDocument()
    })

    it("displays the correct glucose value and trend based on startData prop", () => {
        /* Start data is retrieved from the API, while data is retrieved live through WebSockets,
        so in the case of a user just opening the app, they can get the last updated glucose reading*/
        const noReadingsYet = {}

        render(
            <GlucoseReading
                data={noReadingsYet}
                startData={mockStartData}
                glucoseMin={glucoseMin}
                glucoseMax={glucoseMax}
            />
        )

        const startDataGlucoseValue = screen.getByText(/5.0/)
        expect(startDataGlucoseValue).toBeInTheDocument()

        const startDataTrend = screen.getByText(/↓/)
        expect(startDataTrend).toBeInTheDocument()
    })
})
