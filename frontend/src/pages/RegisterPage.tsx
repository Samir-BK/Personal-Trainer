import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

// Registration form for new trainer accounts.
// API integration will be added in a separate step.
export function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleRegister(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    // Match the backend's minimum password length requirement.
    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setError('');

    // Registration API request will be added in the next step.
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

          <Button type="submit" variant="contained" fullWidth sx={{ mt: 3 }}>
            Create account
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}