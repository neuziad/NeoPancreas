import { useState, useEffect, useCallback } from "react"
import PropTypes from "prop-types"
import "../styles/Modals.css"
import axios from "axios"
import { ACCESS_TOKEN } from "../constants"

const EXERCISE_MODE_MODIFIER = 0.25

const BolusModal = ({
    isOpen,
    onClose,
    emEnabled,
    currentGlucose,
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
        if (currentGlucose < glucoseMin) return 0

        let bolusDose = carbs / carbRatio
        bolusDose += (currentGlucose - glucoseTarget) / correctionFactor

        if (emEnabled) bolusDose *= EXERCISE_MODE_MODIFIER

        bolusDose -= insulinOnBoard

        // Ensure bolus is within limits
        bolusDose = Math.max(0, Math.min(bolusDose, maxBolus))

        // Round to nearest 0.05 for pump precision
        return Math.round(bolusDose / 0.05) * 0.05
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

    const [bolus, setBolus] = useState(calculateBolus())

    useEffect(() => {
        setBolus(calculateBolus())
    }, [calculateBolus])

    // Handle changes
    const handleCarbsChange = (e) => {
        setCarbs(e.target.value)
    }

    // Handle the sending of bolus data to backend (or "injecting")
    const handleBolusInjection = async () => {
        try {
            const token = localStorage.getItem(ACCESS_TOKEN)
            if (!token) {
                alert("You must be logged in to inject bolus.")
                return
            }

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/inject-bolus/`,
                { bolus },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )

            console.log("✅ Bolus injection recorded:", response.data)
            alert(
                "Bolus injection recorded! It will be applied for the next glucose reading."
            )
        } catch (error) {
            console.error("❌ Error injecting bolus:", error)
            alert("Failed to inject bolus.")
        }
    }

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
                            step={0.5}
                            min={0}
                            value={carbs}
                            onChange={handleCarbsChange}
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
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <img
                            src="/currentreading.svg"
                            alt="Current reading"
                            style={{ width: 24, height: 24 }}
                        />
                        <input
                            type="text"
                            value={`Current reading: ${parseFloat(currentGlucose).toFixed(1)} mmol/L`}
                            readOnly
                            className="input-box"
                            style={{ width: "240px" }}
                        />
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <img
                            src="/correctfactor.svg"
                            alt="Correction factor"
                            style={{ width: 24, height: 24 }}
                        />
                        <input
                            type="text"
                            value={`Correction factor: ${correctionFactor} U`}
                            readOnly
                            className="input-box"
                            style={{ width: "240px" }}
                        />
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <img
                            src="/maxiob.svg"
                            alt="Insulin on board"
                            style={{ width: 24, height: 24 }}
                        />
                        <input
                            type="text"
                            value={`Insulin on board: ${insulinOnBoard} U`}
                            readOnly
                            className="input-box"
                            style={{ width: "240px" }}
                        />
                    </div>
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
                    value={parseFloat(bolus).toFixed(2)}
                    readOnly
                    max={maxBolus}
                    className="total-bolus"
                    style={{ width: "280px" }}
                />

                <button className="inject-btn" onClick={handleBolusInjection}>
                    INJECT
                </button>
            </div>
        </div>
    )
}

const SensorModal = ({
    isOpen,
    onClose,
    diabeticProfile,
    glucoseMin: initialGlucoseMin,
    glucoseTarget: initialGlucoseTarget,
    glucoseMax: initialGlucoseMax,
    correctionFactor: initialCorrectionFactor,
    fetchUserProfile,
}) => {
    const [glucoseMin, setGlucoseMin] = useState(initialGlucoseMin)
    const [glucoseTarget, setGlucoseTarget] = useState(initialGlucoseTarget)
    const [glucoseMax, setGlucoseMax] = useState(initialGlucoseMax)
    const [correctionFactor, setCorrectionFactor] = useState(
        initialCorrectionFactor
    )

    useEffect(() => {
        console.log("Received props:", {
            initialGlucoseMin,
            initialGlucoseTarget,
            initialGlucoseMax,
            initialCorrectionFactor,
        })
        setGlucoseMin(initialGlucoseMin || 0)
        setGlucoseTarget(initialGlucoseTarget || 0)
        setGlucoseMax(initialGlucoseMax || 0)
        setCorrectionFactor(initialCorrectionFactor || 0)
    }, [
        initialGlucoseMin,
        initialGlucoseTarget,
        initialGlucoseMax,
        initialCorrectionFactor,
    ])

    // Handle changes
    const handleGlucoseMinChange = (e) => setGlucoseMin(e.target.value)
    const handleGlucoseTargetChange = (e) => setGlucoseTarget(e.target.value)
    const handleGlucoseMaxChange = (e) => setGlucoseMax(e.target.value)
    const handleCorrectionFactorChange = (e) =>
        setCorrectionFactor(e.target.value)

    if (!isOpen) return null

    const handleSave = async () => {
        try {
            const token = localStorage.getItem(ACCESS_TOKEN)

            if (!token) {
                alert("You must be logged in to save settings.")
                return
            }

            const response = await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/sensor-settings/`,
                {
                    glucose_min: glucoseMin,
                    glucose_target: glucoseTarget,
                    glucose_max: glucoseMax,
                    correction_factor: correctionFactor,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )

            console.log("✅ Sensor settings updated:", response.data)
            alert("Settings saved successfully!")

            fetchUserProfile()
        } catch (error) {
            console.error(
                "❌ Error saving sensor settings:",
                error.response || error
            )
            alert(
                `Failed to save settings: ${error.response?.data?.detail || "Unknown error"}`
            )
        }
    }

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
                            step={0.1}
                            min={2.8}
                            max={4.0}
                            value={glucoseMin}
                            onChange={handleGlucoseMinChange}
                            className="input-box"
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
                            step={0.1}
                            min={5.5}
                            max={8.5}
                            value={glucoseTarget}
                            onChange={handleGlucoseTargetChange}
                            className="input-box"
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
                            step={0.1}
                            min={9.0}
                            max={15.0}
                            value={glucoseMax}
                            onChange={handleGlucoseMaxChange}
                            className="input-box"
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
                            step={0.1}
                            value={parseFloat(correctionFactor).toFixed(1)}
                            min={0.1}
                            max={10.0}
                            onChange={handleCorrectionFactorChange}
                            className="input-box"
                        />
                    </div>
                </div>
                <button className="sensor-save-btn" onClick={handleSave}>
                    SAVE
                </button>
            </div>
        </div>
    )
}

