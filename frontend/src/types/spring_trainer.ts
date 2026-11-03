// Public trainer information returned by Spring Boot.
// The backend deliberately excludes the password hash.
export interface Trainer {
    id: number,
    firstName: String,
    lastName: String,
    email: String
}

// Credentials submitted from the React login form.
export interface LoginCredentials {
    email: String,
    password: String
}

export interface RegisterCredentials {
    firstName: String,
    lastName: String,
    email: String,
    password: String
}