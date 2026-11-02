import React, { useState } from "react";
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

    // Handle the form submission without reloading the browser page
    const handleLogin = (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        // Basic frontend validation.
        // The backend will still validate all credentials independently.

        if (!email.trim() || !password.trim()) {
            setError("Emaila and Password are required.")
            return;
        }

        //Clean previous error before submiting
        setError("");

        // API integration comes in the next step.
        // This temporary state lets us test the interface first.
        setLoading(true);
        setLoading(false);
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
};
