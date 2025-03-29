import { useState, useEffect } from "react"
import PropTypes from "prop-types"
import "../styles/GlucoseReading.css"

const GlucoseReading = ({ data, startData, glucoseMin, glucoseMax }) => {
    const [glucoseValue, setGlucoseValue] = useState("...")
    const [trend, setTrend] = useState("NODATA")

    // When starting, retrieve latest glucose reading from local storage
    useEffect(() => {
        if (startData) {
            setGlucoseValue(parseFloat(startData.glucose).toFixed(1))
            setTrend(startData.trend)
        }
    }, [startData])

    // Update glucose value when new data comes in
    useEffect(() => {
        if (data.length > 0) {
            const latestReading = data[data.length - 1]
            setGlucoseValue(parseFloat(latestReading.glucose).toFixed(1))
            setTrend(latestReading.trend)
        }
    }, [data])

    // Determine border color based on glucose value
    let borderColor = "#B3B3B3" // Grey (No data or zero reading)
    if (glucoseValue > 0.0 && glucoseValue < glucoseMin)
        borderColor = "#B53A3A" // Red (Low)
    else if (glucoseValue > glucoseMin && glucoseValue < glucoseMax)
        borderColor = "#3AA246" // Green (Good range)
    else if (glucoseValue > glucoseMax) borderColor = "#CBA63F" // Yellow (High)

    return (
        <div className="glucose-container">
            <div
                data-testid="glucose-circle"
                className="glucose-circle"
                style={{ borderColor: borderColor }} // Apply dynamic border color
            >
                <h1 className="glucose-value">
                    {glucoseValue === "..." ? "0" : glucoseValue}
                    <span className="glucose-trend">
                        {trend === "NODATA" ? "." : trend}
                    </span>
                </h1>
                <p className="glucose-unit">mmol/L</p>
            </div>
        </div>
    )
}

// Prop Validation
GlucoseReading.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            glucose: PropTypes.number.isRequired,
            trend: PropTypes.string.isRequired,
        })
    ).isRequired,
    startData: PropTypes.arrayOf(
        PropTypes.shape({
            glucose: PropTypes.number.isRequired,
            trend: PropTypes.string.isRequired,
        })
    ).isRequired,
    glucoseMin: PropTypes.number.isRequired,
    glucoseMax: PropTypes.number.isRequired,
}

export default GlucoseReading
