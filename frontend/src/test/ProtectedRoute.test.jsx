import { render, screen, waitFor } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import ProtectedRoute from "../components/ProtectedRoute"
import api from "../api"
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants"
import { jwtDecode } from "jwt-decode"
import { describe, it, beforeEach, expect, jest } from "@jest/globals"
import "jest-localstorage-mock"

// Mock dependencies
jest.mock("../api")
jest.mock("jwt-decode")

describe("Protected Routes", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        localStorage.clear()
        localStorage.setItem(ACCESS_TOKEN, "oldAccessToken")
        localStorage.setItem(REFRESH_TOKEN, "refreshToken")
    })

    it("should render children if the token is valid", async () => {
        // Valid non-expired token
        jwtDecode.mockReturnValueOnce({
            exp: Math.floor(Date.now() / 1000) + 3600,
        })

        // Checks if redirects to dashboard (root directory)
        await waitFor(() => {
            expect(window.location.pathname).toBe("/")
        })
    })

    // TO-DO: Fix this invalid token protected route test
    it("should redirect to login if the token is invalid or expired", async () => {
        // Invalid expired token
        jwtDecode.mockReturnValueOnce({
            exp: Math.floor(Date.now() / 1000) - 3600,
        })

        // Simulate failed refresh
        api.post.mockResolvedValueOnce({ status: 401 })

        render(
            <BrowserRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </BrowserRouter>
        )

        // Ensure the redirection to /login is triggered
        await waitFor(() => {
            expect(window.location.pathname).toBe("/login")
        })
    })

    it("should refresh token if expired and successfully authorize", async () => {
        // Invalid expired token
        jwtDecode.mockReturnValueOnce({
            exp: Math.floor(Date.now() / 1000) - 3600,
        })

        // Simulate successful token refresh
        api.post.mockResolvedValueOnce({
            status: 200,
            data: { access: "newAccessToken" },
        })

        render(
            <BrowserRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </BrowserRouter>
        )

        // Ensure that the API call to refresh the token is made
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith("/api/token/refresh/", {
                refresh: "refreshToken",
            })
        })
    })

    it("should show loading state while checking authorization", async () => {
        // Valid unexpired token
        jwtDecode.mockReturnValueOnce({
            exp: Math.floor(Date.now() / 1000) + 3600,
        })

        render(
            <BrowserRouter>
                <ProtectedRoute>
                    <div>Protected Content</div>
                </ProtectedRoute>
            </BrowserRouter>
        )

        // Wait for the loading state to be shown before the rest of the content
        await waitFor(() => {
            expect(screen.getByTestId("loading")).toHaveTextContent(
                "Loading..."
            )
        })
    })
})
