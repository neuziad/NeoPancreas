import { useState, useEffect, useCallback } from "react"
import PropTypes from "prop-types"

const EXERCISE_MODE_MODIFIER = 0.75

/* TO-DO: Bolus modal needs revamping and titrate_bolus algorith has to be re-written to receive
 * bolus data from modal */
const BolusModal = ({
    isOpen,
    onClose,
    emEnabled,
    currentGlucose = 7.0,
    carbRatio,
    correctionFactor,
    glucoseTarget,
    glucoseMin,
    insulinOnBoard,
    maxBolus,
}) => {
    const [carbs, setCarbs] = useState(0)

    // Function to calculate bolus
    const calculateBolus = useCallback(() => {
        if (currentGlucose < glucoseMin) {
            return 0
        }

        let bolusPerStep = carbs / carbRatio
        bolusPerStep += (currentGlucose - glucoseTarget) / correctionFactor

        if (emEnabled) bolusPerStep *= EXERCISE_MODE_MODIFIER

        bolusPerStep -= insulinOnBoard

        // Ensure bolus is within limits
        bolusPerStep = Math.max(0, Math.min(bolusPerStep, maxBolus))

        // Round to nearest 0.05 for pump precision
        return Math.round(bolusPerStep / 0.05) * 0.05
    }, [
        carbs,
        carbRatio,
        currentGlucose,
        glucoseTarget,
        correctionFactor,
        emEnabled,
        insulinOnBoard,
        maxBolus,
        glucoseMin,
    ])

    useEffect(() => {
        setCarbs(calculateBolus())
    }, [calculateBolus])

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-btn" onClick={onClose}>
                    ×
                </button>

                <h2>Carbohydrates</h2>
                <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="input-box"
                    placeholder="Enter carbs (g)"
                />

                <h2>Correction</h2>
                <div className="correction-section">
                    <input
                        type="text"
                        value={`Current reading: ${currentGlucose} mmol/L`}
                        readOnly
                        className="input-box"
                    />
                    <input
                        type="text"
                        value={`Correction factor: ${correctionFactor} U`}
                        readOnly
                        className="input-box"
                    />
                    <input
                        type="text"
                        value={`Insulin on board: ${insulinOnBoard} U`}
                        readOnly
                        className="input-box"
                    />
                </div>

                <h2>Total bolus (U)</h2>
                <input
                    type="text"
                    value={carbs.toFixed(2)}
                    readOnly
                    className="total-bolus"
                />

                <button className="inject-btn">INJECT</button>
            </div>
        </div>
    )
}

BolusModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    emEnabled: PropTypes.bool.isRequired,
    carbs: PropTypes.number.isRequired,
    currentGlucose: PropTypes.number,
    carbRatio: PropTypes.number.isRequired,
    correctionFactor: PropTypes.number.isRequired,
    glucoseTarget: PropTypes.number.isRequired,
    glucoseMin: PropTypes.number.isRequired,
    insulinOnBoard: PropTypes.number.isRequired,
    maxBolus: PropTypes.number.isRequired,
}

export default BolusModal
