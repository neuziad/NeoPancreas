import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import '../styles/GlucoseReading.css'
// import axios from 'axios'
// import { ACCESS_TOKEN } from '../constants'

const GlucoseReading = ({ data, startData, glucoseMin, glucoseMax }) => {
    const [glucoseValue, setGlucoseValue] = useState(
        data.length > 0 ? data[data.length - 1].glucose : 0.0
    )
    const [trend, setTrend] = useState('')

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
    let borderColor = '#3AA246' // Green (Good range)
    if (glucoseValue === 0.0)
        borderColor = '#B3B3B3' // Grey (No data or zero reading)
    else if (glucoseValue > 0.0 && glucoseValue < glucoseMin)
        borderColor = '#B53A3A' // Red (Low)
    else if (glucoseValue > glucoseMax) borderColor = '#CBA63F' // Yellow (High)

    return (
        <div className="glucose-container">
            <div
                className="glucose-circle"
                style={{ borderColor: borderColor }} // Apply dynamic border color
            >
                <h1 className="glucose-value">
                    {glucoseValue}{' '}
                    <span className="glucose-trend">{trend}</span>
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
