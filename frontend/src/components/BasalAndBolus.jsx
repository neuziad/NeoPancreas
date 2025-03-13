import axios from "axios"
import PropTypes from "prop-types"
import { ACCESS_TOKEN } from "../constants"
import { useState } from "react"
// import BolusModal from './Modals'
import "../styles/BasalAndBolus.css"

const BasalAndBolus = ({ basalrate, emEnabled, iob, isRunning }) => {
    const [localEmEnabled, setLocalEmEnabled] = useState(emEnabled)
    // const [isModalOpen, setIsModalOpen] = useState(false)

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

    // const showBolusPrompt = () => {
    //     setIsModalOpen(true)
    // }

    // const closeBolusModal = () => {
    //     setIsModalOpen(false)
    // }

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
                <div
                    className="bolus-section"
                    onClick={() => {}} /* onClick={showBolusPrompt} */
                >
                    <h2>Bolus</h2>
                    <div className="bolus-icon">
                        {/* Placeholder for an icon (replace with actual img if needed) */}
                        💉
                    </div>
                    <p>Click here to administer bolus</p>
                </div>

                {/* Bolus modal */}
                {/* <BolusModal
                    isOpen={isModalOpen}
                    onClose={closeBolusModal}
                    emEnabled={emEnabled}
                    carbs={0}
                    currentGlucose={currentGlucose}
                    carbRatio={carbRatio}
                    correctionFactor={correctionFactor}
                    glucoseTarget={glucoseTarget}
                    glucoseMin={glucoseMin}
                    insulinOnBoard={iob}
                    maxBolus={bolusMax}
                /> */}

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
    // bolusMax: PropTypes.number.isRequired,
    // currentGlucose: PropTypes.number.isRequired,
    // carbRatio: PropTypes.number.isRequired,
    // correctionFactor: PropTypes.number.isRequired,
    // glucoseTarget: PropTypes.number.isRequired,
    // glucoseMin: PropTypes.number.isRequired,
}

export default BasalAndBolus
