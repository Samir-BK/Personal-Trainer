
import { useEffect, useState, type FormEvent } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import axios from "axios";

import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Typography,
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

    // Store the goal awaiting deletion. A null value closes the dialog.
    // Deletion is never triggered merely by clicking a goal's Delete button.
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

    // Select a goal to delete; the confirmation dialog opens without an API call.
    function openDeleteDialog(goal: CustomerGoal) {
        setGoalToDelete(goal);
    }

    // Cancel deletion unless an actual DELETE request is still pending.
    function closeDeleteDialog() {
        if (busyGoalId !== null) return;
        setGoalToDelete(null);
    }

    // Delete only after explicit confirmation in the Material UI dialog.
    async function handleDelete() {
        if (goalToDelete === null || busyGoalId !== null) return;

        // Capture the selected goal before starting the asynchronous request.
        const goal = goalToDelete;
        setBusyGoalId(goal.id);
        setMessage("");

        try {
            // Spring Boot independently validates trainer ownership.
            await deleteCustomerGoal(assignmentId, goal.id);

            // Immediately remove the deleted goal from the displayed list.
            setGoals((previous) =>
                previous.filter((item) => item.id !== goal.id)
            );

            // Prevent the editor from referencing a goal that no longer exists.
            if (editingGoalId === goal.id) resetForm();

            setGoalToDelete(null);
            setMessage("Goal deleted successfully.");
            setMessageType("success");
        } catch (error) {
            // Keep the dialog open so the trainer can retry or cancel.
            setMessage(getErrorMessage(error));
            setMessageType("error");
        } finally {
            setBusyGoalId(null);
        }
    }

    return (
        // App.tsx already supplies the outer Container; this limits the
        // goal workspace without introducing a second nested Container.
        <Box sx={{ maxWidth: 1100, mx: "auto", pb: 6 }}>
            {/* A clear header separates page navigation from goal editing. */}
            <Box sx={{ mb: 3 }}>
                <Typography
                    variant="overline"
                    sx={{ color: "secondary.main", fontWeight: 800, letterSpacing: 2 }}
                >
                    CUSTOMER MANAGEMENT
                </Typography>
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{ color: "secondary.main", fontWeight: 800, mb: 1 }}
                >
                    Fitness Goals
                </Typography>
                <Typography color="text.secondary">
                    Set fitness targets and manage each goal's status.
                </Typography>
            </Box>

            {/* Return to the logged-in trainer's assigned customers. */}
            <Button
                component={RouterLink}
                to="/my-customers"
                variant="outlined"
                color="secondary"
                sx={{ mb: 3 }}
            >
                Back to My Customers
            </Button>

            {/* Show success or error messages from the API operations. */}
            {message && (
                <Alert
                    severity={messageType}
                    onClose={() => setMessage("")}
                    sx={{ mb: 3 }}
                >
                    {message}
                </Alert>
            )}

            {/* Do not expose the editor until ownership has been checked. */}
            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress aria-label="Loading fitness goals" />
                </Box>
            ) : loadError ? (
                // An invalid or unauthorized assignment never shows its editor.
                <Alert severity="error" sx={{ mb: 3 }}>
                    {loadError}
                </Alert>
            ) : (
                <>
                    {/* The same form creates a goal or edits a selected one. */}
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
                        <Typography
                            variant="h6"
                            sx={{ color: "secondary.main", fontWeight: 800, mb: 3 }}
                        >
                            {editingGoalId === null
                                ? "Create a New Goal"
                                : "Edit Fitness Goal"}
                        </Typography>

                        {/* Native form semantics enable Enter to submit. */}
                        <Box component="form" onSubmit={handleSubmit}>
                            <Stack spacing={2.5}>
                                {/* Backend limits goal titles to 255 characters. */}
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

                                {/* Optional text gives the trainer more context. */}
                                <TextField
                                    label="Description"
                                    value={form.description}
                                    onChange={(event) =>
                                        updateForm("description", event.target.value)
                                    }
                                    multiline
                                    minRows={3}
                                    fullWidth
                                />

                                {/* Target date and session count are optional.
                                    On desktop they sit side by side. */}
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: {
                                            xs: "1fr",
                                            sm: "repeat(2, minmax(0, 1fr))",
                                        },
                                        gap: 2,
                                    }}
                                >
                                    <TextField
                                        label="Target Date"
                                        type="date"
                                        value={form.targetDate}
                                        onChange={(event) =>
                                            updateForm("targetDate", event.target.value)
                                        }
                                        slotProps={{ inputLabel: { shrink: true } }}
                                        fullWidth
                                    />
                                    <TextField
                                        label="Target Sessions"
                                        type="number"
                                        value={form.targetSessions}
                                        onChange={(event) =>
                                            updateForm("targetSessions", event.target.value)
                                        }
                                        slotProps={{ htmlInput: { min: 1, step: 1 } }}
                                        fullWidth
                                    />
                                </Box>

                                {/* Create / save uses the backend request already
                                    selected in handleSubmit. */}
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={1.5}
                                >
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={saving || busyGoalId !== null}
                                        sx={{ px: 3, py: 1.2, fontWeight: 800 }}
                                    >
                                        {saving
                                            ? "Saving..."
                                            : editingGoalId === null
                                                ? "Create Goal"
                                                : "Save Changes"}
                                    </Button>

                                    {/* Cancel is shown only while editing a goal. */}
                                    {editingGoalId !== null && (
                                        <Button
                                            variant="outlined"
                                            color="secondary"
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

                    {/* Section heading shows the number of saved goals. */}
                    <Typography
                        variant="h6"
                        sx={{ color: "secondary.main", fontWeight: 800, mb: 2 }}
                    >
                        Existing Goals ({goals.length})
                    </Typography>

                    {goals.length === 0 ? (
                        // Friendly empty state without inventing progress data.
                        <Paper
                            elevation={0}
                            sx={{ p: 4, borderRadius: 3, border: "1px dashed", borderColor: "divider" }}
                        >
                            <Typography color="text.secondary">
                                No fitness goals yet. Use the form above to create one.
                            </Typography>
                        </Paper>
                    ) : (
                        <Stack spacing={2}>
                            {goals.map((goal) => (
                                // Each card represents one backend goal record.
                                <Paper
                                    key={goal.id}
                                    elevation={0}
                                    sx={{
                                        p: { xs: 2.5, md: 3 },
                                        borderRadius: 3,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        boxShadow: "0 6px 20px rgba(23, 77, 67, 0.04)",
                                        transition: "box-shadow 0.2s ease",
                                        "&:hover": {
                                            boxShadow: "0 10px 28px rgba(23, 77, 67, 0.10)",
                                        },
                                    }}
                                >
                                    {/* Status is displayed separately from the
                                        dropdown used to change it. */}
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={1.5}
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
                                            {goal.title}
                                        </Typography>
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

                                    <Typography
                                        color="text.secondary"
                                        sx={{ mb: 2, lineHeight: 1.7, overflowWrap: "anywhere" }}
                                    >
                                        {goal.description || "No description provided."}
                                    </Typography>

                                    {/* Display targets, not fabricated percentages;
                                        automatic progress isn't implemented. */}
                                    <Stack direction="row" spacing={4} sx={{ mb: 2, flexWrap: "wrap" }} useFlexGap>
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
                                    </Stack>

                                    <Divider sx={{ my: 2 }} />

                                    {/* Changing this field calls PATCH and leaves
                                        title, date, and description unchanged. */}
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
                                        sx={{ minWidth: 180, mb: 2 }}
                                    >
                                        <MenuItem value="ACTIVE">Active</MenuItem>
                                        <MenuItem value="COMPLETED">Completed</MenuItem>
                                        <MenuItem value="CANCELLED">Cancelled</MenuItem>
                                    </TextField>

                                    {/* Edit populates the form; Delete only opens
                                        a confirmation dialog. */}
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={1.5}
                                    >
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            size="small"
                                            onClick={() => startEditing(goal)}
                                            disabled={saving || busyGoalId !== null}
                                        >
                                            Edit Goal
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            onClick={() => openDeleteDialog(goal)}
                                            disabled={saving || busyGoalId !== null}
                                        >
                                            Delete Goal
                                        </Button>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </>
            )}

            {/* The confirmation dialog replaces the native window.confirm().
                Its action is irreversible, so cancellation is always available. */}
            <Dialog
                open={goalToDelete !== null}
                onClose={closeDeleteDialog}
                fullWidth
                maxWidth="xs"
                slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
            >
                <DialogTitle sx={{ color: "secondary.main", fontWeight: 800 }}>
                    Delete Fitness Goal?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to permanently delete
                        <strong> {goalToDelete?.title}</strong>? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
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
        </Box>
    );
};
