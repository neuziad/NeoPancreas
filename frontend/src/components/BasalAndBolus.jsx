import axios from 'axios'
import PropTypes from 'prop-types'
import { ACCESS_TOKEN } from '../constants'
import { useState } from 'react'

// TO-DO: Implement bolus button
const BasalAndBolus = ({ basalrate, emEnabled, iob }) => {
    const [localEmEnabled, setLocalEmEnabled] = useState(emEnabled)

    // TO-DO: Implement logic to update exercise mode
    const toggleExerciseMode = async () => {
        try {
            const token = localStorage.getItem(ACCESS_TOKEN)
            const newEmEnabled = !localEmEnabled

            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/user-profile/`,
                { em_enabled: newEmEnabled },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            setLocalEmEnabled(newEmEnabled) // Update local state
        } catch (error) {
            console.error('❌ Error updating exercise mode:', error)
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
                IOB: {iob} U
            </div>
            <button onClick={toggleExerciseMode}>
                {localEmEnabled
                    ? 'Disable Exercise Mode'
                    : 'Enable Exercise Mode'}
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
