import { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

// Registration form for new trainer accounts.
// API integration will be added in a separate step.
export function RegisterPage() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    // Navigate to the login page after successful registration.
    const navigate = useNavigate();
    // Disable the submit button while the request is in progress.
    const [loading, setLoading] = useState(false);

    // Submit registration details to Spring Boot without reloading the page.
    async function handleRegister(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        // Match the backend's minimum password length requirement.
        if (password.length < 8) {
            setError('Password must contain at least 8 characters.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // The service fetches a CSRF token and submits the registration data.
            // Spring Boot validates the request and stores a BCrypt password hash.
            await authService.register({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password,
            });

            // Registration creates an account but does not log the trainer in.
            // Send the new trainer to the login page.
            navigate('/login', { replace: true });
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 409) {
                    // Spring Boot returns 409 when an email is already registered.
                    setError('This email is already registered. Try logging in.');
                } else if (error.response?.status === 400) {
                    // The backend rejected one or more registration fields.
                    setError('Invalid registration details. Check all fields.');
                } else {
                    setError('Registration failed. Please try again.');
                }
            } else {
                setError('Registration failed. Please try again.');
            }
        } finally {
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
            <Paper elevation={3} sx={{ width: '100%', maxWidth: 420, p: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>
                    Create Trainer Account
                </Typography>

                <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Register to manage customers and training sessions.
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleRegister}>
                    <TextField
                        label="First name"
                        fullWidth
                        required
                        margin="normal"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                    />

                    <TextField
                        label="Last name"
                        fullWidth
                        required
                        margin="normal"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                    />

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
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={loading}
                        sx={{ mt: 3 }}
                    >
                        {loading ? 'Creating account...' : 'Create account'}
                    </Button>
                </Box>
                {/* Existing trainers can switch directly to the login page. */}
                <Typography variant="body2" align="center" sx={{ mt: 3 }}>
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </Typography>
            </Paper>
        </Box>
    );
}