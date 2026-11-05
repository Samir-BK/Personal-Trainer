
import { useEffect, useState, type FormEvent } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import axios from "axios";

import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
} from "@mui/material";

import {
    changeCustomerGoalStatus,
    createCustomerGoal,
    deleteCustomerGoal,
    getCustomerGoals,
    updateCustomerGoal,
    type CustomerGoal,
    type CustomerGoalRequest,
    type GoalStatus,
} from "../services/customerGoalService";

// Holds the editable fields in the create/edit form.
// Inputs use strings, so we convert targetSessions before sending it.
type GoalForm = {
    title: string;
    description: string;
    targetDate: string;
    targetSessions: string;
};

// Initial values used for creating a new goal.
const emptyForm: GoalForm = {
    title: "",
    description: "",
    targetDate: "",
    targetSessions: "",
};

// Convert an Axios error into a message that can be shown to the trainer.
function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error;

        if (typeof message === "string") {
            return message;
        }
    }

    return "The request failed. Please try again.";
}

export const CustomerGoals = () => {
    // assignmentId identifies a row in our trainer_customer table.
    // It is NOT the university customer ID.
    const { assignmentId: assignmentIdParam } = useParams();

    const assignmentId = Number(assignmentIdParam);

    // Goals returned from the Spring Boot backend.
    const [goals, setGoals] = useState<CustomerGoal[]>([]);

    // Track initial loading and form submission separately.
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // Tracks whether the initial goal request failed.
    // If access is denied or the assignment does not exist,
    // the page must not display the goal editor.
    const [loadError, setLoadError] = useState<string | null>(null);

    // Store the current goal form values.
    const [form, setForm] = useState<GoalForm>(emptyForm);

    // null means create mode; a goal ID means edit mode.
    const [editingGoalId, setEditingGoalId] = useState<number | null>(null);

    // Track which goal currently has an update or delete in progress.
    const [busyGoalId, setBusyGoalId] = useState<number | null>(null);

    // Stores the goal selected for deletion.
    // null means the confirmation dialog is closed.
    // Keeping the selected goal in state allows the dialog to display its title.
    const [goalToDelete, setGoalToDelete] = useState<CustomerGoal | null>(null);

    // Feedback messages shown after actions or errors.
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">(
        "success"
    );

    // Load goals when the trainer opens a customer assignment.
    useEffect(() => {
        let active = true;

        async function loadGoals() {
            // A valid assignment ID must be a positive integer.
            // Reject invalid URL parameters without contacting Spring Boot.
            if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) {
                if (active) {
                    setLoadError("Invalid customer assignment ID.");
                    setLoading(false);
                }
                return;
            }

            // Reset the loading state when navigating to another assignment.
            setLoading(true);
            setLoadError(null);

            try {
                // Spring Boot verifies that the assignment belongs
                // to the authenticated trainer before returning goals.
                const data = await getCustomerGoals(assignmentId);

                if (active) {
                    setGoals(data);
                    setLoadError(null);
                }
            } catch (error) {
                if (active) {
                    // Clear previously loaded goals to avoid displaying
                    // another customer's information after navigation.
                    setGoals([]);

                    if (
                        axios.isAxiosError(error) &&
                        (error.response?.status === 403 ||
                            error.response?.status === 404)
                    ) {
                        setLoadError(
                            "This customer assignment does not exist or you do not have access."
                        );
                    } else {
                        setLoadError(getErrorMessage(error));
                    }
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadGoals();

        // Ignore responses after the component has unmounted.
        return () => {
            active = false;
        };
    }, [assignmentId]);

    // Update one field of the form while preserving the others.
    function updateForm(field: keyof GoalForm, value: string) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    // Convert form strings into the validated backend request format.
    function buildRequest(): CustomerGoalRequest {
        return {
            title: form.title.trim(),
            description: form.description.trim() || null,
            targetDate: form.targetDate || null,
            targetSessions: form.targetSessions
                ? Number(form.targetSessions)
                : null,
        };
    }

    // Reset the form after saving or cancelling an edit.
    function resetForm() {
        setForm(emptyForm);
        setEditingGoalId(null);
    }

    // Populate the form with an existing goal's editable details.
    function startEditing(goal: CustomerGoal) {
        setEditingGoalId(goal.id);

        setForm({
            title: goal.title,
            description: goal.description ?? "",
            targetDate: goal.targetDate ?? "",
            targetSessions: goal.targetSessions?.toString() ?? "",
        });

        setMessage("");
    }

    // Create a goal or update an existing one.
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) {
            return;
        }

        const request = buildRequest();

        // Match the backend's basic title and session-target validation.
        if (!request.title || request.title.length > 255) {
            setMessage("Goal title must contain 1–255 characters.");
            setMessageType("error");
            return;
        }

        if (
            request.targetSessions != null &&
            (!Number.isInteger(request.targetSessions) ||
                request.targetSessions <= 0)
        ) {
            setMessage("Target sessions must be a positive whole number.");
            setMessageType("error");
            return;
        }

        setSaving(true);
        setMessage("");

        try {
            if (editingGoalId !== null) {
                // PUT replaces the editable details of the existing goal.
                const updatedGoal = await updateCustomerGoal(
                    assignmentId,
                    editingGoalId,
                    request
                );

                setGoals((previous) =>
                    previous.map((goal) =>
                        goal.id === updatedGoal.id ? updatedGoal : goal
                    )
                );

                setMessage("Goal updated successfully.");
            } else {
                // POST creates a new ACTIVE goal.
                const newGoal = await createCustomerGoal(
                    assignmentId,
                    request
                );

                setGoals((previous) => [...previous, newGoal]);
                setMessage("Goal created successfully.");
            }

            setMessageType("success");
            resetForm();
        } catch (error) {
            setMessage(getErrorMessage(error));
            setMessageType("error");
        } finally {
            setSaving(false);
        }
    }

    // Update only the goal's status through the PATCH endpoint.
    async function handleStatusChange(
        goal: CustomerGoal,
        status: GoalStatus
    ) {
        setBusyGoalId(goal.id);
        setMessage("");

        try {
            const updatedGoal = await changeCustomerGoalStatus(
                assignmentId,
                goal.id,
                status
            );

            setGoals((previous) =>
                previous.map((item) =>
                    item.id === updatedGoal.id ? updatedGoal : item
                )
            );

            setMessage("Goal status updated.");
            setMessageType("success");
        } catch (error) {
            setMessage(getErrorMessage(error));
            setMessageType("error");
        } finally {
            setBusyGoalId(null);
        }
    }


    // Open the confirmation dialog without immediately deleting anything.
    // The trainer must confirm the action before we contact Spring Boot.
    function openDeleteDialog(goal: CustomerGoal) {
        setGoalToDelete(goal);
    }

    // Close the dialog without deleting the selected goal.
    function closeDeleteDialog() {
        // Prevent closing while the DELETE request is running.
        if (busyGoalId !== null) {
            return;
        }

        setGoalToDelete(null);
    }

    // Permanently delete the selected goal after confirmation.
    async function handleDelete() {
        // Nothing to delete if no goal has been selected.
        if (goalToDelete === null || busyGoalId !== null) {
            return;
        }

        // Store the selected goal locally before the asynchronous request.
        const goal = goalToDelete;

        setBusyGoalId(goal.id);
        setMessage("");

        try {
            // Spring Boot verifies trainer ownership before deleting.
            await deleteCustomerGoal(assignmentId, goal.id);

            // Remove the deleted goal from the displayed list.
            setGoals((previous) =>
                previous.filter((item) => item.id !== goal.id)
            );

            // Clear the edit form if the deleted goal was being edited.
            if (editingGoalId === goal.id) {
                resetForm();
            }

            // Close the dialog and show successful feedback.
            setGoalToDelete(null);
            setMessage("Goal deleted successfully.");
            setMessageType("success");

        } catch (error) {
            // Keep the dialog open if deletion fails.
            setMessage(getErrorMessage(error));
            setMessageType("error");

        } finally {
            setBusyGoalId(null);
        }
    }


    return (

        <Container maxWidth="lg" sx={{ mt: 2, mb: 6 }}>

            {/* Page heading with the green fitness branding.
        Keep the heading separate from the goal creation form
        so trainers can easily identify the current workspace. */}
            <Box sx={{ mb: 4 }}>

                {/* Small section label above the main heading. */}
                <Typography
                    variant="overline"
                    sx={{
                        color: "secondary.main",
                        fontWeight: 800,
                        letterSpacing: 2,
                    }}
                >
                    CUSTOMER MANAGEMENT
                </Typography>

                {/* Main heading uses dark forest green from our shared theme. */}
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                        color: "secondary.main",
                        fontWeight: 800,
                        mb: 1,
                    }}
                >
                    Fitness Goals
                </Typography>

                {/* Explain the purpose of the goal-management page. */}
                <Typography color="text.secondary">
                    Set meaningful fitness targets, update goals,
                    and manage their progress.
                </Typography>
            </Box>


            {/* Return to the list of assigned customers. */}
            <Button
                component={RouterLink}
                to="/my-customers"
                variant="outlined"
                sx={{ mb: 3 }}
            >
                Back to My Customers
            </Button>

            {/* Show feedback from backend requests. */}
            {message && (
                <Alert
                    severity={messageType}
                    onClose={() => setMessage("")}
                    sx={{ mb: 3 }}
                >
                    {message}
                </Alert>
            )}

            {/* Do not display the editor until initial loading is complete. */}
            {loading ? (
                // Display a spinner while checking assignment access.
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : loadError ? (
                // Do not render the editor when loading fails.
                // The trainer can return to their own customer list.
                <Alert severity="error" sx={{ mb: 3 }}>
                    {loadError}
                </Alert>
            ) : (
                <>
                    {/* Form for creating or editing a fitness goal. */}
                    {/* White form card with rounded corners and a subtle green border.
    This matches the Login and Registration page styling. */}
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2.5, md: 4 },
                            mb: 4,
                            borderRadius: 4,
                            border: "1px solid",
                            borderColor: "divider",
                            boxShadow: "0 12px 35px rgba(23, 77, 67, 0.06)",
                        }}
                    >
                        {/* Distinguish editing an existing goal from creating a new one. */}
                        <Typography
                            variant="h6"
                            sx={{
                                color: "secondary.main",
                                fontWeight: 800,
                                mb: 3,
                            }}
                        >
                            {editingGoalId === null
                                ? "Create a New Goal"
                                : "Edit Fitness Goal"}
                        </Typography>

                        <Box component="form" onSubmit={handleSubmit}>
                            <Stack spacing={2}>
                                <TextField
                                    label="Goal Title"
                                    value={form.title}
                                    onChange={(event) =>
                                        updateForm("title", event.target.value)
                                    }
                                    required
                                    slotProps={{ htmlInput: { maxLength: 255 } }}
                                    fullWidth
                                />

                                <TextField
                                    label="Description"
                                    value={form.description}
                                    onChange={(event) =>
                                        updateForm(
                                            "description",
                                            event.target.value
                                        )
                                    }
                                    multiline
                                    minRows={3}
                                    fullWidth
                                />

                                <TextField
                                    label="Target Date"
                                    type="date"
                                    value={form.targetDate}
                                    onChange={(event) =>
                                        updateForm(
                                            "targetDate",
                                            event.target.value
                                        )
                                    }
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    fullWidth
                                />

                                <TextField
                                    label="Target Sessions"
                                    type="number"
                                    value={form.targetSessions}
                                    onChange={(event) =>
                                        updateForm(
                                            "targetSessions",
                                            event.target.value
                                        )
                                    }
                                    slotProps={{ htmlInput: { min: 1, step: 1 } }}
                                    fullWidth
                                />

                                <Stack direction="row" spacing={2}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={saving}
                                        sx={{
                                            bgcolor: "primary.main",
                                            color: "primary.contrastText",
                                            fontWeight: 800,
                                            px: 3,
                                            py: 1.2,
                                            borderRadius: 2,
                                            "&:hover": {
                                                bgcolor: "primary.dark",
                                            },
                                        }}
                                    >
                                        {saving
                                            ? "Saving..."
                                            : editingGoalId === null
                                                ? "Create Goal"
                                                : "Save Changes"}
                                    </Button>

                                    {editingGoalId !== null && (
                                        <Button
                                            variant="outlined"
                                            onClick={resetForm}
                                            disabled={saving}
                                        >
                                            Cancel Edit
                                        </Button>
                                    )}
                                </Stack>
                            </Stack>
                        </Box>
                    </Paper>

                    {/* List goals belonging to this trainer-customer assignment. */}
                    <Typography variant="h6" gutterBottom>
                        Existing Goals ({goals.length})
                    </Typography>

                    {goals.length === 0 ? (
                        <Typography color="text.secondary">
                            No fitness goals have been created yet.
                        </Typography>
                    ) : (
                        <Stack spacing={2}>

                            {goals.map((goal) => (

                                // Each card represents one goal from the Spring Boot backend.
                                // The goal ID is used as the React key.
                                <Paper
                                    key={goal.id}
                                    elevation={0}
                                    sx={{
                                        p: { xs: 2.5, md: 3 },
                                        borderRadius: 3,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        boxShadow: "0 6px 20px rgba(23, 77, 67, 0.04)",

                                        // A subtle visual response when hovering over a goal card.
                                        transition: "box-shadow 0.2s ease",
                                        "&:hover": {
                                            boxShadow: "0 10px 28px rgba(23, 77, 67, 0.10)",
                                        },
                                    }}
                                >

                                    {/* Goal title and current status indicator. */}
                                    <Stack
                                        spacing={2}
                                        sx={{
                                            mb: 2,
                                            flexDirection: { xs: "column", sm: "row" },
                                            justifyContent: "space-between",
                                            alignItems: { xs: "flex-start", sm: "center" },
                                        }}
                                    >
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                color: "secondary.main",
                                                fontWeight: 800,
                                            }}
                                        >
                                            {goal.title}
                                        </Typography>

                                        {/* The Chip displays the current status visually.
                It reflects the backend status and does not change it. */}
                                        <Chip
                                            label={goal.status}
                                            size="small"
                                            sx={{
                                                fontWeight: 800,
                                                bgcolor:
                                                    goal.status === "ACTIVE"
                                                        ? "#E8F5E1"
                                                        : goal.status === "COMPLETED"
                                                            ? "#174D43"
                                                            : "#ECEFF0",
                                                color:
                                                    goal.status === "COMPLETED"
                                                        ? "#FFFFFF"
                                                        : goal.status === "ACTIVE"
                                                            ? "#276749"
                                                            : "#53615A",
                                            }}
                                        />
                                    </Stack>

                                    {/* Show the description or a useful fallback message. */}
                                    <Typography
                                        color="text.secondary"
                                        sx={{
                                            mb: 2,
                                            lineHeight: 1.7,
                                        }}
                                    >
                                        {goal.description || "No description provided."}
                                    </Typography>

                                    {/* Display goal targets without suggesting automatic
            progress calculations that haven't been implemented. */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            gap: 3,
                                            flexWrap: "wrap",
                                            mb: 2,
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Target Date
                                            </Typography>
                                            <Typography sx={{ fontWeight: 700 }}>
                                                {goal.targetDate || "Not set"}
                                            </Typography>
                                        </Box>

                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Target Sessions
                                            </Typography>
                                            <Typography sx={{ fontWeight: 700 }}>
                                                {goal.targetSessions ?? "Not set"}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    {/* Status dropdown calls the PATCH endpoint.
            Changing status does not modify other goal details. */}
                                    <TextField
                                        select
                                        size="small"
                                        label="Goal Status"
                                        value={goal.status}
                                        disabled={saving || busyGoalId !== null}
                                        onChange={(event) =>
                                            void handleStatusChange(
                                                goal,
                                                event.target.value as GoalStatus
                                            )
                                        }
                                        sx={{
                                            minWidth: 180,
                                            mb: 2,
                                            "& .MuiOutlinedInput-root": {
                                                borderRadius: 2,
                                            },
                                        }}
                                    >
                                        <MenuItem value="ACTIVE">Active</MenuItem>
                                        <MenuItem value="COMPLETED">Completed</MenuItem>
                                        <MenuItem value="CANCELLED">Cancelled</MenuItem>
                                    </TextField>

                                    {/* Action buttons remain usable on mobile screens.
            Edit fills the existing form, while Delete opens a dialog. */}
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={1.5}
                                    >
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => startEditing(goal)}
                                            disabled={saving || busyGoalId !== null}
                                            sx={{
                                                borderColor: "secondary.main",
                                                color: "secondary.main",
                                                fontWeight: 700,
                                            }}
                                        >
                                            Edit Goal
                                        </Button>

                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            onClick={() => openDeleteDialog(goal)}
                                            disabled={saving || busyGoalId !== null}
                                            sx={{ fontWeight: 700 }}
                                        >
                                            Delete Goal
                                        </Button>
                                    </Stack>
                                </Paper>
                            ))}

                        </Stack>
                    )}

                    {/* Confirmation dialog for deleting a fitness goal.

    This replaces window.confirm() with a dialog that matches
    the rest of our Material UI application.

    No deletion happens until the trainer clicks Delete Goal. */}
                    <Dialog
                        open={goalToDelete !== null}
                        onClose={closeDeleteDialog}
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
                        {/* Clearly describe the irreversible action. */}
                        <DialogTitle
                            sx={{
                                color: "secondary.main",
                                fontWeight: 800,
                            }}
                        >
                            Delete Fitness Goal?
                        </DialogTitle>

                        <DialogContent>
                            <DialogContentText>
                                Are you sure you want to permanently delete
                                <strong> {goalToDelete?.title}</strong>?
                                This action cannot be undone.
                            </DialogContentText>
                        </DialogContent>

                        {/* Cancel closes the dialog without contacting the backend.
        Confirm sends the authenticated DELETE request. */}
                        <DialogActions sx={{ px: 3, pb: 2 }}>
                            <Button
                                onClick={closeDeleteDialog}
                                disabled={busyGoalId !== null}
                                color="secondary"
                            >
                                Cancel
                            </Button>

                            <Button
                                variant="contained"
                                color="error"
                                disabled={busyGoalId !== null}
                                onClick={() => void handleDelete()}
                            >
                                {busyGoalId !== null ? "Deleting..." : "Delete Goal"}
                            </Button>
                        </DialogActions>
                    </Dialog>

                </>
            )}
        </Container>
    );
};
