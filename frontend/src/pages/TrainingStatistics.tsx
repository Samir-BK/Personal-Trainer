
import { useEffect, useState } from "react";

import {
    Alert,
    Box,
    CircularProgress,
    Container,
    Paper,
    Typography,
} from "@mui/material";

import { BarChart } from "@mui/x-charts/BarChart";

import { fetchTrainings } from "../services/trainerService";
import type { Training } from "../types/trainer";

/**
 * Represents one activity in the statistics chart.
 *
 * For example:
 * { activity: "Running", minutes: 135 }
 *
 * Multiple training sessions with the same activity
 * are combined into one total.
 */
type ActivityStatistics = {
    activity: string;
    minutes: number;
};

/**
 * Calculate total training minutes for each activity.
 *
 * The university API returns individual training sessions.
 * This function groups them by activity and sums their durations.
 *
 * Invalid durations and missing activity names are excluded
 * to avoid displaying misleading statistics.
 */
function calculateActivityStatistics(
    trainings: Training[]
): ActivityStatistics[] {
    // Map each normalized activity name to its total duration.
    const totals = new Map<string, number>();

    for (const training of trainings) {
        const activity = training.activity?.trim();
        const duration = Number(training.duration);

        // Skip records without an activity or a valid duration.
        if (
            !activity ||
            !Number.isFinite(duration) ||
            duration <= 0
        ) {
            continue;
        }

        // Combine Running, running, and RUNNING into one category.
        const normalizedActivity = activity.toLowerCase();

        totals.set(
            normalizedActivity,
            (totals.get(normalizedActivity) ?? 0) + duration
        );
    }

    // Convert the Map into the dataset expected by MUI Charts.
    const statistics = Array.from(
        totals,
        ([activity, minutes]) => ({
            // Capitalize the first letter for readable chart labels.
            activity:
                activity.charAt(0).toUpperCase() + activity.slice(1),
            minutes,
        })
    );

    // Display the activities with the highest total minutes first.
    return statistics.sort(
        (first, second) => second.minutes - first.minutes
    );
}

/**
 * Training Statistics page.
 *
 * Reads university training data and displays a bar chart
 * of total training minutes grouped by activity.
 *
 * This page is read-only and does not modify training records.
 */
export const TrainingStatistics = () => {
    // Chart data calculated from the university training sessions.
    const [statistics, setStatistics] = useState<
        ActivityStatistics[]
    >([]);

    // Tracks loading and API failures.
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        // Prevent state updates if the user navigates away while
        // the university API request is still running.
        let cancelled = false;

        async function loadStatistics() {
            try {
                // Fetch training sessions using our existing service.
                const trainings = await fetchTrainings();

                // Group training sessions by activity and sum minutes.
                const results = calculateActivityStatistics(trainings);

                if (!cancelled) {
                    setStatistics(results);
                    setError("");
                }
            } catch (loadError) {
                console.error(
                    "Unable to load training statistics:",
                    loadError
                );

                if (!cancelled) {
                    setError(
                        "Unable to load training statistics. Please try again."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadStatistics();

        return () => {
            cancelled = true;
        };
    }, []);

    // Summary numbers calculated from the grouped data.
    const totalMinutes = statistics.reduce(
        (sum, item) => sum + item.minutes,
        0
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 5 }}>
            {/* Page heading consistent with other application pages. */}
            <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                    color: "secondary.main",
                    fontWeight: 800,
                }}
            >
                Training Statistics
            </Typography>

            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
            >
                Total training minutes grouped by activity using
                records from the university REST API.
            </Typography>

            {/* Show errors instead of displaying misleading statistics. */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Display a loading indicator while fetching data. */}
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
            ) : !error && statistics.length === 0 ? (
                <Alert severity="info">
                    No valid training sessions are available
                    for statistics.
                </Alert>
            ) : !error ? (
                <>
                    {/* Summary above the chart. */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: 3,
                            mb: 3,
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: "divider",
                        }}
                    >
                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Total Training Time
                        </Typography>

                        <Typography
                            variant="h4"
                            sx={{
                                color: "secondary.main",
                                fontWeight: 800,
                            }}
                        >
                            {totalMinutes.toLocaleString()} minutes
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 1 }}
                        >
                            Across {statistics.length} activities
                        </Typography>
                    </Paper>

                    {/* The chart uses the grouped statistics dataset.

                        Horizontal bars keep activity names readable
                        even when the university API returns many
                        different activities.

                        The chart height grows with the number of
                        activities to prevent bars from overlapping.
                    */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 1, sm: 3 },
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: "divider",
                        }}
                    >
                        <Typography
                            variant="h6"
                            sx={{
                                color: "secondary.main",
                                fontWeight: 700,
                                mb: 2,
                            }}
                        >
                            Minutes by Activity
                        </Typography>

                        <BarChart
                            dataset={statistics}
                            layout="horizontal"
                            yAxis={[
                                {
                                    dataKey: "activity",
                                    scaleType: "band",
                                    width: 120,
                                },
                            ]}
                            xAxis={[
                                {
                                    label: "Total minutes",
                                    min: 0,
                                },
                            ]}
                            series={[
                                {
                                    dataKey: "minutes",
                                    label: "Training minutes",
                                    color: "#9BE564",
                                    valueFormatter: (value) =>
                                        `${value ?? 0} min`,
                                },
                            ]}
                            height={Math.max(
                                350,
                                statistics.length * 55
                            )}
                            grid={{ vertical: true }}
                            borderRadius={5}
                        />
                    </Paper>
                </>
            ) : null}
        </Container>
    );
};
