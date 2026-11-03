import { Button } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { LogoutButton } from './LogoutButton';

// Displays navigation buttons for the authenticated application pages.
// The login page is public, so its navigation actions are hidden.
export function NavigationActions() {
  // Read the current URL path from React Router.
  const location = useLocation();

  // Hide private navigation on the public login page.
  // This controls visibility only; ProtectedRoute handles session checks.
  if (location.pathname === '/login') {
    return null;
  } else if (location.pathname === "/register") {
    return null;
  }

  return (
    <>
      {/* Navigate without reloading the browser page. */}
      <Button color="inherit" component={Link} to="/customers">
        Customers
      </Button>

      <Button color="inherit" component={Link} to="/trainings">
        Trainings
      </Button>

      {/* End the current trainer's Spring Security session. */}
      <LogoutButton />
    </>
  );
}