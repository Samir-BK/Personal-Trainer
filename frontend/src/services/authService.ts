import axios from "axios";
import type { Trainer, LoginCredentials, RegisterCredentials } from "../types/spring_trainer";
// Structure returned by GET /api/csrf.
interface CsrfTokenResponse {
    headerName: string;
    parameterName: string;
    token: string;
}

// The Vite proxy forwards /api requests to Spring Boot.
// The browser handles the session cookie automatically.
const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

// Retrieve a fresh CSRF token before a request that changes data.
// Using the token from the JSON response avoids reading cookies manually.
async function getCsrfToken(): Promise<CsrfTokenResponse> {
    const response = await api.get<CsrfTokenResponse>('/csrf');
    return response.data;
}

export const authService = {
    // Obtain a CSRF token, then submit credentials.
    // Spring Security establishes the authenticated session on success.
    async login(credentials: LoginCredentials): Promise<Trainer> {
        const csrf = await getCsrfToken();

        const response = await api.post<Trainer>(
            '/trainers/login',
            credentials,
            {
                headers: {
                    [csrf.headerName]: csrf.token,
                },
            }
        );

        return response.data;
    },

    // Restore the logged-in trainer after refreshing the browser.
    // An unauthenticated request returns HTTP 401.
    async getCurrentTrainer(): Promise<Trainer> {
        const response = await api.get<Trainer>('/trainers/me');
        return response.data;
    },

    // Register a new trainer account in PostgreSQL.
    // Registration is public, but Spring Security still requires a CSRF token.
    async register(credentials: RegisterCredentials): Promise<Trainer> {
        const csrf = await getCsrfToken();

        const response = await api.post<Trainer>(
            '/trainers/register',
            credentials,
            {
                headers: {
                    [csrf.headerName]: csrf.token,
                },
            }
        );

        // The backend returns HTTP 201 and the newly created trainer.
        // Registration does not automatically log the trainer in.
        return response.data;
    },
    // Obtain a token for the current session before logging out.
    // Spring Security invalidates the session and returns HTTP 204.
    async logout(): Promise<void> {
        const csrf = await getCsrfToken();

        await api.post(
            '/trainers/logout',
            undefined,
            {
                headers: {
                    [csrf.headerName]: csrf.token,
                },
            }
        );
    },
};