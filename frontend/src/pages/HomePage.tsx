
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import axios from "axios";

import {
    Alert,
    Box,
    Button,
    CardActionArea,
    Chip,
    CircularProgress,
    Container,
    Grid,
    Paper,
    Stack,
    Typography,
} from "@mui/material";

import {
    fetchCustomers,
    fetchTrainings,
} from "../services/trainerService";

import { getAssignedCustomers } from "../services/trainerCustomerService";

import type { Customer } from "../types/trainer";

/**
 * Goal information returned by our Spring Boot backend.
 *
 * Goals belong to a trainer-customer assignment.
 * Their target dates are deadlines, not training bookings.
 */
type CustomerGoal = {
    id: number;
    title: string;
    description?: string | null;
    status: string;
    targetDate?: string | null;
    targetSessions?: number | null;
};

/**
 * Goal information prepared for displaying on the dashboard.
 *
 * assignmentId is the ID required by the existing
 * /my-customers/:assignmentId/goals route.
 */
type DashboardGoal = {
    id: number;
    assignmentId: number;
    customerName: string;
    title: string;
    description: string;
    targetDate: string;
    targetSessions: number | null;
};

/**
 * Extract a university customer ID from a HAL self-link.
 *
 * Example:
 * https://example.com/api/customers/12 -> 12
 */
