
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

// Material UI components for the login page layout and form.
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

// Handles communication with the Spring Boot authentication endpoints.
import { authService } from "../services/authService";

// LoginPage is the public page used by trainers to sign in.
// Authentication logic stays separate from the visual presentation.
export function LoginPage() {

    // Store the email and password entered by the trainer.
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Controls the loading indicator during authentication.
    const [loading, setLoading] = useState(false);

    // Stores validation or authentication errors.
    const [error, setError] = useState("");

    // Controls whether the password field displays plain text.
    const [showPassword, setShowPassword] = useState(false);

    // Navigate to the customer directory after successful login.
    const navigate = useNavigate();

    // Handle login without reloading the browser.
    const handleLogin = async (
        event: React.SubmitEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        // Prevent multiple simultaneous login requests.
        if (loading) {
            return;
        }

        // Validate required fields before contacting Spring Boot.
        // The backend still validates credentials independently.
        if (!email.trim() || !password.trim()) {
            setError("Email and password are required.");
            return;
        }

        // Reset previous errors and disable the submit button.
        setError("");
        setLoading(true);

        try {
            // authService retrieves a CSRF token and submits
            // credentials to our Spring Boot authentication endpoint.
            await authService.login({
                email: email.trim(),
                password: password,
            });

            // Confirm that Spring Security recognizes the session.
            // The browser uses its session cookie for later requests.
            await authService.getCurrentTrainer();

            // Redirect to the customer directory after successful login.
            navigate("/", { replace: true });

        } catch (error: unknown) {

            // Return a clear message for invalid credentials.
            // Avoid revealing whether an email address exists.
            if (
                axios.isAxiosError(error) &&
                error.response?.status === 401
            ) {
                setError("Invalid email or password.");
            } else {
                // Network failures and backend errors use a generic message.
                setError(
                    "Login failed. Check that the backend is running and try again."
                );
            }

        } finally {
            // Restore the button even if authentication fails.
            setLoading(false);
        }
    };

    return (
        // Center the login experience inside the application layout.
        // The two panels sit side by side on desktop screens.
        <Box
            sx={{
                minHeight: { xs: "auto", md: "78vh" },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: { xs: 2, md: 4 },
            }}
        >
            {/* Main login card containing the visual and form panels. */}
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
                    minHeight: { md: 620 },
                    overflow: "hidden",
                    borderRadius: 4,
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "0 20px 60px rgba(23, 77, 67, 0.10)",
                }}
            >

                {/* LEFT PANEL: FITNESS BRANDING

                    A fitness image gives the page a strong visual identity.
                    A dark green overlay keeps the white text readable.

                    This panel is hidden on small screens so the login
                    form remains the main focus on mobile devices. */}
                <Box
                    sx={{
                        display: { xs: "none", md: "flex" },
                        flexDirection: "column",
                        justifyContent: "space-between",
                        position: "relative",
                        p: 5,
                        color: "#FFFFFF",

                        // Use a fitness photo with a dark green overlay.
                        // Replace with a local image later if preferred.
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
                    {/* Application branding at the top of the image. */}
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
                            sx={{ color: "#FFFFFF", fontWeight: 800 }}
                        >
                            Personal Trainer
                        </Typography>
                    </Stack>

                    {/* Motivational copy at the bottom of the image. */}
                    <Box>
                        <Typography
                            variant="h3"
                            sx={{
                                color: "#FFFFFF",
                                fontWeight: 800,
                                fontSize: { md: "2.5rem", lg: "3rem" },
                                lineHeight: 1.15,
                                mb: 2,
                            }}
                        >
                            Train smarter.
                            <Box component="span" sx={{ color: "#9BE564" }}>
                                {" "}Grow stronger.
                            </Box>
                        </Typography>

                        <Typography
                            sx={{
                                color: "#E4F1E6",
                                maxWidth: 350,
                                lineHeight: 1.7,
                            }}
                        >
                            Manage your customers, build fitness goals,
                            and keep your training journey organized.
                        </Typography>
                    </Box>
                </Box>

                {/* RIGHT PANEL: LOGIN FORM

                    The form uses a clean white background, dark-green
                    headings, rounded input fields, and lime-green buttons. */}
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
                    {/* Compact application branding on mobile. */}
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

                    {/* Welcome heading. */}
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
                        Welcome back!
                    </Typography>

                    {/* Supporting text beneath the heading. */}
                    <Typography
                        color="text.secondary"
                        sx={{
                            textAlign: "center",
                            mb: 4,
                        }}
                    >
                        Sign in to your trainer account.
                    </Typography>

                    {/* Display errors from validation or authentication. */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {/* HTML form supports Enter to submit.
                        React prevents the default page reload. */}
                    <Box component="form" onSubmit={handleLogin}>
                        <Stack spacing={2.5}>

                            {/* Email address field. */}
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

                            {/* Password field with visibility toggle.
                                The toggle changes only presentation,
                                not the password sent to Spring Boot. */}
                            <TextField
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                fullWidth
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    type="button"
                                                    size="small"
                                                    edge="end"
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

                            {/* Submit credentials to Spring Boot.
                                Disable the button during authentication
                                to prevent repeated login requests. */}
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
                                    <CircularProgress
                                        size={24}
                                        color="inherit"
                                    />
                                ) : (
                                    "Sign In"
                                )}
                            </Button>

                        </Stack>
                    </Box>

                    {/* Registration link for trainers without an account. */}
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 4,
                            textAlign: "center",
                            color: "text.secondary",
                        }}
                    >
                        Don't have an account?{" "}
                        <Box
                            component={Link}
                            to="/register"
                            sx={{
                                color: "secondary.main",
                                fontWeight: 800,
                                textDecoration: "none",
                                "&:hover": {
                                    textDecoration: "underline",
                                },
                            }}
                        >
                            Sign Up
                        </Box>
                    </Typography>

                </Box>
            </Paper>
        </Box>
    );
}
