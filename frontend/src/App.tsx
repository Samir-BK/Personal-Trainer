// Routing components from React Router
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Material UI components for layout and styling
import { AppBar, Toolbar, Typography, Container } from '@mui/material';
// Page components, one for each route
import { CustomerList } from './pages/CustomerList';
import { TrainingList } from './pages/TrainingList';

import { LoginPage } from './pages/LoginPage';
import type { ComponentType } from 'react';

import { ProtectedRoute } from './components/ProtectedRoute';
import { NavigationActions } from './components/NavigationActions';
import { RegisterPage } from './pages/RegisterPage';
import { MyCustomers } from './pages/MyCustomer';
// Allows trainers to create, edit, complete, and delete fitness goals
// for customers assigned to their account.
import { CustomerGoals } from './pages/CustomerGoals';

const LoginPageComponent = LoginPage as unknown as ComponentType;

// Root component of the application
export function App() {

  return (
    // BrowserRouter enables client-side routing using the browser's History API.
    // Everything that uses routing (Link, Routes) must be inside it.
    <BrowserRouter>
      {/* Top Application Bar with Navigation */}
      {/* position="static": the bar sits in normal page flow and is not fixed to the top */}
      <AppBar position='static'>
        <Toolbar>
          {/* App title. flexGrow: 1 makes it take all free space,
              which pushes the buttons to the right edge */}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Personal Trainer Management
          </Typography>
          {/* Navigation actions are managed by a separate component. */}
          <NavigationActions />
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      {/* Container centers the content; mt: 2 adds top margin (theme spacing units) */}
      <Container sx={{ mt: 2 }}>
        {/* Routes renders only the first Route whose path matches the current URL */}
        <Routes>
          {/* Public pages: trainers do not need a session to access these. */}
          {/* Trainer login page */}
          <Route path="/login" element={<LoginPageComponent />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* All nested routes require an authenticated trainer session. */}
          <Route element={<ProtectedRoute />}>
            {/* Home page: shows the customer list by default */}
            <Route path='/' element={<CustomerList />} />
            {/* Customers page */}
            {/* Show only customers assigned to the current trainer. */}
            <Route path='/my-customers' element={<MyCustomers />} />
            {/* Fitness goals belonging to a specific customer assignment. */}
            <Route
              path="/my-customers/:assignmentId/goals"
              element={<CustomerGoals />}
            />
            <Route path='/customers' element={<CustomerList />} />
            {/* Trainings page */}
            <Route path='/trainings' element={<TrainingList />} />
          </Route>
        </Routes>
      </Container>
    </BrowserRouter>
  )
}

export default App
