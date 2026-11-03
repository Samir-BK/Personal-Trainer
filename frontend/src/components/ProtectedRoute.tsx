import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { authService } from '../services/authService';

// Protects nested React routes by checking the server-side session.
// Frontend route protection improves navigation, but Spring Security
// remains responsible for enforcing actual API access control.
export function ProtectedRoute() {
    const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
        'loading'
    );

    useEffect(() => {
        let active = true;

        // Check whether the browser has a valid authenticated session.
        // This also restores authentication after a page refresh.
        async function checkSession() {
            try {
                await authService.getCurrentTrainer();

                if (active) {
                    setStatus('authenticated');
                }
            } catch {
                if (active) {
                    setStatus('unauthenticated');
                }
            }
        }

        void checkSession();

        // Prevent an outdated request from updating state after unmount.
        return () => {
            active = false;
        };
    }, []);

    if (status === 'loading') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (status === 'unauthenticated') {
        return <Navigate to="/login" replace />;
    }

    // Render the protected child route once authentication is verified.
    return <Outlet />;
}