import axios from "axios";
import type { Trainer } from "../types/spring_trainer";
import type { LoginCredentials } from "../types/spring_trainer";

// Use a relative /api URL so Vite forwards requests to Spring Boot.
// In production, the hosting configuration must also route /api
// requests to the backend. 
const api = axios.create({
    baseURL: "/api",
    // Include the browser's JSESSIONID cookie with requests.
    // We do not manually read or store the session identifier.
    withCredentials: true,
}
);

export const authService = {
    // Verify credentials and establish a Spring Security session.
    async login(credentials: LoginCredentials): Promise<Trainer> {
        const response = await api.post<Trainer>(
            "trainers/login",
            credentials
        );
        return response.data;
    },
    // Invalidate the current authenticated session.
    // Spring Boot returns HTTP 204 with no response body.
    async logout(): Promise<void> {
            await api.post('/trainers/logout');
    },
}
