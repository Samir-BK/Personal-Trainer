import React, { useState } from "react";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    TextField,
    Typography,
} from '@mui/material';

// The login page receives a callback that will eventually
// connect to our Spring Boot authentication endpoint.

export function LoginPage() {
    // React state stores the values entered into the form.
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // These states will support API requests in the next step.
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Navigate to another React route after successful authentication.
    const navigate = useNavigate();

    // Handle the form submission without reloading the browser page
    const handleLogin = async (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Basic frontend validation.
        // The backend will still validate all credentials independently.

        if (!email.trim() || !password.trim()) {
            setError("Emaila and Password are required.")
            return;
        }

        //Clean previous error before submiting
        setError("");
        try {
            // the authentication service first retrives a CSRF token,
            // then submit the credentials to springboot
            await authService.login({
                email: email.trim(),
                password: password
            })

            // Confirm that the browser's session is authenticated.
            // This also checks that the session cookie works through Vite.
            await authService.getCurrentTrainer();

            // Move to customer page after successfull authentication
            navigate("/customers", { replace: true })
        } catch (error: unknown) {
            // Invalid credentials return HTTP 401 from Spring Boot.
            // Other failures may indicate a network or server problem.
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                setError("Invalid email or password.");
            } else {
                setError('Login failed. Check that the backend is running and try again.');
            }
        } finally {
            // Restore the button regardless of whether login succeeded.
            setLoading(false);
        }
    }
    return (
        <Box
            sx={{
                minHeight: '75vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    width: '100%',
                    maxWidth: 420,
                    p: 4,
                    borderRadius: 3,
                }}
            >
                <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>
                    Trainer Login
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Sign in to manage your customers and training sessions.
                </Typography>

                {/* Display validation or authentication errors. */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* HTML form supports Enter to submit and browser validation. */}
                <Box component="form" onSubmit={handleLogin}>
                    <TextField
                        label="Email"
                        type="email"
                        fullWidth
                        required
                        margin="normal"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />

                    <TextField
                        label="Password"
                        type="password"
                        fullWidth
                        required
                        margin="normal"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        size="large"
                        disabled={loading}
                        sx={{ mt: 3 }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}

