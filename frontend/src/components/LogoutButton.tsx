import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button } from '@mui/material';
import { authService } from '../services/authService';

// Handles ending the trainer's authenticated session.
// Keeping this separate makes App.tsx responsible mainly for layout and routing.
export function LogoutButton() {
  const navigate = useNavigate();

  // Prevent repeated logout requests while one is in progress.
  const [loading, setLoading] = useState(false);

  // Display an error if Spring Boot rejects the logout request.
  const [error, setError] = useState('');

  async function handleLogout() {
    setLoading(true);
    setError('');

    try {
      // The service retrieves a CSRF token before sending the logout request.
      // Spring Security invalidates the session and returns HTTP 204.
      await authService.logout();

      // Redirect to the public login page after successful logout.
      navigate('/login', { replace: true });
    } catch {
      // Keep the user on the current page if logout fails.
      setError('Logout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Button
        color="inherit"
        onClick={handleLogout}
        disabled={loading}
      >
        {loading ? 'Logging out...' : 'Logout'}
      </Button>

      {/* Show the error without hiding the logout button. */}
      {error && (
        <Alert severity="error" sx={{ position: 'absolute', right: 16, top: 64 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}