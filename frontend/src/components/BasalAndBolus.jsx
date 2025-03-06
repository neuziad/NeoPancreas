import axios from 'axios'
import PropTypes from 'prop-types'
import { ACCESS_TOKEN } from '../constants'
import { useState } from 'react'

// TO-DO: Implement bolus button
const BasalAndBolus = ({ basalrate, emEnabled, iob }) => {
    const [localEmEnabled, setLocalEmEnabled] = useState(emEnabled)

    const toggleExerciseMode = async () => {
        try {
            const token = localStorage.getItem(ACCESS_TOKEN)

            await axios.get(
                `${import.meta.env.VITE_API_URL}/api/toggle-em/`,
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setLocalEmEnabled((prev) => !prev)
        } catch (error) {
            console.error('❌ Error toggling exercise mode:', error)
        }
    }

    return (
        <div>
            <div
                style={{
                    padding: '5px',
                    border: '1px solid black',
                    display: 'inline-block',
                }}
            >
                IOB: {iob}U
            </div>
            <button onClick={toggleExerciseMode}>
                {localEmEnabled
                    ? 'Exercise Mode: Enabled'
                    : 'Exercise Mode: Disabled'}
            </button>
            <div
                style={{
                    margin: '20px 0',
                    fontSize: '24px',
                    fontWeight: 'bold',
                }}
            >
                Basal Rate: {basalrate} U/hr
            </div>
        </div>
    )
}

// Prop Validation
BasalAndBolus.propTypes = {
    basalrate: PropTypes.number.isRequired,
    emEnabled: PropTypes.bool.isRequired,
    iob: PropTypes.number.isRequired,
}

export default BasalAndBolus
