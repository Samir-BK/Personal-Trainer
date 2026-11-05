
import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

// Material UI components used to build the registration page.
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

// Reuse the existing authentication service.
// It handles CSRF protection and communication with Spring Boot.
import { authService } from "../services/authService";

// RegisterPage allows new personal trainers to create an account.
// The styling matches LoginPage, while registration logic stays unchanged.
export function RegisterPage() {

    // Store the registration details entered by the new trainer.
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Store validation and backend errors for display in the form.
    const [error, setError] = useState("");

    // Disable form submission while the registration request is running.
    const [loading, setLoading] = useState(false);

    // Allow trainers to show or hide their password while typing.
    const [showPassword, setShowPassword] = useState(false);

    // Navigate to the login page after successful registration.
    const navigate = useNavigate();

    // Submit the registration form without reloading the browser.
    async function handleRegister(
        event: React.SubmitEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        // Prevent duplicate registration requests.
        if (loading) {
            return;
        }

        // Check required text fields before contacting the backend.
        // Spring Boot independently validates all submitted values.
        if (
            !firstName.trim() ||
            !lastName.trim() ||
            !email.trim() ||
            !password
        ) {
            setError("All fields are required.");
            return;
        }

        // Match the backend's minimum password length requirement.
        if (password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        // Clear old errors and show the loading state.
        setError("");
        setLoading(true);

        try {
            // authService retrieves a CSRF token before submitting
            // registration details to Spring Boot.
            //
            // The backend stores a BCrypt password hash,
            // never the original plain-text password.
            await authService.register({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password,
            });

            // Registration does not automatically authenticate the trainer.
            // Redirect to the public login page after account creation.
            navigate("/login", { replace: true });

        } catch (error: unknown) {

            // Handle known HTTP error responses from Spring Boot.
            if (axios.isAxiosError(error)) {

                if (error.response?.status === 409) {
                    // The email address is already registered.
                    setError(
                        "This email is already registered. Try signing in."
                    );

                } else if (error.response?.status === 400) {
                    // One or more registration fields failed validation.
                    setError(
                        "Invalid registration details. Please check your information."
                    );

                } else {
                    // Backend outage or another unexpected HTTP error.
                    setError(
                        "Registration failed. Please try again."
                    );
                }

            } else {
                // Handle unexpected client-side errors.
                setError(
                    "Registration failed. Please try again."
                );
            }

        } finally {
            // Restore the submit button after the request completes.
            setLoading(false);
        }
    }

    return (
        // Center the registration experience within the application.
        // Desktop screens show two panels; mobile prioritizes the form.
        <Box
            sx={{
                minHeight: { xs: "auto", md: "78vh" },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: { xs: 2, md: 4 },
            }}
        >

            {/* Main registration card, matching the login page design. */}
            <Paper
                elevation={0}
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        md: "1fr 1fr",
                    },
                    width: "100%",
                    maxWidth: 1120,
                    minHeight: { md: 660 },
                    overflow: "hidden",
                    borderRadius: 4,
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "0 20px 60px rgba(23, 77, 67, 0.10)",
                }}
            >

                {/* LEFT PANEL: FITNESS BRANDING

                    Reuse the same photograph and dark-green overlay
                    as LoginPage to create a consistent visual identity.

                    Hide the image on mobile to leave more room for the
                    registration fields. */}
                <Box
                    sx={{
                        display: { xs: "none", md: "flex" },
                        flexDirection: "column",
                        justifyContent: "space-between",
                        position: "relative",
                        p: 5,
                        color: "#FFFFFF",

                        // Dark overlay improves text readability.
                        // The background color is used if the image fails.
                        backgroundImage: `
                            linear-gradient(
                                180deg,
                                rgba(13, 40, 33, 0.42),
                                rgba(13, 40, 33, 0.86)
                            ),
                            url("https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=85")
                        `,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundColor: "#174D43",
                    }}
                >

                    {/* Application branding displayed at the top left. */}
                    <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ alignItems: "center" }}
                    >
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 2,
                                bgcolor: "#9BE564",
                                color: "#174D43",
                                fontWeight: 900,
                                fontSize: "1.2rem",
                            }}
                        >
                            PT
                        </Box>

                        <Typography
                            variant="h6"
                            sx={{
                                color: "#FFFFFF",
                                fontWeight: 800,
                            }}
                        >
                            Personal Trainer
                        </Typography>
                    </Stack>

                    {/* Branding message shown over the fitness photograph. */}
                    <Box>
                        <Typography
                            variant="h3"
                            sx={{
                                color: "#FFFFFF",
                                fontWeight: 800,
                                fontSize: {
                                    md: "2.5rem",
                                    lg: "3rem",
                                },
                                lineHeight: 1.15,
                                mb: 2,
                            }}
                        >
                            Start strong.
                            <Box
                                component="span"
                                sx={{ color: "#9BE564" }}
                            >
                                {" "}Stay focused.
                            </Box>
                        </Typography>

                        <Typography
                            sx={{
                                color: "#E4F1E6",
                                maxWidth: 350,
                                lineHeight: 1.7,
                            }}
                        >
                            Create your trainer account, organize your
                            customers, and turn fitness goals into action.
                        </Typography>
                    </Box>
                </Box>

                {/* RIGHT PANEL: REGISTRATION FORM

                    Use the same white background, dark-green headings,
                    rounded fields, and lime-green button as LoginPage. */}
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        px: { xs: 3, sm: 6, md: 5, lg: 7 },
                        py: { xs: 5, md: 6 },
                        bgcolor: "background.paper",
                    }}
                >

                    {/* Mobile branding appears when the image is hidden. */}
                    <Typography
                        sx={{
                            display: { xs: "block", md: "none" },
                            color: "secondary.main",
                            fontWeight: 800,
                            mb: 4,
                        }}
                    >
                        Personal Trainer
                    </Typography>

                    {/* Main registration heading. */}
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            color: "secondary.main",
                            fontWeight: 800,
                            textAlign: "center",
                            mb: 1,
                        }}
                    >
                        Create your account
                    </Typography>

                    {/* Explain what the new account allows trainers to do. */}
                    <Typography
                        color="text.secondary"
                        sx={{
                            textAlign: "center",
                            mb: 3,
                        }}
                    >
                        Join and start managing your fitness clients.
                    </Typography>

                    {/* Display validation and backend registration errors. */}
                    {error && (
                        <Alert
                            severity="error"
                            sx={{ mb: 3 }}
                            onClose={() => setError("")}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* HTML form supports Enter to submit.
                        React handles the request without a page reload. */}
                    <Box component="form" onSubmit={handleRegister}>

                        <Stack spacing={2}>

                            {/* First name entered by the new trainer. */}
                            <TextField
                                label="First name"
                                placeholder="Enter your first name"
                                fullWidth
                                required
                                autoComplete="given-name"
                                value={firstName}
                                onChange={(event) =>
                                    setFirstName(event.target.value)
                                }
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: 3,
                                        bgcolor: "#F7F9F8",
                                    },
                                }}
                            />

                            {/* Last name entered by the new trainer. */}
                            <TextField
                                label="Last name"
                                placeholder="Enter your last name"
                                fullWidth
                                required
                                autoComplete="family-name"
                                value={lastName}
                                onChange={(event) =>
                                    setLastName(event.target.value)
                                }
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: 3,
                                        bgcolor: "#F7F9F8",
                                    },
                                }}
                            />

                            {/* Email is used as the trainer's login identifier.
                                Spring Boot checks whether it is already used. */}
                            <TextField
                                label="Email"
                                type="email"
                                placeholder="Enter your email"
                                fullWidth
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: 3,
                                        bgcolor: "#F7F9F8",
                                    },
                                }}
                            />

                            {/* Password input with a Show/Hide control.
                                Toggling visibility does not alter the
                                submitted password or backend validation. */}
                            <TextField
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                placeholder="At least 8 characters"
                                fullWidth
                                required
                                autoComplete="new-password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                helperText="Use at least 8 characters."
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    type="button"
                                                    edge="end"
                                                    size="small"
                                                    aria-label={
                                                        showPassword
                                                            ? "Hide password"
                                                            : "Show password"
                                                    }
                                                    onClick={() =>
                                                        setShowPassword(
                                                            (previous) =>
                                                                !previous
                                                        )
                                                    }
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: "secondary.main",
                                                        }}
                                                    >
                                                        {showPassword
                                                            ? "Hide"
                                                            : "Show"}
                                                    </Typography>
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: 3,
                                        bgcolor: "#F7F9F8",
                                    },
                                }}
                            />

                            {/* Submit the registration request to Spring Boot.

                                Disable the button during the request to
                                prevent duplicate account submissions. */}
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                size="large"
                                disabled={loading}
                                sx={{
                                    mt: 1,
                                    py: 1.6,
                                    borderRadius: 3,
                                    fontWeight: 800,
                                    bgcolor: "#9BE564",
                                    color: "#174D43",
                                    boxShadow: "none",
                                    "&:hover": {
                                        bgcolor: "#88D64E",
                                        boxShadow: "none",
                                    },
                                }}
                            >
                                {loading ? (
                                    <>
                                        <CircularProgress
                                            size={20}
                                            color="inherit"
                                            sx={{ mr: 1.5 }}
                                        />
                                        Creating account...
                                    </>
                                ) : (
                                    "Create Account"
                                )}
                            </Button>

                        </Stack>
                    </Box>

                    {/* Existing trainers can return to the login page.
                        React Router navigates without reloading the app. */}
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 4,
                            textAlign: "center",
                            color: "text.secondary",
                        }}
                    >
                        Already have an account?{" "}
                        <Box
                            component={Link}
                            to="/login"
                            sx={{
                                color: "secondary.main",
                                fontWeight: 800,
                                textDecoration: "none",
                                "&:hover": {
                                    textDecoration: "underline",
                                },
                            }}
                        >
                            Sign In
                        </Box>
                    </Typography>

                </Box>
            </Paper>
        </Box>
    );
}
