
// BrowserRouter enables client-side navigation without reloading the page.
// Routes matches the current URL, and Route defines which page to display.
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Material UI components used to build the shared application layout.
// ThemeProvider and createTheme apply consistent styling across all pages.
// CssBaseline resets browser-default styles.
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from "@mui/material";

// Used to preserve the existing LoginPage component type workaround.
import type { ComponentType } from "react";

// Import the application pages.
// Each page has its own component to keep App.tsx focused on routing.
import { CustomerList } from "./pages/CustomerList";
import { TrainingList } from "./pages/TrainingList";
import { MyCustomers } from "./pages/MyCustomer";
import { CustomerGoals } from "./pages/CustomerGoals";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

// ProtectedRoute prevents unauthenticated users from accessing private pages.
// NavigationActions displays navigation links and the logout control.
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NavigationActions } from "./components/NavigationActions";

// Keep the existing workaround for the LoginPage component type.
// This does not change how LoginPage works at runtime.
// We can remove it later after correcting the underlying component typing.
const LoginPageComponent = LoginPage as unknown as ComponentType;

// Create a shared Material UI theme for the entire application.
// Defining it outside App avoids recreating the theme on every render.
const theme = createTheme({

  // Define the application's main colors.

  palette: {
    // Use a consistent light theme throughout the application.
    mode: "light",

    // Lime green for primary actions, such as Sign In and Create Goal.
    primary: {
      main: "#9BE564",
      light: "#C4F3A1",
      dark: "#79BE43",
      contrastText: "#174D43",
    },

    // Deep forest green for supporting actions and navigation.
    secondary: {
      main: "#174D43",
      light: "#397467",
      dark: "#10372F",
      contrastText: "#FFFFFF",
    },

    // Soft off-white background and white content cards.
    background: {
      default: "#F7FAF5",
      paper: "#FFFFFF",
    },

    // Strong headings with softer supporting text.
    text: {
      primary: "#253B35",
      secondary: "#718079",
    },

    // Consistent feedback colors for success and errors.
    success: {
      main: "#39845E",
    },

    error: {
      main: "#D94F55",
    },
  },


  // Configure typography used by Material UI components.
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",

    // Make main page headings more prominent.
    h4: {
      fontWeight: 700,
    },

    // Use a slightly stronger weight for section headings.
    h6: {
      fontWeight: 600,
    },

    // Keep button labels readable without uppercase text.
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },

  // Apply consistent rounded corners to Material UI components.
  shape: {
    borderRadius: 10,
  },

  // Override default styling for selected Material UI components.
  components: {

    MuiButton: {
      styleOverrides: {
        root: {
          // Give buttons consistent rounded corners.
          borderRadius: 8,
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          // Remove unnecessary background images from Paper.
          backgroundImage: "none",
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          // Remove the default AppBar shadow for a flatter design.
          boxShadow: "none",
        },
      },
    },
  },
});

// App is the root component of the React application.
// It provides the global theme, navigation bar, and page routing.
export function App() {

  return (
    // ThemeProvider makes the theme available to every nested
    // Material UI component, including buttons, tables, and forms.
    <ThemeProvider theme={theme}>

      {/* CssBaseline normalizes browser styles and applies
                Material UI's global theme background and typography. */}
      <CssBaseline />

      {/* BrowserRouter uses the browser History API.
                It must wrap navigation components and Routes so that
                links can change pages without a full browser reload. */}
      <BrowserRouter>

        {/* Main application wrapper.
                    minHeight keeps the page background filling the viewport,
                    even when a page contains very little content. */}
        <Box
          sx={{
            minHeight: "100vh",
            bgcolor: "background.default",
          }}
        >

          {/* AppBar displays the shared top navigation bar.
                        position="static" keeps it in the normal page flow,
                        so it does not cover the page content. */}
          <AppBar position="static" color="primary">

            {/* Toolbar arranges the application title and
                            navigation actions horizontally.

                            Responsive padding:
                            xs = smaller screens
                            md = medium screens and larger */}
            <Toolbar
              sx={{
                minHeight: 72,
                px: { xs: 2, md: 4 },
                gap: 2,
              }}
            >

              {/* Application title.
                                flexGrow: 1 takes the available space
                                and pushes NavigationActions to the right.

                                The title font becomes smaller on mobile
                                screens to reduce navigation overflow. */}
              <Typography
                variant="h6"
                component="div"
                sx={{
                  flexGrow: 1,
                  fontWeight: 700,
                  fontSize: {
                    xs: "1rem",
                    sm: "1.25rem",
                  },
                }}
              >
                Personal Trainer Management
              </Typography>

              {/* Displays the responsive navigation links
                                for Customers, My Customers, and Trainings.

                                The component also contains LogoutButton.
                                Public login/register routes hide these actions. */}
              <NavigationActions />

            </Toolbar>
          </AppBar>

          {/* Container centers the main page content.
                        maxWidth="xl" allows wide tables to fit comfortably.

                        Responsive vertical padding:
                        smaller on phones, larger on desktop screens. */}
          <Container
            maxWidth="xl"
            sx={{
              py: { xs: 2, md: 4 },
            }}
          >

            {/* Routes chooses which page to render based
                            on the current URL.

                            Only the matching route's component is displayed. */}
            <Routes>

              {/* PUBLIC ROUTES

                                Trainers can access these pages without
                                having an authenticated session. */}

              {/* Login page:
                                Allows existing trainers to sign in. */}
              <Route
                path="/login"
                element={<LoginPageComponent />}
              />

              {/* Registration page:
                                Allows new trainers to create accounts. */}
              <Route
                path="/register"
                element={<RegisterPage />}
              />

              {/* PROTECTED ROUTES

                                All nested routes require authentication.

                                ProtectedRoute checks the trainer session
                                and redirects unauthenticated visitors.

                                Spring Security independently protects
                                backend endpoints and trainer-owned data. */}
              <Route element={<ProtectedRoute />}>

                {/* Home page:
                                    Displays the complete university
                                    customer directory by default. */}
                <Route
                  path="/"
                  element={<CustomerList />}
                />

                {/* Customer Directory:
                                    Displays university customer records
                                    and allows trainers to assign customers
                                    to their own accounts. */}
                <Route
                  path="/customers"
                  element={<CustomerList />}
                />

                {/* My Customers:
                                    Displays only university customers
                                    assigned to the logged-in trainer. */}
                <Route
                  path="/my-customers"
                  element={<MyCustomers />}
                />

                {/* Customer Fitness Goals:
                                    Displays and manages goals belonging
                                    to one trainer-customer assignment.

                                    assignmentId is the PostgreSQL
                                    trainer_customer record ID, not the
                                    university customer ID.

                                    The backend checks assignment ownership
                                    using the authenticated trainer ID. */}
                <Route
                  path="/my-customers/:assignmentId/goals"
                  element={<CustomerGoals />}
                />

                {/* Trainings:
                                    Displays training records retrieved
                                    from the university REST API. */}
                <Route
                  path="/trainings"
                  element={<TrainingList />}
                />

              </Route>
            </Routes>
          </Container>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}

// Export App as the default component used by main.tsx.
export default App;
