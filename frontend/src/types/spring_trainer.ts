// Public trainer information returned by Spring Boot.
// The backend deliberately excludes the password hash.
export interface Trainer {
    id: number,
    firstName: string,
    lastName: string,
    email: string
}

// Credentials submitted from the React login form.
export interface LoginCredentials {
    email: string,
    password: string
}

export interface RegisterCredentials {
    firstName: string,
    lastName: string,
    email: string,
    password: string
}