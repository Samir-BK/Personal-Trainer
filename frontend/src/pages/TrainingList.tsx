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
    Paper,
    DialogContentText,
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
    createTraining,
    deleteTraining
} from "../services/trainerService";

// Identify HTTP errors returned by the university REST API.
import axios from "axios";


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


    // Stores the training selected for deletion.
    //
    // null means the confirmation dialog is closed.
    // Keeping the training object allows us to show its activity,
    // date, and customer before the trainer confirms deletion.
    const [trainingToDelete, setTrainingToDelete] =
        useState<TrainingWithCustomer | null>(null);

    // Tracks whether a DELETE request is currently running.
    // This prevents duplicate submissions and accidental dialog closure.
    const [deletingTraining, setDeletingTraining] = useState(false);

    // Stores errors returned when training deletion fails.
    // Errors appear inside the confirmation dialog.
    const [deleteError, setDeleteError] = useState("");



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


    // Extract the real university training ID.
    //
    // Prefer the numeric ID returned by the API when available.
    // If the API does not expose an ID directly, extract it from
    // the HAL self-link, such as /api/trainings/12.
    //
    // Never use a DataGrid row index or a random ID for deletion.
    function getTrainingId(training: Training): number | null {
        const directId = Number(training.id);

        // Accept a valid ID directly from the training record.
        if (Number.isSafeInteger(directId) && directId > 0) {
            return directId;
        }

        // Some HAL responses expose a self-link instead of an ID.
        // Read that optional link without changing the Training type.
        const links = training._links as {
            self?: { href?: string };
        };

        const href = links.self?.href;

        if (!href) {
            return null;
        }

        // Extract a numeric ID from the end of the training URL.
        // Example: https://example.com/api/trainings/12 -> 12
        const match = href.match(
            /\/trainings\/(\d+)\/?(?:\?.*)?$/
        );

        return match ? Number(match[1]) : null;
    }

    // Open the confirmation dialog for one training.
    //
    // Clicking Delete in the table does not immediately delete
    // anything from the university API.
    function openDeleteTrainingDialog(
        training: TrainingWithCustomer
    ) {
        const trainingId = getTrainingId(training);

        // Reject records without a valid university training ID.
        if (trainingId === null) {
            setPageMessage(
                "Cannot delete this training because its ID is unavailable."
            );
            setPageMessageType("error");
            return;
        }

        // Store the selected training and clear previous errors.
        setTrainingToDelete(training);
        setDeleteError("");
    }

    // Close the dialog without deleting the selected training.
    function closeDeleteTrainingDialog() {
        // Keep the dialog open while the DELETE request is running.
        if (deletingTraining) {
            return;
        }

        setTrainingToDelete(null);
        setDeleteError("");
    }

    // Permanently delete the training after explicit confirmation.
    //
    // This operation affects the university REST API.
    // It does not modify our Spring Boot PostgreSQL database.
    async function handleDeleteTraining() {
        // Do nothing if no training is selected.
        if (trainingToDelete === null || deletingTraining) {
            return;
        }

        // Retrieve the university ID from the selected record.
        const trainingId = getTrainingId(trainingToDelete);

        if (trainingId === null) {
            setDeleteError("The selected training has no valid ID.");
            return;
        }

        // Prevent duplicate deletion requests.
        setDeletingTraining(true);
        setDeleteError("");

        try {
            // Call DELETE /trainings/{id} through our university API client.
            await deleteTraining(trainingId);

            // Remove the deleted training from the displayed table.
            // Only update local state after the API confirms success.
            setTrainings((previous) =>
                previous.filter(
                    (training) =>
                        getTrainingId(training) !== trainingId
                )
            );

            // Close the confirmation dialog.
            setTrainingToDelete(null);
            setDeleteError("");

            // Display a success message above the training table.
            setPageMessage("Training deleted successfully.");
            setPageMessageType("success");

        } catch (error: unknown) {
            // Keep the dialog open if the API rejects deletion.
            console.error("Unable to delete training:", error);

            // Prefer a readable API error if one is available.
            const backendError = axios.isAxiosError(error)
                ? error.response?.data?.error
                : undefined;

            setDeleteError(
                typeof backendError === "string"
                    ? backendError
                    : "Unable to delete training. Please try again."
            );

        } finally {
            // Restore the confirmation controls after the request.
            setDeletingTraining(false);
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

        {
            // Provide a Delete action for each university training session.
            //
            // The button opens a confirmation dialog first.
            // It never immediately sends a DELETE request.
            field: "deleteTraining",
            headerName: "Actions",
            width: 145,
            sortable: false,
            filterable: false,

            // The row contains the original training and its customer details.
            renderCell: (params) => {
                const trainingId = getTrainingId(params.row);

                return (
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() =>
                            openDeleteTrainingDialog(params.row)
                        }
                        disabled={
                            trainingId === null ||
                            deletingTraining ||
                            savingTraining ||
                            loading
                        }
                        sx={{
                            fontWeight: 700,
                            borderRadius: 2,
                        }}
                    >
                        Delete
                    </Button>
                );
            },
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

                {/* Confirmation dialog for deleting an existing training.
    The actual DELETE request is sent only after the trainer
    explicitly clicks Yes, Delete. */}
                <Dialog
                    open={trainingToDelete !== null}
                    onClose={closeDeleteTrainingDialog}
                    fullWidth
                    maxWidth="xs"
                    slotProps={{
                        paper: {
                            sx: {
                                borderRadius: 3,
                                p: 1,
                            },
                        },
                    }}
                >
                    {/* Clearly identify the destructive action. */}
                    <DialogTitle
                        sx={{
                            color: "secondary.main",
                            fontWeight: 800,
                        }}
                    >
                        Delete Training?
                    </DialogTitle>

                    <DialogContent>
                        {/* Identify the training session being deleted. */}
                        <DialogContentText sx={{ mb: 2 }}>
                            Are you sure you want to permanently delete
                            this training session?
                        </DialogContentText>

                        {/* Show training details to prevent deleting the wrong row. */}
                        <Box
                            sx={{
                                bgcolor: "background.default",
                                p: 2,
                                borderRadius: 2,
                                mb: 2,
                            }}
                        >
                            <Typography sx={{ fontWeight: 700 }}>
                                {trainingToDelete?.activity}
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                                Customer:{" "}
                                {trainingToDelete?.customer
                                    ? `${trainingToDelete.customer.firstname} ${trainingToDelete.customer.lastname}`
                                    : "Unavailable"}
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                                Date:{" "}
                                {trainingToDelete?.date
                                    ? dayjs(trainingToDelete.date).format(
                                        "DD.MM.YYYY HH:mm"
                                    )
                                    : "Not available"}
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                                Duration:{" "}
                                {trainingToDelete?.duration ?? "—"} minutes
                            </Typography>
                        </Box>

                        {/* Warn the trainer that deletion cannot be undone. */}
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            This operation permanently deletes the training
                            of the customer.
                        </Alert>

                        {/* Keep API errors visible without closing the dialog. */}
                        {deleteError && (
                            <Alert severity="error">
                                {deleteError}
                            </Alert>
                        )}
                    </DialogContent>

                    {/* Cancel closes the dialog without changing data.
        Confirm sends the DELETE request to the university API. */}
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button
                            color="secondary"
                            onClick={closeDeleteTrainingDialog}
                            disabled={deletingTraining}
                        >
                            No, Cancel
                        </Button>

                        <Button
                            variant="contained"
                            color="error"
                            onClick={() => void handleDeleteTraining()}
                            disabled={deletingTraining}
                            sx={{
                                fontWeight: 700,
                                borderRadius: 2,
                            }}
                        >
                            {deletingTraining ? "Deleting..." : "Yes, Delete"}
                        </Button>
                    </DialogActions>
                </Dialog>

            </Paper>
        </Container>
    );
};
