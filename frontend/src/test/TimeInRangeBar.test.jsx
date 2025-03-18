import { render, screen } from "@testing-library/react"
import TimeInRangeBar from "../components/TimeInRangeBar"
import { describe, expect, it } from "@jest/globals"

const mockData = [
    { timestamp: 1, glucose: 3.5 }, // Low
    { timestamp: 2, glucose: 4.2 }, // In range
    { timestamp: 3, glucose: 10.8 }, // In range
    { timestamp: 4, glucose: 11.5 }, // High
    { timestamp: 5, glucose: 12.0 }, // High
    { timestamp: 6, glucose: 6.5 }, // In range
    { timestamp: 7, glucose: 8.9 }, // In range
]

describe("TimeInRangeBar Component", () => {
    it("renders without crashing", () => {
        render(
            <TimeInRangeBar data={mockData} glucoseMin={3.9} glucoseMax={11} />
        )
        expect(screen.getByText(/Time in range/i)).toBeInTheDocument()
    })

    it("calculates correct percentage values", () => {
        render(
            <TimeInRangeBar data={mockData} glucoseMin={3.9} glucoseMax={11} />
        )

        // Expect the correct percentage values to appear
        expect(screen.getByText("14%")).toBeInTheDocument() // Low (1/7 entries)
        expect(screen.getByText("57%")).toBeInTheDocument() // In Range (4/7 entries)
        expect(screen.getByText("29%")).toBeInTheDocument() // High (2/7 entries)
    })

    it("displays the correct proportions within bar", () => {
        render(
            <TimeInRangeBar data={mockData} glucoseMin={3.9} glucoseMax={11} />
        )

        const lowSegment = screen.getByTestId("low-tir")
        const inRangeSegment = screen.getByTestId("in-range-tir")
        const highSegment = screen.getByTestId("high-tir")

        expect(lowSegment).toHaveStyle("height: 14.3%")
        expect(inRangeSegment).toHaveStyle("height: 57.1%")
        expect(highSegment).toHaveStyle("height: 28.6%")
    })

    it("displays empty state if no data is provided", () => {
        render(<TimeInRangeBar data={[]} glucoseMin={3.9} glucoseMax={11} />)
        expect(screen.queryByText("%")).not.toBeInTheDocument()
    })
})
