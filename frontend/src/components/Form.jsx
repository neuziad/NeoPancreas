import { useState } from "react"
import api from "../api"
import { useNavigate } from "react-router-dom"
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants"
import "../styles/Form.css"
import LoadingIndicator from "./LoadingIndicator"

// eslint-disable-next-line react/prop-types
function Form({ route, method }) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [dob, setDob] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const name = method === "login" ? "Login" : "Register"

    const handleSubmit = async (e) => {
        setLoading(true)
        e.preventDefault()

        // Format date of birth
        const formattedDob = dob
            ? new Date(dob).toISOString().split("T")[0]
            : null

        // Prepare data payload
        const payload = {
            username,
            password,
            first_name: firstName,
            last_name: lastName,
            email,
            profile: {
                dob: formattedDob,
            },
        }

        // console.log('Submitting payload:', payload) // Debugging

        try {
            const res = await api.post(route, payload)
            if (method === "login") {
                localStorage.setItem(ACCESS_TOKEN, res.data.access)
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh)
                navigate("/")
            } else {
                navigate("/login")
            }
        } catch (error) {
            console.log("Error: ", error.response?.data)
            alert(error.response ? error.response.data.detail : error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="form-container">
            <img
                src="/wordmark.png"
                alt="NeoPancreas Logo"
                style={{ width: "14vw", paddingBottom: "2vh" }}
            />

            <h1 className="text-2xl font-bold">{name}</h1>

            {method === "register" && (
                <>
                    <input
                        className="form-input"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                    />
                    <input
                        className="form-input"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                    />
                    <input
                        className="form-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                    />
                    <input
                        className="form-input"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        placeholder="Date of Birth"
                    />
                </>
            )}

            <input
                className="form-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
            />
            <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
            />
            {loading && <LoadingIndicator />}
            <button className="form-button" type="submit">
                {name}
            </button>

            <div className="form-link">
                {method === "login" ? (
                    <a href="/register">Create new account</a>
                ) : (
                    <a href="/login">Log into existing account</a>
                )}
            </div>
        </form>
    )
}

export default Form