const PumpModal = ({
    isOpen,
    onClose,
    basalRate: initialBasalRate,
    maxBolus: initialMaxBolus,
    maxIOB: initialMaxIOB,
    insulinDuration: initialInsulinDuration,
    carbRatio: initialCarbRatio,
    fetchUserProfile,
}) => {
    const [basalRate, setBasalRate] = useState(initialBasalRate)
    const [maxBolus, setMaxBolus] = useState(initialMaxBolus)
    const [maxIOB, setMaxIOB] = useState(initialMaxIOB)
    const [insulinDuration, setInsulinDuration] = useState(
        initialInsulinDuration
    )
    const [carbRatio, setCarbRatio] = useState(initialCarbRatio)

    useEffect(() => {
        console.log("Received props:", {
            initialBasalRate,
            initialMaxBolus,
            initialMaxIOB,
            initialInsulinDuration,
            initialCarbRatio,
        })
        setBasalRate(initialBasalRate)
        setMaxBolus(initialMaxBolus)
        setMaxIOB(initialMaxIOB)
        setInsulinDuration(initialInsulinDuration)
        setCarbRatio(initialCarbRatio)
    }, [
        initialBasalRate,
        initialMaxIOB,
        initialMaxBolus,
        initialInsulinDuration,
        initialCarbRatio,
    ])

    // Handle changes
    const handleBasalRateChange = (e) => setBasalRate(e.target.value)
    const handleMaxBolusChange = (e) => setMaxBolus(e.target.value)
    const handleMaxIOBChange = (e) => setMaxIOB(e.target.value)
    const handleInsulinDurationChange = (e) =>
        setInsulinDuration(e.target.value)
    const handleCarbRatioChange = (e) => setCarbRatio(e.target.value)

    const handleSave = async () => {
        try {
            const token = localStorage.getItem(ACCESS_TOKEN)

            if (!token) {
                alert("You must be logged in to save settings.")
                return
            }

            const response = await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/pump-settings/`,
                {
                    basal_rate: basalRate,
                    bolus_max: maxBolus,
                    max_iob: maxIOB,
                    insulin_duration: insulinDuration,
                    carb_ratio: carbRatio,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )

            console.log("✅ Pump settings updated:", response.data)
            alert("Settings saved successfully!")

            fetchUserProfile()
        } catch (error) {
            console.error(
                "❌ Error saving pump settings:",
                error.response || error
            )
            alert(
                `Failed to save settings: ${error.response?.data?.detail || "Unknown error"}`
            )
        }
    }

    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal-content pump-modal">
                <button className="close-btn" onClick={onClose}>
                    ×
                </button>
                <h2>Basal & Safety Settings</h2>

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
                            step={0.05}
                            min={0.75}
                            max={25.0}
                            value={basalRate}
                            onChange={handleBasalRateChange}
                            className="input-box"
                            placeholder="Basal rate (U/hr)"
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
                            step={0.5}
                            min={25}
                            max={50}
                            value={maxIOB}
                            onChange={handleMaxIOBChange}
                            className="input-box"
                            placeholder="Maximum IOB (U)"
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
                        src="/maxiob.svg"
                        alt="Maximum bolus"
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
                            htmlFor="max-bolus"
                            style={{
                                fontSize: 12,
                                color: "#555",
                                marginBottom: 4,
                                textAlign: "center",
                            }}
                        >
                            Maximum bolus (U)
                        </label>
                        <input
                            id="max-bolus"
                            type="number"
                            step={0.5}
                            min={15}
                            max={30}
                            value={maxBolus}
                            onChange={handleMaxBolusChange}
                            className="input-box"
                            placeholder="Maximum bolus (U)"
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
                        src="/carbratio.svg"
                        alt="Carb ratio"
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
                            htmlFor="carb-ratio"
                            style={{
                                fontSize: 12,
                                color: "#555",
                                marginBottom: 4,
                                textAlign: "center",
                            }}
                        >
                            Carb ratio (g/U)
                        </label>
                        <input
                            id="carb-ratio"
                            type="number"
                            step={1}
                            min={1}
                            max={100}
                            value={carbRatio}
                            onChange={handleCarbRatioChange}
                            className="input-box"
                            placeholder="Carb ratio (g/U)"
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
                            step={1}
                            min={180}
                            max={400}
                            value={insulinDuration}
                            onChange={handleInsulinDurationChange}
                            className="input-box"
                            placeholder="Duration of active insulin (minutes)"
                        />
                    </div>
                </div>

                <button className="pump-save-btn" onClick={handleSave}>
                    SAVE
                </button>
            </div>
        </div>
    )
}

const FooterModals = () => {
    const [isAttributionsOpen, setIsAttributionsOpen] = useState(false)
    const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false)

    return (
        <div className="dash-footer">
            <p onClick={() => setIsAttributionsOpen(true)}>
                Copyright / Attributions
            </p>
            <p onClick={() => setIsDisclaimerOpen(true)}>Medical Disclaimer</p>

            {/* Copyright / Attributions Modal */}
            {isAttributionsOpen && (
                <div
                    className="modal-overlay"
                    onClick={() => setIsAttributionsOpen(false)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2>Copyright / Attributions</h2>
                        <p>
                            All rights reserved. Some assets may be attributed
                            to their original creators.
                        </p>
                        <button onClick={() => setIsAttributionsOpen(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Medical Disclaimer Modal */}
            {isDisclaimerOpen && (
                <div
                    className="modal-overlay"
                    onClick={() => setIsDisclaimerOpen(false)}
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2>Medical Disclaimer</h2>
                        <p>
                            This app does not provide medical advice. Always
                            consult with a healthcare professional.
                        </p>
                        <button onClick={() => setIsDisclaimerOpen(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
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
    fetchUserProfile: PropTypes.func.isRequired,
}

PumpModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    basalRate: PropTypes.number.isRequired,
    maxBolus: PropTypes.number.isRequired,
    maxIOB: PropTypes.number.isRequired,
    insulinDuration: PropTypes.number.isRequired,
    carbRatio: PropTypes.number.isRequired,
    fetchUserProfile: PropTypes.func.isRequired,
}

export { BolusModal, SensorModal, PumpModal, FooterModals }
