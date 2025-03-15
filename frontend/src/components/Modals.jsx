import { useState, useEffect, useCallback } from "react"
import PropTypes from "prop-types"
import "../styles/Modals.css"

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
            <div className="modal-content bolus-modal">
                <button className="close-btn" onClick={onClose}>
                    ×
                </button>

                <h2>Carbohydrates</h2>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                    }}
                >
                    <img
                        src="/carbs.svg"
                        alt="Carbs"
                        style={{ width: 24, height: 24, marginRight: "8px" }}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            minWidth: "280px",
                        }}
                    >
                        <label
                            htmlFor="carbs-input"
                            style={{
                                fontSize: 12,
                                color: "#555",
                                marginBottom: 4,
                                textAlign: "center",
                            }}
                        >
                            Enter carbs (g)
                        </label>
                        <input
                            id="carbs-input"
                            type="number"
                            value={carbs}
                            onChange={(e) => setCarbs(e.target.value)}
                            className="input-box"
                            placeholder="Enter carbs (g)"
                        />
                    </div>
                </div>

                <h2>Correction</h2>
                {/* Correction Section */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    <input
                        type="text"
                        value={`Current reading: ${currentGlucose} mmol/L`}
                        readOnly
                        className="input-box"
                        style={{ width: "280px" }}
                    />
                    <input
                        type="text"
                        value={`Correction factor: ${correctionFactor} U`}
                        readOnly
                        className="input-box"
                        style={{ width: "280px" }}
                    />
                    <input
                        type="text"
                        value={`Insulin on board: ${insulinOnBoard} U`}
                        readOnly
                        className="input-box"
                        style={{ width: "280px" }}
                    />
                </div>

                {/* Horizontal Separator */}
                <div
                    style={{
                        width: "400px",
                        height: "1px",
                        background:
                            "linear-gradient(to right, #BCD4EB 0%, #BCD4EB 20%, #B6B6B6 20%, #B6B6B6 80%, #BCD4EB 80%, #BCD4EB 100%)",
                        margin: "16px 0",
                    }}
                />

                <h2>Total Bolus (U)</h2>
                <input
                    type="text"
                    value={carbs.toFixed(2)}
                    readOnly
                    className="total-bolus"
                    style={{ width: "280px" }}
                />

                <button className="inject-btn">INJECT</button>
            </div>
        </div>
    )
}

const SensorModal = ({
    isOpen,
    onClose,
    diabeticProfile,
    glucoseMin,
    glucoseTarget,
    glucoseMax,
    correctionFactor,
}) => {
    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content sensor-modal">
                <button className="close-btn" onClick={onClose}>
                    ×
                </button>
                <h3>
                    You are only able to view which UVA/PADOVA diabetic profile
                    you have been given.
                </h3>
                <p style={{ marginTop: "-3%" }}>
                    In a theoretical future build, you would be able to connect
                    your CGM. However due to the scope of this project and
                    ethical considerations, you are not able to do so in this
                    version.
                </p>
                {/* Horizontal separator */}
                <div
                    style={{
                        width: "400px",
                        height: "1px",
                        background:
                            "linear-gradient(to right, #F5E1C8 0%, #F5E1C8 20%, #B6B6B6 20%, #B6B6B6 80%, #F5E1C8 80%, #F5E1C8 100%)",
                    }}
                />
                <h2>Simulation Profile</h2>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                    }}
                >
                    <img
                        src="/user.svg"
                        alt="Diabetic profile"
                        style={{ width: 24, height: 24, marginRight: "8px" }}
                    />

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <label
                            htmlFor="diabetic-profile"
                            style={{
                                fontSize: 12,
                                color: "#555",
                                marginBottom: 4,
                                textAlign: "center",
                                whiteSpace: "normal",
                                maxWidth: "100%",
                            }}
                        >
                            Diabetic profile
                        </label>
                        <input
                            id="diabetic-profile"
                            type="text"
                            value={diabeticProfile}
                            readOnly
                            className="input-box"
                            style={{
                                backgroundColor: "#e4e4e4",
                                textAlign: "center",
                            }}
                        />
                    </div>
                </div>
                <h2>Glucose Targets & Correction</h2>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                    }}
                >
                    <img
                        src="/minglucose.svg"
                        alt="Minimum glucose level"
                        style={{ width: 24, height: 24, marginRight: "4%" }}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <label
                            htmlFor="glucose-min"
                            style={{
                                fontSize: 12,
                                color: "#555",
                                marginBottom: 4,
                                textAlign: "center",
                                whiteSpace: "normal",
                                maxWidth: "100%",
                            }}
                        >
                            Minimum glucose level (mmol/L)
                        </label>
                        <input
                            id="glucose-min"
                            type="number"
                            value={glucoseMin}
                            className="input-box"
                            placeholder="Minimum glucose level (mmol/L)"
                        />
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                    }}
                >
                    <img
                        src="/target.svg"
                        alt="Target glucose level"
                        style={{ width: 24, height: 24, marginRight: "4%" }}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <label
                            htmlFor="glucose-target"
                            style={{
                                fontSize: 12,
                                color: "#555",
                                marginBottom: 4,
                                textAlign: "center",
                                whiteSpace: "normal",
                                maxWidth: "100%",
                            }}
                        >
                            Target glucose level (mmol/L)
                        </label>
                        <input
                            id="glucose-target"
                            type="number"
                            value={glucoseTarget}
                            className="input-box"
                            placeholder="Target glucose level (mmol/L)"
                        />
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                    }}
                >
                    <img
                        src="/maxglucose.svg"
                        alt="Maximum glucose level"
                        style={{ width: 24, height: 24, marginRight: "4%" }}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <label
                            htmlFor="glucose-max"
                            style={{
                                fontSize: 12,
                                color: "#555",
                                marginBottom: 4,
                                textAlign: "center",
                                whiteSpace: "normal",
                                maxWidth: "100%",
                            }}
                        >
                            Maximum glucose level (mmol/L)
                        </label>
                        <input
                            id="glucose-max"
                            type="number"
                            value={glucoseMax}
                            className="input-box"
                            placeholder="Maximum glucose level (mmol/L)"
                        />
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                    }}
                >
                    <img
                        src="/correctfactor.svg"
                        alt="Correction factor"
                        style={{ width: 24, height: 24, marginRight: "4%" }}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <label
                            htmlFor="correction-factor"
                            style={{
                                fontSize: 12,
                                color: "#555",
                                marginBottom: 4,
                                textAlign: "center",
                                whiteSpace: "normal",
                                maxWidth: "100%",
                            }}
                        >
                            Correction factor (U/mmol/L)
                        </label>
                        <input
                            id="correction-factor"
                            type="number"
                            value={correctionFactor}
                            className="input-box"
                            placeholder="Correction factor (U/mmol/L)"
                        />
                    </div>
                </div>
                <button className="sensor-save-btn">SAVE</button>
            </div>
        </div>
    )
}

