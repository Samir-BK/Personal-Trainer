
import { useEffect, useState } from "react";

import {
    Alert,
    Box,
    CircularProgress,
    Container,
    Typography,
} from "@mui/material";

import { EventCalendar } from "@mui/x-scheduler/event-calendar";
import type { SchedulerEvent } from "@mui/x-scheduler/models";

import dayjs from "dayjs";

import type { Customer, Training } from "../types/trainer";

import {
    fetchTrainings,
    fetchCustomersByURL,
} from "../services/trainerService";

/**
 * Convert university training records into MUI Scheduler events.
 *
 * The university API provides:
 * - date: training starting time
 * - duration: training length in minutes
 * - activity: training activity
 * - _links.customer.href: related customer resource
 *
 * MUI Scheduler expects:
 * - id: unique event identifier
 * - title: text displayed on the calendar
 * - start: event starting time
 * - end: event finishing time
 *
 * The calendar is read-only. All actual training changes continue
 * to happen through the existing Training Sessions page.
 */
export const TrainingCalendar = () => {
    // Calendar events derived from real university training records.
    const [events, setEvents] = useState<SchedulerEvent[]>([]);

    // Loading and error states for the university REST API.
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        // Prevent state updates if the component unmounts while
        // an asynchronous university API request is running.
        let cancelled = false;

        async function loadTrainingCalendar() {
            try {
                // Fetch the complete training collection.
                const trainings = await fetchTrainings();

                // Cache customer requests so multiple training sessions
                // belonging to the same customer do not require
                // repeated requests to the same URL.
                const customerCache = new Map<
                    string,
                    Promise<Customer>
                >();

                // Resolve customer names and transform every valid
                // training into an MUI Scheduler event.
                const calendarEvents = await Promise.all(
                    trainings.map(async (training: Training, index) => {
                        // Check that the training has a valid start date.
                        const start = dayjs(training.date);

                        // Duration is expected to be in minutes.
                        const durationMinutes = Number(training.duration);

                        if (
                            !start.isValid() ||
                            !Number.isFinite(durationMinutes) ||
                            durationMinutes <= 0
                        ) {
                            // Skip records that cannot be placed accurately
                            // on a time-based calendar.
                            console.warn(
                                "Skipping training with invalid date or duration:",
                                training
                            );

                            return null;
                        }

                        // The end time is calculated from the actual
                        // training duration, not a fixed one-hour block.
                        const end = start.add(durationMinutes, "minute");

                        // Extract the university customer relationship.
                        const customerUrl =
                            training._links?.customer?.href;

                        let customerName = "Unknown customer";

                        if (customerUrl) {
                            try {
                                // Reuse an existing customer request
                                // when multiple trainings share a customer.
                                let customerRequest =
                                    customerCache.get(customerUrl);

                                if (!customerRequest) {
                                    customerRequest =
                                        fetchCustomersByURL(customerUrl);

                                    customerCache.set(
                                        customerUrl,
                                        customerRequest
                                    );
                                }

                                const customer = await customerRequest;

                                customerName =
                                    `${customer.firstname} ${customer.lastname}`;
                            } catch (customerError) {
                                // Keep showing the training even if
                                // its customer relationship cannot load.
                                console.error(
                                    "Unable to resolve training customer:",
                                    customerError
                                );
                            }
                        }

                        // Prefer the university HAL self-link as a
                        // stable identifier for this calendar event.
                        //
                        // The index is only a display fallback.
                        // It is never used for PUT or DELETE requests.
                        const eventId =
                            training._links?.self?.href ??
                            `calendar-event-${index}`;

                        const event: SchedulerEvent = {
                            id: eventId,

                            // Show both the activity and customer so
                            // the calendar is useful at a glance.
                            title:
                                `${training.activity} — ${customerName}`,

                            // Preserve the timestamp's timezone information
                            // when converting the date to ISO format.
                            start: start.toISOString(),
                            end: end.toISOString(),

                            // Additional context shown when the user
                            // inspects the read-only event.
                            description:
                                `Customer: ${customerName}\n` +
                                `Activity: ${training.activity}\n` +
                                `Duration: ${durationMinutes} minutes`,
                        };

                        return event;
                    })
                );

                // Remove invalid training records from the result.
                // The type guard keeps TypeScript aware that the
                // remaining entries are valid SchedulerEvent objects.
                const validEvents = calendarEvents.filter(
                    (event): event is SchedulerEvent =>
                        event !== null
                );

                // Do not update React state after unmounting.
                if (!cancelled) {
                    setEvents(validEvents);
                    setError("");
                }
            } catch (loadError) {
                console.error(
                    "Unable to load training calendar:",
                    loadError
                );

                if (!cancelled) {
                    setError(
                        "Unable to load training sessions. Please try again later."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadTrainingCalendar();

        // Cleanup protects against updates from stale requests.
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 5 }}>
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
                Training Calendar
            </Typography>

            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
            >
                View training sessions by month, week,
                or day. Select an event to inspect its details.
                Manage training records from the Training Sessions page.
            </Typography>

            {/* Show API failures rather than an empty calendar that
                could incorrectly suggest there are no trainings. */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Wait until training and customer data is available. */}
            {loading ? (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: 400,
                    }}
                >
                    <CircularProgress />
                </Box>
            ) : !error ? (
                <>
                    {/* Show how many valid training records were loaded. */}
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                    >
                        {events.length} training session
                        {events.length !== 1 ? "s" : ""} loaded
                    </Typography>

                    {/* MUI X Event Calendar.

                        Available views:
                        - month: calendar grid for the whole month
                        - week: hourly schedule across seven days
                        - day: hourly schedule for one day

                        readOnly disables editing, creating, deleting,
                        dragging, and resizing calendar events.

                        We use the existing Training Sessions page
                        for any operation that modifies API data.
                    */}
                    <Box
                        sx={{
                            height: 750,
                            width: "100%",
                        }}
                    >
                        <EventCalendar
                            events={events}
                            views={["month", "week", "day"]}
                            defaultView="month"
                            readOnly
                            dateLocale="en-GB"
                            defaultPreferences={{
                                ampm: false,
                                weekStartsOn: 1,
                            }}
                            sx={{
                                height: "100%",
                                width: "100%",
                                borderRadius: 3,
                            }}
                        />
                    </Box>
                </>
            ) : null}
        </Container>
    );
};
