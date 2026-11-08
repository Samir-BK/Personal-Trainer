
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import axios from "axios";

import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Container,
    Grid,
    Paper,
    Stack,
    Typography,
} from "@mui/material";

import {
    fetchTrainings,
    fetchCustomersByURL,
} from "../services/trainerService";

import {
    getAssignedCustomers,
} from "../services/trainerCustomerService";

import type { Training } from "../types/trainer";

/**
 * Represents a future university training session.
 *
 * The customer name is resolved through the university API's
 * HAL customer relationship link.
 */
type UpcomingTraining = {
    id: string;
    activity: string;
    customerName: string;
    date: string;
    duration: number;
};

/**
 * Home Dashboard for authenticated trainers.
 *
 * The dashboard combines:
 * 1. Trainer-specific customer assignments from our backend.
 * 2. Shared university training data from the external REST API.
 *
 * University trainings are not automatically owned by the
 * currently logged-in trainer. Labels reflect that distinction.
 */
export const HomePage = () => {
    // Number of customers assigned to the logged-in trainer.
    const [assignedCustomerCount, setAssignedCustomerCount] =
        useState(0);

    // Summary values from the shared university training API.
    const [trainingCount, setTrainingCount] = useState(0);
    const [totalMinutes, setTotalMinutes] = useState(0);
    const [upcomingCount, setUpcomingCount] = useState(0);

    // The five nearest future training sessions.
    const [upcomingTrainings, setUpcomingTrainings] =
        useState<UpcomingTraining[]>([]);

    // Track loading and failures.
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [trainerName, setTrainerName] = useState("");

    useEffect(() => {
        // Prevent state updates if the trainer navigates away
        // before asynchronous requests have finished.
        let cancelled = false;

        async function loadTrainerProfile() {
            try {
                const response = await axios.get<{
                    firstName?: string;
                    lastName?: string;
                    firstname?: string;
                    lastname?: string;
                    name?: string;
                    username?: string;
                }>("/api/trainers/me", {
                    withCredentials: true,
                });

                const trainer = response.data;

                // Support common naming conventions. Keep only the
                // fields actually returned by your backend if known.
                const fullName = [
                    trainer.firstName ?? trainer.firstname,
                    trainer.lastName ?? trainer.lastname,
                ].filter(Boolean).join(" ").trim();

                if (!cancelled) {
                    setTrainerName(
                        fullName ||
                        trainer.name ||
                        trainer.username ||
                        ""
                    );
                }
            } catch (error) {
                // Dashboard statistics can still work if profile
                // information is temporarily unavailable.
                console.error("Unable to load trainer name:", error);
            }
        }

        void loadTrainerProfile();

        async function loadDashboard() {
            try {
                // Load trainer-specific assignments and university
                // training sessions at the same time.
                const [assignments, trainings] = await Promise.all([
                    getAssignedCustomers(),
                    fetchTrainings(),
                ]);
                // Calculate total minutes using only valid durations.
                const minutes = trainings.reduce((sum, training) => {
                    const duration = Number(training.duration);

                    return Number.isFinite(duration) && duration > 0
                        ? sum + duration
                        : sum;
                }, 0);

                // Current time is used to find upcoming sessions.
                const now = Date.now();

                // Keep only future sessions with valid dates.
                // Sort from nearest to furthest.
                const futureTrainings = trainings
                    .filter((training) => {
                        const startTime = Date.parse(training.date);

                        return (
                            Number.isFinite(startTime) &&
                            startTime > now
                        );
                    })
                    .sort(
                        (first, second) =>
                            Date.parse(first.date) -
                            Date.parse(second.date)
                    );

                // The summary counts every future session.
                // The list below displays only the next five.
                const nextFive = futureTrainings.slice(0, 5);

                // Cache customer requests to avoid fetching the
                // same customer multiple times unnecessarily.
                const customerCache = new Map<
                    string,
                    ReturnType<typeof fetchCustomersByURL>
                >();

                // Resolve customer names for upcoming sessions.
                const upcoming = await Promise.all(
                    nextFive.map(
                        async (
                            training: Training,
                            index
                        ): Promise<UpcomingTraining> => {
                            const customerUrl =
                                training._links?.customer?.href;

                            let customerName = "Unknown customer";

                            if (customerUrl) {
                                try {
                                    let customerRequest =
                                        customerCache.get(customerUrl);

                                    if (!customerRequest) {
                                        customerRequest =
                                            fetchCustomersByURL(
                                                customerUrl
                                            );

                                        customerCache.set(
                                            customerUrl,
                                            customerRequest
                                        );
                                    }

                                    const customer =
                                        await customerRequest;

                                    customerName =
                                        `${customer.firstname} ${customer.lastname}`.trim();
                                } catch (customerError) {
                                    // One unavailable customer should
                                    // not prevent the dashboard loading.
                                    console.error(
                                        "Unable to load training customer:",
                                        customerError
                                    );
                                }
                            }

                            return {
                                // Stable display identifier where
                                // the university HAL self-link exists.
                                id:
                                    training._links?.self?.href ??
                                    `upcoming-${index}`,
                                activity:
                                    training.activity?.trim() ||
                                    "Unnamed activity",
                                customerName,
                                date: training.date,
                                duration: Number(training.duration),
                            };
                        }
                    )
                );

                // Update state only while this page is mounted.
                if (!cancelled) {
                    setAssignedCustomerCount(assignments.length);
                    setTrainingCount(trainings.length);
                    setTotalMinutes(minutes);
                    setUpcomingCount(futureTrainings.length);
                    setUpcomingTrainings(upcoming);
                    setError("");
                }
            } catch (loadError) {
                console.error(
                    "Unable to load trainer dashboard:",
                    loadError
                );

                if (!cancelled) {
                    setError(
                        "Unable to load dashboard information. Please refresh the page and try again."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        // Start both asynchronous operations.
        void loadTrainerProfile();
        void loadDashboard();

        // Clean up only when the component unmounts
        // or React reruns this effect.
        return () => {
            cancelled = true;
        };
    }, []);

    /**
     * Summary cards contain actual API values.
     *
     * "My Customers" is private to the logged-in trainer.
     * The other three metrics use shared university data.
     */
    const metrics = [
        {
            title: "My Customers",
            value: assignedCustomerCount.toLocaleString(),
            description: "Customers assigned to your account",
        },
        {
            title: "University Trainings",
            value: trainingCount.toLocaleString(),
            description: "Sessions in the university API",
        },
        {
            title: "Total Training Time",
            value: `${totalMinutes.toLocaleString()} min`,
            description: "Minutes across university sessions",
        },
        {
            title: "Upcoming Sessions",
            value: upcomingCount.toLocaleString(),
            description: "Future university training sessions",
        },
    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 5, mb: 6 }}>
            {/* Dashboard welcome section. */}
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
                    {trainerName
                        ? `Welcome back, ${trainerName}!`
                        : "Welcome back!"}
                </Typography>

                <Typography color="text.secondary">
                    Your customers and university training
                    activity at a glance.
                </Typography>

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                >
                    {dayjs().format("dddd, DD MMMM YYYY")}
                </Typography>
            </Box>

            {/* A failed request must not be displayed as zero data. */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Wait for both APIs before displaying the dashboard. */}
            {loading ? (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: 350,
                    }}
                >
                    <CircularProgress />
                </Box>
            ) : !error ? (
                <>
                    {/* Summary cards with live data. */}
                    <Grid container spacing={3} sx={{ mb: 5 }}>
                        {metrics.map((metric) => (
                            <Grid
                                key={metric.title}
                                size={{
                                    xs: 12,
                                    sm: 6,
                                    md: 3,
                                }}
                            >
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        height: "100%",
                                        borderRadius: 3,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderTop:
                                            "4px solid #9BE564",
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 1 }}
                                    >
                                        {metric.title}
                                    </Typography>

                                    <Typography
                                        variant="h4"
                                        sx={{
                                            color: "#174D43",
                                            fontWeight: 800,
                                            mb: 1,
                                        }}
                                    >
                                        {metric.value}
                                    </Typography>

                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        {metric.description}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Upcoming university training sessions. */}
                    <Box sx={{ mb: 3 }}>
                        <Typography
                            variant="h5"
                            sx={{
                                color: "#174D43",
                                fontWeight: 800,
                                mb: 1,
                            }}
                        >
                            Upcoming Training Sessions
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            The next five scheduled sessions from
                            the university training API.
                        </Typography>
                    </Box>

                    {upcomingTrainings.length === 0 ? (
                        <Alert severity="info">
                            No upcoming training sessions
                            are currently scheduled.
                        </Alert>
                    ) : (
                        <Stack spacing={2}>
                            {upcomingTrainings.map((training) => (
                                <Paper
                                    key={training.id}
                                    elevation={0}
                                    sx={{
                                        p: 3,
                                        borderRadius: 3,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderLeft:
                                            "4px solid #9BE564",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent:
                                                "space-between",
                                            alignItems: {
                                                xs: "flex-start",
                                                sm: "center",
                                            },
                                            flexDirection: {
                                                xs: "column",
                                                sm: "row",
                                            },
                                            gap: 2,
                                        }}
                                    >
                                        {/* Activity and customer details. */}
                                        <Box>
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    color: "#174D43",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {training.activity}
                                            </Typography>

                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                Customer:{" "}
                                                {training.customerName}
                                            </Typography>

                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mt: 1 }}
                                            >
                                                {dayjs(
                                                    training.date
                                                ).format(
                                                    "DD.MM.YYYY HH:mm"
                                                )}
                                            </Typography>
                                        </Box>

                                        {/* Duration of the session. */}
                                        <Chip
                                            label={
                                                Number.isFinite(
                                                    training.duration
                                                ) &&
                                                    training.duration > 0
                                                    ? `${training.duration} min`
                                                    : "Duration unavailable"
                                            }
                                            sx={{
                                                bgcolor: "#E8F5D6",
                                                color: "#174D43",
                                                fontWeight: 700,
                                            }}
                                        />
                                    </Box>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </>
            ) : null}
        </Container>
    );
};
