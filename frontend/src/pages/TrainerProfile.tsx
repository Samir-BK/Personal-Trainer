
import { useEffect, useState } from "react";
import axios from "axios";

import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Container,
    Divider,
    Paper,
    Stack,
    Typography,
} from "@mui/material";

import {
    EmailOutlined,
    PersonOutlined,
    BadgeOutlined,
} from "@mui/icons-material";

/**
 * Represents the public account information returned by
 * GET /api/trainers/me.
 *
 * The optional fields allow the page to handle the naming
 * variations used by the application without inventing values.
 *
 * Passwords and password hashes must never be displayed.
 */
type TrainerProfileData = {
    id?: number;
    firstName?: string;
    lastName?: string;
    firstname?: string;
    lastname?: string;
    name?: string;
    username?: string;
    email?: string;
};

/**
 * Trainer Profile page.
 *
 * The backend identifies the logged-in trainer using the
 * authenticated session cookie.
 *
 * We never send a trainer ID supplied by the user.
 * The page displays actual profile information only.
 */
export const TrainerProfile = () => {
    // Stores the currently logged-in trainer's account details.
    const [trainer, setTrainer] =
        useState<TrainerProfileData | null>(null);

    // Tracks loading and request failures.
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /**
     * Fetch the authenticated trainer's profile.
     *
     * This function can also be called by the Refresh button
     * to retrieve the latest account information.
     */
    async function loadProfile() {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get<TrainerProfileData>(
                "/api/trainers/me",
                {
                    // Include the login session cookie.
                    withCredentials: true,
                }
            );

            setTrainer(response.data);
        } catch (loadError) {
            console.error(
                "Unable to load trainer profile:",
                loadError
            );

            setError(
                "Unable to load your profile. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    // Load profile information when this page opens.
    useEffect(() => {
        let cancelled = false;

        async function fetchProfile() {
            try {
                const response = await axios.get<TrainerProfileData>(
                    "/api/trainers/me",
                    {
                        withCredentials: true,
                    }
                );

                if (!cancelled) {
                    setTrainer(response.data);
                    setError("");
                }
            } catch (loadError) {
                console.error(
                    "Unable to load trainer profile:",
                    loadError
                );

                if (!cancelled) {
                    setError(
                        "Unable to load your profile. Please try again."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void fetchProfile();

        // Prevent an outdated response from updating state
        // after the trainer leaves this page.
        return () => {
            cancelled = true;
        };
    }, []);

    // Derive the name from actual backend response fields.
    const firstName =
        trainer?.firstName ?? trainer?.firstname ?? "";

    const lastName =
        trainer?.lastName ?? trainer?.lastname ?? "";

    const fullName =
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        trainer?.name ||
        trainer?.username ||
        "Trainer";

    // Display initials inside the profile avatar.
    const initials = fullName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");

    return (
        <Container maxWidth="md" sx={{ mt: 5, mb: 6 }}>
            {/* Profile page heading. */}
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                        color: "#174D43",
                        fontWeight: 800,
                        mb: 1,
                    }}
                >
                    My Profile
                </Typography>

                <Typography color="text.secondary">
                    View your personal account information.
                </Typography>
            </Box>

            {/* Display request errors clearly. */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: 300,
                    }}
                >
                    <CircularProgress />
                </Box>
            ) : trainer ? (
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 3,
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    {/* Green profile banner. */}
                    <Box
                        sx={{
                            bgcolor: "#174D43",
                            color: "white",
                            p: { xs: 3, sm: 4 },
                        }}
                    >
                        <Stack
                            direction={{
                                xs: "column",
                                sm: "row",
                            }}
                            spacing={3}
                            sx={{
                                alignItems: {
                                    xs: "flex-start",
                                    sm: "center",
                                },
                            }}
                        >
                            {/* Initials-based avatar requires no
                                image upload or backend storage. */}
                            <Avatar
                                sx={{
                                    width: 88,
                                    height: 88,
                                    bgcolor: "#9BE564",
                                    color: "#174D43",
                                    fontSize: "1.8rem",
                                    fontWeight: 800,
                                }}
                            >
                                {initials}
                            </Avatar>

                            <Box>
                                <Typography
                                    variant="h5"
                                    sx={{ fontWeight: 800 }}
                                >
                                    {fullName}
                                </Typography>

                                {trainer.email && (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            mt: 0.5,
                                            opacity: 0.9,
                                        }}
                                    >
                                        {trainer.email}
                                    </Typography>
                                )}

                                <Typography
                                    variant="body2"
                                    sx={{
                                        mt: 1,
                                        color: "#9BE564",
                                        fontWeight: 700,
                                    }}
                                >
                                    Personal Trainer
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>

                    {/* Read-only account information. */}
                    <Box sx={{ p: { xs: 3, sm: 4 } }}>
                        <Typography
                            variant="h6"
                            sx={{
                                color: "#174D43",
                                fontWeight: 800,
                                mb: 3,
                            }}
                        >
                            Account Information
                        </Typography>

                        <Stack spacing={3}>
                            {/* Trainer's real name. */}
                            <Stack
                                direction="row"
                                spacing={2}
                                sx={{ alignItems: "flex-start" }}
                            >
                                <PersonOutlined
                                    sx={{
                                        color: "#174D43",
                                        mt: 0.5,
                                    }}
                                />

                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Full Name
                                    </Typography>

                                    <Typography sx={{ fontWeight: 600 }}>
                                        {fullName}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Divider />

                            {/* Only display an email if the backend
                                actually returns one. */}
                            {trainer.email && (
                                <>
                                    <Stack
                                        direction="row"
                                        spacing={2}
                                        sx={{ alignItems: "flex-start" }}
                                    >
                                        <EmailOutlined
                                            sx={{
                                                color: "#174D43",
                                                mt: 0.5,
                                            }}
                                        />

                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                Email Address
                                            </Typography>

                                            <Typography
                                                sx={{
                                                    fontWeight: 600,
                                                    overflowWrap: "anywhere",
                                                }}
                                            >
                                                {trainer.email}
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    <Divider />
                                </>
                            )}

                            {/* Display username only when available. */}
                            {trainer.username && (
                                <>
                                    <Stack
                                        direction="row"
                                        spacing={2}
                                        sx={{ alignItems: "flex-start" }}
                                    >
                                        <BadgeOutlined
                                            sx={{
                                                color: "#174D43",
                                                mt: 0.5,
                                            }}
                                        />

                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                Username
                                            </Typography>

                                            <Typography
                                                sx={{ fontWeight: 600 }}
                                            >
                                                {trainer.username}
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    <Divider />
                                </>
                            )}

                            {/* Read-only account type. */}
                            <Stack
                                direction="row"
                                spacing={2}
                                sx={{ alignItems: "flex-start" }}
                            >
                                <BadgeOutlined
                                    sx={{
                                        color: "#174D43",
                                        mt: 0.5,
                                    }}
                                />

                                <Box>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Account Type
                                    </Typography>

                                    <Typography sx={{ fontWeight: 600 }}>
                                        Trainer
                                    </Typography>
                                </Box>
                            </Stack>
                        </Stack>

                        {/* Reload the authenticated profile without
                            modifying any account information. */}
                        <Box sx={{ mt: 4 }}>
                            <Button
                                variant="outlined"
                                onClick={() => void loadProfile()}
                                sx={{
                                    borderColor: "#174D43",
                                    color: "#174D43",
                                    fontWeight: 700,
                                    "&:hover": {
                                        borderColor: "#174D43",
                                        bgcolor: "#E8F5D6",
                                    },
                                }}
                            >
                                Refresh Profile
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            ) : null}
        </Container>
    );
};
