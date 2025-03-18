import axios from "axios"
import PropTypes from "prop-types"
import { ACCESS_TOKEN } from "../constants"
import { useState } from "react"
import "../styles/BasalAndBolus.css"

const BasalAndBolus = ({
    basalrate,
    emEnabled,
    iob,
    isRunning,
    onOpenBolus,
}) => {
    const [localEmEnabled, setLocalEmEnabled] = useState(emEnabled)

    const toggleExerciseMode = async () => {
        try {
            const token = localStorage.getItem(ACCESS_TOKEN)

            await axios.get(`${import.meta.env.VITE_API_URL}/api/toggle-em/`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            setLocalEmEnabled((prev) => !prev)
        } catch (error) {
            console.error("❌ Error toggling exercise mode:", error)
        }
    }

    return (
        <div className="container">
            {/* IOB Display */}
            <div className="iob-box">
                <span>
                    <span style={{ color: "#4A4A4A", fontSize: "0.8rem" }}>
                        IOB
                    </span>{" "}
                    <strong style={{ fontSize: "1.3rem" }}>
                        {isRunning ? `${iob}U` : "--U"}
                    </strong>{" "}
                    approx.
                </span>
            </div>

            {/* Exercise Mode Toggle */}
            <button
                className={`exercise-mode ${localEmEnabled ? "enabled" : "disabled"}`}
                onClick={toggleExerciseMode}
            >
                <span>Exercise mode?</span> {localEmEnabled ? "ON" : "OFF"}
            </button>

            <div className="insulin-sections">
                {/* Bolus section */}
                <div className="bolus-section" onClick={onOpenBolus}>
                    <h2>Bolus</h2>
                    <div className="bolus-icon">
                        {/* Placeholder for an icon (replace with actual img if needed) */}
                        💉
                    </div>
                    <p>Click here to administer bolus</p>
                </div>

                {/* Basal section */}
                <div className="basal-section">
                    <h2>Basal</h2>
                    <div className="basal-rate">
                        <span style={{ fontSize: "4.25rem", fontWeight: 600 }}>
                            {basalrate}
                        </span>
                        U/hr
                    </div>
                </div>
            </div>
        </div>
    )
}

// Prop Validation
BasalAndBolus.propTypes = {
    basalrate: PropTypes.number.isRequired,
    emEnabled: PropTypes.bool.isRequired,
    iob: PropTypes.number.isRequired,
    isRunning: PropTypes.bool.isRequired,
    onOpenBolus: PropTypes.func.isRequired,
}

export default BasalAndBolus