const PumpModal = ({ isOpen, onClose, basalRate, maxIOB, insulinDuration }) => {
    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content pump-modal">
                <button className="close-btn" onClick={onClose}>
                    ×
                </button>
                <h2>Basal & Safety Settings</h2>

                {/* Basal Rate */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                    }}
                >
                    <img
                        src="/basalrate.svg"
                        alt="Basal rate"
                        style={{ width: 24, height: 24, marginRight: "8px" }}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            minWidth: "280px",
                        }}
                    >
                        <label
                            htmlFor="basal-rate"
                            style={{
                                fontSize: 12,
                                color: "#555",
                                marginBottom: 4,
                                textAlign: "center",
                            }}
                        >
                            Basal rate (U/hr)
                        </label>
                        <input
                            id="basal-rate"
                            type="number"
                            value={basalRate}
                            className="input-box"
                            placeholder="Basal rate (U/hr)"
                        />
                    </div>
                </div>

                {/* Max IOB */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                    }}
                >
                    <img
                        src="/maxiob.svg"
                        alt="Maximum IOB"
                        style={{ width: 24, height: 24, marginRight: "8px" }}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            minWidth: "280px",
                        }}
                    >
                        <label
                            htmlFor="max-iob"
                            style={{
                                fontSize: 12,
                                color: "#555",
                                marginBottom: 4,
                                textAlign: "center",
                            }}
                        >
                            Maximum IOB (U)
                        </label>
                        <input
                            id="max-iob"
                            type="number"
                            value={maxIOB}
                            className="input-box"
                            placeholder="Maximum IOB (U)"
                        />
                    </div>
                </div>

                <p>
                    Your basal rate should constitute{" "}
                    <strong>~40% of your total daily dose</strong> of insulin.
                    Please consult with your doctor before increasing your
                    maximum IOB.
                </p>

                {/* Horizontal Separator */}
                <div
                    style={{
                        width: "400px",
                        height: "1px",
                        background:
                            "linear-gradient(to right, #EAC7EB 0%, #EAC7EB 20%, #B6B6B6 20%, #B6B6B6 80%, #EAC7EB 80%, #EAC7EB 100%)",
                    }}
                />

                <h2>Insulin Pharmacokinetics</h2>

                {/* Insulin Duration */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "center",
                    }}
                >
                    <img
                        src="/insuldur.svg"
                        alt="Insulin duration"
                        style={{ width: 24, height: 24, marginRight: "8px" }}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            minWidth: "280px",
                        }}
                    >
                        <label
                            htmlFor="insulin-duration"
                            style={{
                                fontSize: 12,
                                color: "#555",
                                marginBottom: 4,
                                textAlign: "center",
                            }}
                        >
                            Duration of active insulin (minutes)
                        </label>
                        <input
                            id="insulin-duration"
                            type="number"
                            value={insulinDuration}
                            className="input-box"
                            placeholder="Duration of active insulin (minutes)"
                        />
                    </div>
                </div>

                <p>
                    Depending on the kind of insulin you use, its active
                    duration can vary. Rapid-acting insulin typically lasts{" "}
                    <strong>180-300 minutes</strong> in the body.
                </p>

                <button className="pump-save-btn">SAVE</button>
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

SensorModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    diabeticProfile: PropTypes.string.isRequired,
    glucoseMin: PropTypes.number.isRequired,
    glucoseTarget: PropTypes.number.isRequired,
    glucoseMax: PropTypes.number.isRequired,
    correctionFactor: PropTypes.number.isRequired,
}

PumpModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    basalRate: PropTypes.number.isRequired,
    maxIOB: PropTypes.number.isRequired,
    insulinDuration: PropTypes.number.isRequired,
}

export { BolusModal, SensorModal, PumpModal }
