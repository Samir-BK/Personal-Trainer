import { useEffect, useState } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Typography,
    Chip,
    Paper
} from "@mui/material";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
// Date and time picker using the existing Day.js library.
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import type { Customer, Training } from "../types/trainer";
import {
    fetchTrainings,
    fetchCustomers,
    fetchCustomersByURL,
    createTraining
} from "../services/trainerService";

// Each row contains a university training record and, when available,
// the customer details retrieved using the training's HAL customer link.
// gridId is a stable DataGrid identifier for this fetched result set.
type TrainingWithCustomer = Training & {
    customer?: Customer;
    gridId: string;
};

// TrainingList displays university training sessions in a searchable,
// sortable, paginated Material UI table. It does not modify training data.
export const TrainingList = () => {
    // Store the training records together with their customer information.
    const [trainings, setTrainings] = useState<TrainingWithCustomer[]>([]);

    // Display the DataGrid loading state while API requests are in progress.
    const [loading, setLoading] = useState(true);

    // Show a helpful page-level error if the university training API fails.
    // An individual missing customer does not prevent other sessions loading.
    const [error, setError] = useState("");


    // Controls whether the Add Training dialog is visible.
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    // Holds university customers available for selection.
    const [customers, setCustomers] = useState<Customer[]>([]);

    // Tracks loading of customer options and training submission.
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [savingTraining, setSavingTraining] = useState(false);

    // Stores the new training's editable fields.
    //
    // The customer is represented by its HAL self-link because
    // the university API uses links for resource relationships.
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [activity, setActivity] = useState("");
    const [duration, setDuration] = useState("");
    const [trainingDate, setTrainingDate] = useState<Dayjs | null>(null);

    // Separate errors for the form and the main page.
    const [formError, setFormError] = useState("");
    const [pageMessage, setPageMessage] = useState("");
    const [pageMessageType, setPageMessageType] =
        useState<"success" | "error">("success");


    // Fetch the training list once when this page is mounted.
    useEffect(() => {
        // Ignore asynchronous results after navigating away from this page.
        // This also handles React StrictMode's development effect cleanup.
        let active = true;

        async function loadTrainings() {
            setLoading(true);
            setError("");

            try {
                // Load the training records from the university REST API.
                const data = await fetchTrainings();

                // Each training includes a HAL link to its customer.
                // Fetch customer names independently; a failure for one
                // customer should not hide the training session itself.
                const rows = await Promise.all(
                    data.map(async (training, index): Promise<TrainingWithCustomer> => {
                        // Prefer the actual training ID. If it is absent,
                        // use its position in this fetched result set instead
                        // of Math.random(), which produces unstable row IDs.
                        const gridId =
                            training.id != null
                                ? String(training.id)
                                : `training-row-${index}`;

                        try {
                            const customer = await fetchCustomersByURL(
                                training._links.customer.href
                            );

                            return { ...training, customer, gridId };
                        } catch (customerError) {
                            // Keep the training visible if its customer
                            // cannot be fetched from the university API.
                            console.error(
                                "Error loading training customer:",
                                customerError
                            );
                            return { ...training, gridId };
                        }
                    })
                );

                if (active) {
                    setTrainings(rows);
                }
            } catch (requestError) {
                console.error("Error loading trainings:", requestError);

                if (active) {
                    // Clear any previously displayed results after failure.
                    setTrainings([]);
                    setError(
                        "Unable to load training sessions. Check that the university API is available."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadTrainings();

        // Prevent updates from a request completing after unmount.
        return () => {
            active = false;
        };

    }, []);


    // Open the form and load the university customer options.
    // Customer data is fetched when needed rather than on every render.
    async function openAddTrainingDialog() {
        setSelectedCustomer("");
        setActivity("");
        setDuration("");
        setTrainingDate(null);
        setFormError("");

        setAddDialogOpen(true);
        setLoadingCustomers(true);

        try {
            // Retrieve customers so trainers can select a real
            // university customer for the new training.
            const customerData = await fetchCustomers();
            setCustomers(customerData);
        } catch (error) {
            console.error("Unable to load customers:", error);
            setFormError("Unable to load the customer list.");
        } finally {
            setLoadingCustomers(false);
        }
    }

    // Close the form without saving any training data.
    function closeAddTrainingDialog() {
        // Avoid closing during an active POST request.
        if (savingTraining) {
            return;
        }

        setAddDialogOpen(false);
        setFormError("");
    }

    // Submit a new training session to the university REST API.
    async function handleCreateTraining() {
        if (savingTraining) {
            return;
        }

        // Convert the duration input from a string to a number.
        const durationMinutes = Number(duration);

        // Validate required fields before contacting the API.
        if (!selectedCustomer || !activity.trim()) {
            setFormError("Select a customer and enter an activity.");
            return;
        }

        // Require a positive whole number of minutes.
        if (
            !duration.trim() ||
            !Number.isSafeInteger(durationMinutes) ||
            durationMinutes <= 0
        ) {
            setFormError(
                "Duration must be a positive whole number."
            );
            return;
        }

        // Ensure a real calendar date and time was selected.
        if (!trainingDate || !trainingDate.isValid()) {
            setFormError("Select a valid training date and time.");
            return;
        }

        setSavingTraining(true);
        setFormError("");

        try {
            // Submit the selected customer, activity, duration,
            // and date/time to the university API.
            //
            // toISOString() includes the UTC timezone information.
            await createTraining({
                customer: selectedCustomer,
                activity: activity.trim(),
                duration: durationMinutes,
                date: trainingDate.toISOString(),
            });

            // Reload training records after successful creation.
            // Resolve customer names just like the existing page does.
            const trainingData = await fetchTrainings();

            const updatedRows = await Promise.all(
                trainingData.map(
                    async (training, index): Promise<TrainingWithCustomer> => {
                        const gridId =
                            training.id != null
                                ? String(training.id)
                                : `training-row-${index}`;

                        try {
                            const customer = await fetchCustomersByURL(
                                training._links.customer.href
                            );

                            return { ...training, customer, gridId };
                        } catch (error) {
                            console.error(
                                "Unable to load training customer:",
                                error
                            );

                            return { ...training, gridId };
                        }
                    }
                )
            );

            // Update the table without refreshing the browser.
            setTrainings(updatedRows);
            setAddDialogOpen(false);

            setPageMessage("Training created successfully.");
            setPageMessageType("success");

        } catch (error) {
            console.error("Unable to create training:", error);

            setFormError(
                "Unable to create training. Check the details and try again."
            );
        } finally {
            setSavingTraining(false);
        }
    }


    // Configure the columns shown in the training table.
    // Every column has a minimum width so narrow screens can scroll
    // horizontally instead of squeezing the text into unreadable cells.
    const columns: GridColDef<TrainingWithCustomer>[] = [
        {
            // Convert the API date to a familiar day/month/year format.
            field: "date",
            headerName: "Date & Time",
            flex: 1.5,
            minWidth: 180,
            valueFormatter: (value) =>
                value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "—",
        },
        {
            // Training duration is measured in minutes by the university API.
            field: "duration",
            headerName: "Duration (min)",
            flex: 1,
            minWidth: 140,
            type: "number",
        },
        {
            // Show the activity name, such as Running or Cycling.
            field: "activity",
            headerName: "Activity",
            flex: 1.3,
            minWidth: 160,
        },
        {
            // Customer details are nested in our enriched training row.
            // Show a fallback if the linked customer request failed.
            field: "customer",
            headerName: "Customer",
            flex: 1.5,
            minWidth: 190,
            valueGetter: (_value, row) =>
                row.customer
                    ? `${row.customer.firstname} ${row.customer.lastname}`
                    : "Unavailable",
        },
    ];

    return (
        // The shared App layout already provides a page container.
        // This narrower container keeps the training table comfortable
        // to read on desktop while remaining full width on mobile.
        <Container maxWidth="lg" sx={{ mt: { xs: 1, md: 2 }, mb: 6 }}>
            {/* Page heading and description use our forest-green theme. */}
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="overline"
                    sx={{
                        color: "secondary.main",
                        fontWeight: 800,
                        letterSpacing: 2,
                    }}
                >
                    TRAINING MANAGEMENT
                </Typography>

                <Typography
                    variant="h4"
                    component="h1"
                    sx={{ color: "secondary.main", fontWeight: 800, mb: 1 }}
                >
                    Training Sessions
                </Typography>

                {/* Display feedback after successfully creating a training. */}
                {pageMessage && (
                    <Alert
                        severity={pageMessageType}
                        onClose={() => setPageMessage("")}
                        sx={{ mb: 2 }}
                    >
                        {pageMessage}
                    </Alert>
                )}

                {/* Open the Add Training dialog without leaving the page. */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
                    <Button
                        variant="contained"
                        onClick={() => void openAddTrainingDialog()}
                        sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            fontWeight: 700,
                            "&:hover": {
                                bgcolor: "primary.dark",
                            },
                        }}
                    >
                        + Add Training
                    </Button>
                </Box>


                <Typography color="text.secondary">
                    Browse training sessions and customer activity from the training service.
                </Typography>
            </Box>

            {/* Report an API failure without showing a misleading empty list. */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* White surface and subtle green-tinted shadow match the
                customer directory and fitness-goal page styling. */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 4,
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "0 12px 35px rgba(23, 77, 67, 0.06)",
                }}
            >
                {/* Count only records that have actually been fetched. */}
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{
                        mb: 2,
                        justifyContent: "space-between",
                        alignItems: { xs: "flex-start", sm: "center" },
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{ color: "secondary.main", fontWeight: 800 }}
                    >
                        All Sessions
                    </Typography>

                    <Chip
                        label={`${trainings.length} sessions`}
                        sx={{
                            bgcolor: "#E8F5E1",
                            color: "#174D43",
                            fontWeight: 800,
                        }}
                    />
                </Stack>

                {/* The table scrolls horizontally on small screens.
                    DataGrid retains sorting and pagination functionality. */}
                <Box sx={{ width: "100%", overflowX: "auto" }}>
                    <Box sx={{ height: 570, minWidth: 680 }}>
                        <DataGrid
                            // Use the enriched training records as grid rows.
                            rows={trainings}
                            columns={columns}

                            // A stable ID prevents rows changing identity
                            // during re-renders or when the table is sorted.
                            getRowId={(row) => row.gridId}

                            // Material UI displays a loader while fetching.
                            loading={loading}

                            // Allow trainers to choose a page size.
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: {
                                    paginationModel: { pageSize: 10 },
                                },
                            }}

                            // Explain the empty state when no sessions exist.
                            localeText={{ noRowsLabel: "No training sessions found." }}

                            // Keep a clean white table with green headings,
                            // readable rows, and subtle hover highlighting.
                            sx={{
                                border: 0,
                                "& .MuiDataGrid-columnHeaders": {
                                    bgcolor: "#E8F5E1",
                                    color: "#174D43",
                                    fontWeight: 800,
                                },
                                "& .MuiDataGrid-columnHeaderTitle": {
                                    fontWeight: 800,
                                },
                                "& .MuiDataGrid-row:hover": {
                                    bgcolor: "#F7FAF5",
                                },
                                "& .MuiDataGrid-cell": {
                                    borderColor: "#EEF2EC",
                                },
                            }}
                        />
                    </Box>
                </Box>

                {/* Add Training dialog.
    All input fields are stored in React state until the trainer
    confirms creation. No request is sent when the dialog opens. */}
                <Dialog
                    open={addDialogOpen}
                    onClose={closeAddTrainingDialog}
                    fullWidth
                    maxWidth="sm"
                    slotProps={{
                        paper: {
                            sx: { borderRadius: 3 },
                        },
                    }}
                >
                    <DialogTitle
                        sx={{
                            color: "secondary.main",
                            fontWeight: 800,
                        }}
                    >
                        Add Training Session
                    </DialogTitle>

                    <DialogContent>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 3 }}
                        >
                            Select a customer and enter their training details.
                        </Typography>

                        {/* Keep API and validation errors visible inside the form. */}
                        {formError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {formError}
                            </Alert>
                        )}

                        {/* Disable customer selection while options are loading. */}
                        {loadingCustomers ? (
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    p: 3,
                                }}
                            >
                                <CircularProgress />
                            </Box>
                        ) : (
                            <Stack spacing={2.5}>

                                {/* Customer selection uses university HAL self-links.
                    This is unrelated to trainer assignment IDs. */}
                                <TextField
                                    select
                                    label="Customer"
                                    value={selectedCustomer}
                                    onChange={(event) =>
                                        setSelectedCustomer(event.target.value)
                                    }
                                    fullWidth
                                    required
                                >
                                    {customers.map((customer) => {
                                        const customerUrl =
                                            customer._links?.self?.href;

                                        // Ignore customers without valid HAL links.
                                        if (!customerUrl) {
                                            return null;
                                        }

                                        return (
                                            <MenuItem
                                                key={customerUrl}
                                                value={customerUrl}
                                            >
                                                {customer.firstname} {customer.lastname}
                                            </MenuItem>
                                        );
                                    })}
                                </TextField>

                                {/* Activity name, such as Jogging or Cycling. */}
                                <TextField
                                    label="Activity"
                                    value={activity}
                                    onChange={(event) =>
                                        setActivity(event.target.value)
                                    }
                                    placeholder="e.g. Running"
                                    fullWidth
                                    required
                                />

                                {/* Training duration must be in whole minutes. */}
                                <TextField
                                    label="Duration (minutes)"
                                    type="number"
                                    value={duration}
                                    onChange={(event) =>
                                        setDuration(event.target.value)
                                    }
                                    slotProps={{
                                        htmlInput: {
                                            min: 1,
                                            step: 1,
                                        },
                                    }}
                                    fullWidth
                                    required
                                />

                                {/* Material UI date/time picker with Day.js.
                    The trainer can choose both exercise date
                    and starting time in one control. */}
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DateTimePicker
                                        label="Training Date & Time"
                                        value={trainingDate}
                                        onChange={(value) =>
                                            setTrainingDate(value)
                                        }
                                        ampm={false}
                                        format="DD.MM.YYYY HH:mm"
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                required: true,
                                            },
                                        }}
                                    />
                                </LocalizationProvider>

                            </Stack>
                        )}
                    </DialogContent>

                    {/* Cancel discards the form.
        Save submits POST /trainings to the university API. */}
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            color="secondary"
                            onClick={closeAddTrainingDialog}
                            disabled={savingTraining}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="contained"
                            onClick={() => void handleCreateTraining()}
                            disabled={savingTraining || loadingCustomers}
                            sx={{
                                bgcolor: "primary.main",
                                color: "primary.contrastText",
                                fontWeight: 700,
                                "&:hover": {
                                    bgcolor: "primary.dark",
                                },
                            }}
                        >
                            {savingTraining ? "Saving..." : "Create Training"}
                        </Button>
                    </DialogActions>
                </Dialog>

            </Paper>
        </Container>
    );
};
