import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Form from "../components/Form"
import api from "../api"
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants"
import { MemoryRouter, useNavigate } from "react-router-dom"
import {
    jest,
    describe,
    beforeEach,
    afterEach,
    it,
    expect,
} from "@jest/globals"

// Mock the navigate and api.post functions
jest.mock("../api")

describe("Form Component", () => {
    let mockNavigate

    beforeEach(() => {
        // Initialize the mock function
        mockNavigate = useNavigate

        api.post.mockResolvedValue({
            data: {
                access: "access_token",
                refresh: "refresh_token",
            },
        })
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it("renders correctly for login method", () => {
        render(
            <MemoryRouter>
                <Form route="/api/token/" method="login" />
            </MemoryRouter>
        )

        expect(screen.getByPlaceholderText("Username")).toBeInTheDocument()
        expect(screen.getByPlaceholderText("Password")).toBeInTheDocument()
    })

    it("renders correctly for register method", () => {
        render(
            <MemoryRouter>
                <Form route="/api/user/register/" method="register" />
            </MemoryRouter>
        )

        expect(screen.getByPlaceholderText("First Name")).toBeInTheDocument()
        expect(screen.getByPlaceholderText("Last Name")).toBeInTheDocument()
        expect(screen.getByPlaceholderText("Email")).toBeInTheDocument()
        expect(screen.getByPlaceholderText("Username")).toBeInTheDocument()
        expect(screen.getByPlaceholderText("Password")).toBeInTheDocument()
        expect(screen.getByPlaceholderText("Date of Birth")).toBeInTheDocument()
    })

    it("submits form data correctly for login", async () => {
        api.post.mockResolvedValueOnce({
            data: { access: "mockAccessToken", refresh: "mockRefreshToken" },
        })

        render(
            <MemoryRouter>
                <Form route="/api/token/" method="login" />
            </MemoryRouter>
        )

        const usernameInput = screen.getByPlaceholderText("Username")
        const passwordInput = screen.getByPlaceholderText("Password")

        await userEvent.type(usernameInput, "testUser")
        await userEvent.type(passwordInput, "password123")

        userEvent.click(screen.getByRole("button", { name: "Login" }))

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))

        expect(api.post).toHaveBeenCalledWith("/api/token/", {
            username: "testUser",
            password: "password123",
            first_name: "",
            last_name: "",
            email: "",
            profile: {
                dob: null,
            },
        })

        expect(localStorage.setItem).toHaveBeenCalledWith(
            ACCESS_TOKEN,
            "mockAccessToken"
        )
        expect(localStorage.setItem).toHaveBeenCalledWith(
            REFRESH_TOKEN,
            "mockRefreshToken"
        )
        expect(mockNavigate).toHaveBeenCalledWith("/")
    })

    it("submits form data correctly for register", async () => {
        api.post.mockResolvedValueOnce({})

        render(
            <MemoryRouter>
                <Form route="/api/user/register/" method="register" />
            </MemoryRouter>
        )

        userEvent.type(screen.getByPlaceholderText("First Name"), "John")
        userEvent.type(screen.getByPlaceholderText("Last Name"), "Doe")
        userEvent.type(
            screen.getByPlaceholderText("Email"),
            "john.doe@example.com"
        )
        userEvent.type(screen.getByPlaceholderText("Username"), "john_doe")
        userEvent.type(screen.getByPlaceholderText("Password"), "password123")
        userEvent.type(
            screen.getByPlaceholderText("Date of Birth"),
            "1990-01-01"
        )

        userEvent.click(screen.getByRole("button", { name: /register/i }))

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))

        expect(api.post).toHaveBeenCalledWith("/register", {
            username: "john_doe",
            password: "password123",
            first_name: "John",
            last_name: "Doe",
            email: "john.doe@example.com",
            profile: {
                dob: "1990-01-01",
            },
        })

        expect(mockNavigate).toHaveBeenCalledWith("/login")
    })

    it("shows loading indicator while submitting", async () => {
        api.post.mockResolvedValueOnce({})

        render(
            <MemoryRouter>
                <Form route="/api/user/register/" method="register" />
            </MemoryRouter>
        )

        userEvent.type(screen.getByPlaceholderText("First Name"), "John")
        userEvent.type(screen.getByPlaceholderText("Last Name"), "Doe")
        userEvent.type(
            screen.getByPlaceholderText("Email"),
            "john.doe@example.com"
        )
        userEvent.type(screen.getByPlaceholderText("Username"), "john_doe")
        userEvent.type(screen.getByPlaceholderText("Password"), "password123")
        userEvent.type(
            screen.getByPlaceholderText("Date of Birth"),
            "1990-01-01"
        )

        userEvent.click(screen.getByRole("button", { name: /register/i }))

        expect(screen.getByTestId("loading-indicator")).toBeInTheDocument()

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))

        expect(
            screen.queryByTestId("loading-indicator")
        ).not.toBeInTheDocument()
    })

    it("handles API error correctly", async () => {
        api.post.mockRejectedValueOnce({
            response: { data: { detail: "Error occurred" } },
        })

        render(
            <MemoryRouter>
                <Form route="/api/token/" method="login" />
            </MemoryRouter>
        )

        userEvent.type(screen.getByPlaceholderText("Username"), "testUser")
        userEvent.type(screen.getByPlaceholderText("Password"), "password123")

        userEvent.click(screen.getByRole("button", { name: /login/i }))

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1))

        expect(alert).toHaveBeenCalledWith("Error occurred")
    })
})
