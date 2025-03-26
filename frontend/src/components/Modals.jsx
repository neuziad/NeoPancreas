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

    const calculateBolus = useCallback(() => {
        if (currentGlucose < glucoseMin) return 0

        let bolusDose = carbs / carbRatio
        bolusDose += (currentGlucose - glucoseTarget) / correctionFactor

        if (emEnabled) bolusDose *= EXERCISE_MODE_MODIFIER

        bolusDose -= insulinOnBoard
        return Math.max(0, Math.min(bolusDose, maxBolus)).toFixed(2)
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
                { headers: { Authorization: `Bearer ${token}` } }
            )

            console.log("✅ Bolus injection recorded:", response.data)
            alert(
                "Bolus injection recorded! It will be applied for the next glucose reading."
            )
        } catch (error) {
            alert("Failed to inject bolus: ", error)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 flex items-center justify-center modal-overlay">
            <div className="bg-[#BCD4EB] w-[400px] p-6 rounded-xl shadow-lg relative text-center">
                <button
                    className="absolute top-3 right-3 text-xl"
                    style={{ cursor: "pointer" }}
                    onClick={onClose}
                >
                    ×
                </button>
                <h2 className="font-semibold text-lg">Carbohydrates</h2>
                <div className="flex items-center gap-2 mt-2 justify-center">
                    <img src="/carbs.svg" alt="Carbs" className="w-6 h-6" />
                    <div className="flex flex-col w-4/5">
                        <label className="text-xs text-gray-700">
                            Enter carbs (g)
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={carbs}
                            onChange={(e) => setCarbs(e.target.value)}
                            className="border rounded-md px-3 py-1 text-center w-full"
                        />
                    </div>
                </div>
                <h2 className="font-semibold text-lg mt-4">Correction</h2>
                {[
                    {
                        label: "Current reading (mmol/L)",
                        icon: "/currentreading.svg",
                        value: currentGlucose.toFixed(1) + " mmol/L",
                    },
                    {
                        label: "Correction factor (U)",
                        icon: "/correctfactor.svg",
                        value: correctionFactor + " U",
                    },
                    {
                        label: "Insulin on board (U)",
                        icon: "/maxiob.svg",
                        value: insulinOnBoard + " U",
                    },
                ].map(({ label, icon, value }) => (
                    <div
                        key={label}
                        className="flex items-center gap-2 mt-2 justify-center"
                    >
                        <img src={icon} alt={label} className="w-6 h-6" />
                        <div className="flex flex-col w-3/5">
                            <label className="text-xs text-gray-700">
                                {label}
                            </label>
                            <input
                                type="text"
                                value={value}
                                readOnly
                                className="border rounded-md px-3 py-1 text-center w-full"
                            />
                        </div>
                    </div>
                ))}

                <div className="border-t border-gray-400 my-3"></div>
                <h2 className="font-semibold text-lg">Total Bolus (U)</h2>
                <input
                    type="text"
                    value={bolus}
                    readOnly
                    className="border rounded-md px-3 py-1 text-center w-4/5 bg-gray-300"
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
                { headers: { Authorization: `Bearer ${token}` } }
            )

            console.log("✅ Sensor settings updated:", response.data)
            alert("Settings saved successfully!")
            fetchUserProfile()
        } catch (error) {
            alert(
                `Failed to save settings: ${error.response?.data?.detail || "Unknown error"}`
            )
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-25 modal-overlay">
            <div className="bg-[#F5E1C8] w-[400px] p-6 rounded-xl shadow-lg relative text-center">
                <button
                    className="absolute top-3 right-3 text-xl"
                    style={{ cursor: "pointer" }}
                    onClick={onClose}
                >
                    ×
                </button>
                <h3 className="font-semibold text-md mb-2">
                    You are only able to view which UVA/PADOVA diabetic profile
                    you have been given.
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    In a theoretical future build, you would be able to connect
                    your CGM. However, due to the scope of this project and
                    ethical considerations, you are not able to do so in this
                    version.
                </p>
                <div className="border-t border-gray-400 my-3"></div>

                <h2 className="font-semibold text-lg">Simulation Profile</h2>
                <div className="flex items-center gap-2 mt-2 justify-center">
                    <img
                        src="/user.svg"
                        alt="Diabetic profile"
                        className="w-6 h-6"
                    />
                    <div className="flex flex-col">
                        <label className="text-xs text-gray-700">
                            Diabetic profile
                        </label>
                        <input
                            type="text"
                            value={diabeticProfile}
                            readOnly
                            className="bg-gray-300 text-center rounded-md px-3 py-1"
                        />
                    </div>
                </div>

                <h2 className="font-semibold text-lg mt-4">
                    Glucose Targets & Correction
                </h2>
                {[
                    {
                        label: "Minimum glucose (mmol/L)",
                        icon: "/minglucose.svg",
                        value: glucoseMin,
                        setter: setGlucoseMin,
                        min: 2.8,
                        max: 4.0,
                    },
                    {
                        label: "Target glucose (mmol/L)",
                        icon: "/target.svg",
                        value: glucoseTarget,
                        setter: setGlucoseTarget,
                        min: 5.5,
                        max: 8.5,
                    },
                    {
                        label: "Maximum glucose (mmol/L)",
                        icon: "/maxglucose.svg",
                        value: glucoseMax,
                        setter: setGlucoseMax,
                        min: 9.0,
                        max: 15.0,
                    },
                    {
                        label: "Correction factor (U/mmol/L)",
                        icon: "/correctfactor.svg",
                        value: correctionFactor,
                        setter: setCorrectionFactor,
                        min: 0.1,
                        max: 10.0,
                    },
                ].map(({ label, icon, value, setter, min, max }) => (
                    <div
                        key={label}
                        className="flex items-center gap-2 mt-2 justify-center"
                    >
                        <img src={icon} alt={label} className="w-6 h-6" />
                        <div className="flex flex-col w-3/5">
                            <label className="text-xs text-gray-700">
                                {label}
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min={min}
                                max={max}
                                value={value}
                                onChange={(e) => setter(e.target.value)}
                                className="border rounded-md px-2 py-1 text-center w-full"
                            />
                        </div>
                    </div>
                ))}

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
        setBasalRate(initialBasalRate || 0)
        setMaxBolus(initialMaxBolus || 0)
        setMaxIOB(initialMaxIOB || 0)
        setInsulinDuration(initialInsulinDuration || 0)
        setCarbRatio(initialCarbRatio || 0)
    }, [
        initialBasalRate,
        initialMaxBolus,
        initialMaxIOB,
        initialInsulinDuration,
        initialCarbRatio,
    ])

    const handleSave = async () => {
        try {
            const token = localStorage.getItem(ACCESS_TOKEN)
            if (!token) {
                alert("You must be logged in to save settings.")
                return
            }
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/pump-settings/`,
                {
                    basal_rate: basalRate,
                    bolus_max: maxBolus,
                    max_iob: maxIOB,
                    insulin_duration: insulinDuration,
                    carb_ratio: carbRatio,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            alert("Pump settings saved successfully!")
            fetchUserProfile()
        } catch (error) {
            alert(
                `Failed to save settings: ${error.response?.data?.detail || "Unknown error"}`
            )
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-25 modal-overlay">
            <div className="bg-[#EAC7EB] w-[400px] p-6 rounded-xl shadow-lg relative text-center">
                <button
                    className="absolute top-3 right-3 text-xl"
                    style={{ cursor: "pointer" }}
                    onClick={onClose}
                >
                    ×
                </button>
                <h2 className="font-semibold text-lg">
                    Basal & Safety Settings
                </h2>

                {[
                    {
                        label: "Basal rate (U/hr)",
                        icon: "/basalrate.svg",
                        value: basalRate,
                        setter: setBasalRate,
                        min: 0.75,
                        max: 25.0,
                    },
                    {
                        label: "Maximum bolus (U)",
                        icon: "/maxiob.svg",
                        value: maxBolus,
                        setter: setMaxBolus,
                        min: 15,
                        max: 30,
                    },
                    {
                        label: "Maximum IOB (U)",
                        icon: "/maxiob.svg",
                        value: maxIOB,
                        setter: setMaxIOB,
                        min: 25,
                        max: 50,
                    },
                    {
                        label: "Carb ratio (g/U)",
                        icon: "/carbratio.svg",
                        value: carbRatio,
                        setter: setCarbRatio,
                        min: 1,
                        max: 100,
                    },
                ].map(({ label, icon, value, setter, min, max }) => (
                    <div
                        key={label}
                        className="flex items-center gap-2 mt-2 justify-center"
                    >
                        <img src={icon} alt={label} className="w-6 h-6" />
                        <div className="flex flex-col w-3/5">
                            <label className="text-xs text-gray-700">
                                {label}
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min={min}
                                max={max}
                                value={value}
                                onChange={(e) => setter(e.target.value)}
                                className="border rounded-md px-2 py-1 text-center w-full"
                            />
                        </div>
                    </div>
                ))}

                <p className="text-xs text-gray-600 mt-3">
                    Your basal rate should constitute{" "}
                    <strong>~40% of your total daily dose</strong> of insulin.
                    Please consult with your doctor before increasing your
                    maximum IOB.
                </p>

                <div className="border-t border-gray-400 my-3"></div>

                <h2 className="font-semibold text-lg">
                    Insulin Pharmacokinetics
                </h2>

                <div className="flex items-center gap-2 mt-2 justify-center">
                    <img
                        src="/insuldur.svg"
                        alt="Insulin duration"
                        className="w-6 h-6"
                    />
                    <div className="flex flex-col w-3/5">
                        <label className="text-xs text-gray-700">
                            Duration of active insulin (minutes)
                        </label>
                        <input
                            type="number"
                            step="1"
                            min={180}
                            max={400}
                            value={insulinDuration}
                            onChange={(e) => setInsulinDuration(e.target.value)}
                            className="border rounded-md px-2 py-1 text-center w-full"
                        />
                    </div>
                </div>

                <button className="pump-save-btn mt-4" onClick={handleSave}>
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
        <div className="dash-footer flex justify-center items-center gap-4 text-center text-sm">
            <p
                onClick={() => setIsAttributionsOpen(true)}
                style={{ cursor: "pointer" }}
            >
                Copyright / Attributions
            </p>
            <p
                style={{ cursor: "pointer" }}
                onClick={() => setIsDisclaimerOpen(true)}
            >
                Medical Disclaimer
            </p>

            {/* Copyright / Attributions Modal */}
            {isAttributionsOpen && (
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-50 z-10"
                    onClick={() => setIsAttributionsOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 p-4 rounded-md w-96 mx-auto mt-32"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold mb-2">
                            Copyright / Attributions
                        </h2>
                        <ul className="list-disc pl-4">
                            <li>All rights reserved</li>
                            <li>
                                Some assets may be attributed to their original
                                creators
                            </li>
                        </ul>
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            onClick={() => setIsAttributionsOpen(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Medical Disclaimer Modal */}
            {isDisclaimerOpen && (
                <div
                    className="fixed inset-0 bg-gray-900 bg-opacity-50 z-10"
                    onClick={() => setIsDisclaimerOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 p-4 rounded-md w-96 mx-auto mt-32"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold mb-2">
                            Medical Disclaimer
                        </h2>
                        <p className="mb-4">
                            This app does not provide medical advice. Always
                            consult with a healthcare professional.
                        </p>
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                            onClick={() => setIsDisclaimerOpen(false)}
                        >
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
