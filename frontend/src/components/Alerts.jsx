import { useState, useEffect } from "react"
import PropTypes from "prop-types"
import "../styles/Alerts.css"

const alertMessages = {
    high: {
        text: "Urgent high blood glucose",
        icon: "/urgenthigh.svg",
        bg: "#FFFEE6",
        sound: "/sound/urgent_high.ogg",
    },
    low: {
        text: "Urgent low blood glucose",
        icon: "/urgentlow.svg",
        bg: "#FFE6E6",
        sound: "/sound/urgent_low.ogg",
    },
    connection: {
        text: "Sensor/pump signal lost",
        icon: "/connectionerror.svg",
        bg: "#E7FFE6",
        sound: "/sound/connection_error.ogg",
    },
    insulin: {
        text: "Please refill your pump",
        icon: "/pumpfill.svg",
        bg: "#E6E6FF",
        sound: "/sound/low_insulin.ogg",
    },
}

const AlertModal = ({ type, onClose }) => {
    useEffect(() => {
        if (!type) return

        if (!Object.prototype.hasOwnProperty.call(alertMessages, type)) {
            console.warn(`Alert type "${type}" not found. Setting to null.`)
            onClose(null)
        }

        const alertSound = new Audio(alertMessages[type].sound)
        alertSound.loop = true
        alertSound.volume = 0.3

        alertSound.play()

        return () => {
            alertSound.pause()
            alertSound.currentTime = 0
        }
    }, [onClose, type])

    return (
        <div className="alert-modal">
            <div
                className="alert-content"
                style={{ backgroundColor: alertMessages[type].bg }}
            >
                <img
                    src={alertMessages[type].icon}
                    alt={alertMessages[type].text}
                />
                <h2 style={{ paddingTop: "5%" }}>{alertMessages[type].text}</h2>
                <button onClick={onClose}>Stop Alarm</button>
            </div>
        </div>
    )
}

const AlertMonitor = ({ glucoseData, glucoseMin, glucoseMax }) => {
    const [alertType, setAlertType] = useState(null)
    const [wasHighBefore, setWasHighBefore] = useState(false)
    const [wasLowBefore, setWasLowBefore] = useState(false)

    // Request notification permission on mount
    useEffect(() => {
        if (Notification.permission !== "granted") {
            Notification.requestPermission()
        }
    }, [])

    // Function to send notifications
    const sendNotification = (type) => {
        if (Notification.permission === "granted") {
            new Notification(alertMessages[type].text, {
                body: "Check your glucose levels now!",
                icon: alertMessages[type].icon,
            })
        }
    }

    useEffect(() => {
        const latestGlucose =
            glucoseData.length > 0
                ? glucoseData[glucoseData.length - 1].glucose
                : 0
        const recentZeros = glucoseData.slice(-5).filter((g) => g === 0).length

        if (latestGlucose > glucoseMax && !wasHighBefore) {
            setAlertType("high")
            setWasHighBefore(true)
            sendNotification("high")
        } else if (
            latestGlucose < glucoseMin &&
            latestGlucose > 0 &&
            !wasLowBefore
        ) {
            setAlertType("low")
            setWasLowBefore(true)
            sendNotification("low")
        } else if (recentZeros >= 3) {
            setAlertType("connection")
            sendNotification("connection")
        }

        if (latestGlucose <= glucoseMax && latestGlucose >= glucoseMin) {
            setWasHighBefore(false)
            setWasLowBefore(false)
            setAlertType(null)
        }
    }, [
        glucoseData,
        glucoseMin,
        glucoseMax,
        wasHighBefore,
        wasLowBefore,
        alertType,
    ])

    if (!alertType) return null

    return <AlertModal type={alertType} onClose={() => setAlertType(null)} />
}

export default AlertMonitor

AlertModal.propTypes = {
    type: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
}

AlertMonitor.propTypes = {
    glucoseData: PropTypes.arrayOf(PropTypes.number).isRequired,
    glucoseMin: PropTypes.number.isRequired,
    glucoseMax: PropTypes.number.isRequired,
}