function getCustomerId(href?: string): number | null {
    const match = href?.match(
        /\/customers\/(\d+)\/?(?:[?#].*)?$/
    );

    if (!match) {
        return null;
    }

    const id = Number(match[1]);

    return Number.isSafeInteger(id) && id > 0
        ? id
        : null;
}

/**
 * Return a readable customer name.
 *
 * Keep the fallback simple when customer information is
 * incomplete or unavailable.
 */
function getCustomerName(customer: Customer): string {
    const name = [
        customer.firstname,
        customer.lastname,
    ]
        .filter(Boolean)
        .join(" ")
        .trim();

    return name || "Unknown customer";
}

/**
 * Home Dashboard.
 *
 * Displays:
 * - Logged-in trainer's name
 * - Assigned customer count
 * - Training statistics
 * - Active goal count
 * - Upcoming customer goal deadlines
 *
 * Goal data is fetched directly from the backend, so changing
 * a goal can be reflected when the dashboard is refreshed.
 */
export const HomePage = () => {
    const navigate = useNavigate();

    // Information about the authenticated trainer.
    const [trainerName, setTrainerName] = useState("");

    // Dashboard summary statistics.
    const [customerCount, setCustomerCount] = useState(0);
    const [trainingCount, setTrainingCount] = useState(0);
    const [totalMinutes, setTotalMinutes] = useState(0);
    const [activeGoalCount, setActiveGoalCount] = useState(0);

    // Goals with future target dates, ordered by deadline.
    const [upcomingGoals, setUpcomingGoals] = useState<
        DashboardGoal[]
    >([]);

    // Loading and error feedback.
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");

    // Increasing this value reloads the dashboard data.
    // It lets the trainer refresh after changing a goal.
    const [refreshKey, setRefreshKey] = useState(0);

    /**
     * Load the trainer's name once.
     *
     * The backend identifies the trainer using the current
     * authenticated session.
     */
    useEffect(() => {
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

                const fullName = [
                    trainer.firstName ?? trainer.firstname,
                    trainer.lastName ?? trainer.lastname,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                if (!cancelled) {
                    setTrainerName(
                        fullName ||
                        trainer.name ||
                        trainer.username ||
                        ""
                    );
                }
            } catch (profileError) {
                console.error(
                    "Unable to load trainer profile:",
                    profileError
                );
            }
        }

        void loadTrainerProfile();

        return () => {
            cancelled = true;
        };
    }, []);

    /**
     * Load dashboard statistics and customer goals.
     *
     * The effect runs when the page mounts and whenever
     * the trainer clicks Refresh.
     */
    useEffect(() => {
        let cancelled = false;

        async function loadDashboard() {
            setLoading(true);
            setError("");
            setWarning("");

            try {
                // Load the trainer's assignments and the
                // customer/training directories.
                const [assignments, customers, trainings] =
                    await Promise.all([
                        getAssignedCustomers(),
                        fetchCustomers(),
                        fetchTrainings(),
                    ]);

                // Build a lookup of university customers by ID.
                const customersById = new Map<number, Customer>();

                for (const customer of customers) {
                    const customerId = getCustomerId(
                        customer._links?.self?.href
                    );

                    if (customerId !== null) {
                        customersById.set(customerId, customer);
                    }
                }

                // Match My Customers: count only assignments with a directory record.
                const assignedCustomerCount = assignments.filter(
                    (assignment) =>
                        customersById.has(assignment.universityCustomerId)
                ).length;

                /**
                 * Load goals for every trainer-customer assignment.
                 *
                 * This uses the same backend resource as the
                 * Customer Goals page.
                 *
                 * A goal modification will be visible the next
                 * time this dashboard fetches the goals.
                 */
                const goalResults = await Promise.allSettled(
                    assignments.map(async (assignment) => {
                        const response = await axios.get<CustomerGoal[]>(
                            `/api/trainer-customers/${assignment.id}/goals`,
                            {
                                withCredentials: true,
                            }
                        );

                        return {
                            assignment,
                            goals: response.data,
                        };
                    })
                );

                const allGoals: DashboardGoal[] = [];
                let failedGoalRequests = 0;

                for (const result of goalResults) {
                    if (result.status === "rejected") {
                        failedGoalRequests += 1;

                        console.error(
                            "Unable to load customer goals:",
                            result.reason
                        );

                        continue;
                    }

                    const { assignment, goals } = result.value;

                    const customer = customersById.get(
                        assignment.universityCustomerId
                    );

                    const customerName = customer
                        ? getCustomerName(customer)
                        : `Customer #${assignment.universityCustomerId}`;

                    for (const goal of goals) {
                        // Only ACTIVE goals belong in the
                        // current goal summary.
                        if (
                            goal.status?.toUpperCase() !==
                            "ACTIVE"
                        ) {
                            continue;
                        }

                        allGoals.push({
                            id: goal.id,
                            assignmentId: assignment.id,
                            customerName,
                            title: goal.title,
                            description:
                                goal.description ?? "",
                            targetDate: goal.targetDate ?? "",
                            targetSessions:
                                goal.targetSessions ?? null,
                        });
                    }
                }

                // Today's date at local midnight.
                // This includes goals due later today.
                const today = dayjs().startOf("day");

                /**
                 * Upcoming goals have a valid target date
                 * equal to or later than today.
                 *
                 * Goals without a target date remain counted
                 * as active but cannot be placed in a
                 * deadline-based upcoming list.
                 */
                const futureGoals = allGoals
                    .filter((goal) => {
                        const date = dayjs(goal.targetDate);

                        return (
                            goal.targetDate !== "" &&
                            date.isValid() &&
                            !date.isBefore(today, "day")
                        );
                    })
                    .sort(
                        (first, second) =>
                            dayjs(first.targetDate).valueOf() -
                            dayjs(second.targetDate).valueOf()
                    );

                // Match the Trainings page and original dashboard:
                // count and total every record returned by the API.
                const minutes = trainings.reduce(
                    (sum, training) => {
                        const duration = Number(
                            training.duration
                        );

                        return Number.isFinite(duration) &&
                            duration > 0
                            ? sum + duration
                            : sum;
                    },
                    0
                );

                if (!cancelled) {
                    setCustomerCount(assignedCustomerCount);
                    setTrainingCount(trainings.length);
                    setTotalMinutes(minutes);
                    setActiveGoalCount(allGoals.length);

                    // Display the five nearest goal deadlines.
                    setUpcomingGoals(futureGoals.slice(0, 5));

                    if (failedGoalRequests > 0) {
                        setWarning(
                            "Some customer goals could not be loaded. The displayed goal totals may be incomplete."
                        );
                    }
                }
            } catch (loadError) {
                console.error(
                    "Unable to load dashboard:",
                    loadError
                );

                if (!cancelled) {
                    setError(
                        "Unable to load dashboard information. Please try again."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadDashboard();

        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    // Summary cards are generated from current API data.
    const metrics = [
        {
            title: "My Customers",
            value: customerCount.toLocaleString(),
            description: "Assigned customers",
        },
        {
            title: "Training Sessions",
            value: trainingCount.toLocaleString(),
            description: "Recorded sessions",
        },
        {
            title: "Training Time",
            value: `${totalMinutes.toLocaleString()} min`,
            description: "Total recorded duration",
        },
        {
            title: "Active Goals",
            value: activeGoalCount.toLocaleString(),
            description: "Goals currently in progress",
        },
    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 5, mb: 6 }}>
            {/* Personalized greeting and refresh button. */}
            <Box
                sx={{
                    mb: 4,
                    display: "flex",
                    justifyContent: "space-between",
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
                <Box>
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
                        Here's an overview of your customers,
                        training activity, and goals.
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                    >
                        {dayjs().format("dddd, DD MMMM YYYY")}
                    </Typography>
                </Box>

                {/* Refresh retrieves goal changes and the latest
                    customer/training information. */}
                <Button
                    variant="outlined"
                    disabled={loading}
                    onClick={() =>
                        setRefreshKey((previous) => previous + 1)
                    }
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
                    Refresh Dashboard
                </Button>
            </Box>

            {/* Show API problems clearly. */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {warning && !error && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    {warning}
                </Alert>
            )}

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
                    {/* Real dashboard statistics. */}
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

                    {/* Upcoming goals, not unrelated training
                        sessions or historical training records. */}
                    <Box sx={{ mb: 3 }}>
                        <Typography
                            variant="h5"
                            component="h2"
                            sx={{
                                color: "#174D43",
                                fontWeight: 800,
                                mb: 1,
                            }}
                        >
                            Upcoming Customer Goals
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            The next five active goals with
                            approaching target dates.
                        </Typography>
                    </Box>

                    {upcomingGoals.length === 0 ? (
                        <Alert severity="info">
                            No upcoming goal deadlines are
                            currently scheduled.
                        </Alert>
                    ) : (
                        <Stack spacing={2}>
                            {upcomingGoals.map((goal) => (
                                <Paper
                                    key={`${goal.assignmentId}-${goal.id}`}
                                    elevation={0}
                                    sx={{
                                        borderRadius: 3,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        borderLeft:
                                            "4px solid #9BE564",
                                        overflow: "hidden",
                                    }}
                                >
                                    {/* Clicking a goal opens the
                                        correct assigned customer's
                                        existing Goals page. */}
                                    <CardActionArea
                                        onClick={() =>
                                            navigate(
                                                `/my-customers/${goal.assignmentId}/goals`
                                            )
                                        }
                                        sx={{ p: 3 }}
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
                                            <Box>
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        color: "#174D43",
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {goal.title}
                                                </Typography>

                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ mt: 0.5 }}
                                                >
                                                    Customer:{" "}
                                                    {goal.customerName}
                                                </Typography>

                                                {goal.description && (
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ mt: 1 }}
                                                    >
                                                        {goal.description}
                                                    </Typography>
                                                )}

                                                {goal.targetSessions !== null && (
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{ mt: 1 }}
                                                    >
                                                        Target sessions:{" "}
                                                        {goal.targetSessions}
                                                    </Typography>
                                                )}
                                            </Box>

                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: {
                                                        xs: "flex-start",
                                                        sm: "flex-end",
                                                    },
                                                    gap: 1,
                                                }}
                                            >
                                                <Chip
                                                    label="Active"
                                                    size="small"
                                                    sx={{
                                                        bgcolor: "#E8F5D6",
                                                        color: "#174D43",
                                                        fontWeight: 700,
                                                    }}
                                                />

                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: "#174D43",
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    Due{" "}
                                                    {dayjs(
                                                        goal.targetDate
                                                    ).format(
                                                        "DD.MM.YYYY"
                                                    )}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardActionArea>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </>
            ) : null}
        </Container>
    );
};
