
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

    // Store the current goal form values.
    const [form, setForm] = useState<GoalForm>(emptyForm);

    // null means create mode; a goal ID means edit mode.
    const [editingGoalId, setEditingGoalId] = useState<number | null>(null);

    // Track which goal currently has an update or delete in progress.
    const [busyGoalId, setBusyGoalId] = useState<number | null>(null);

    // Feedback messages shown after actions or errors.
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">(
        "success"
    );

    // Load goals when the trainer opens a customer assignment.
    useEffect(() => {
        let active = true;

        async function loadGoals() {
            // Reject invalid URL parameters before calling the backend.
            if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) {
                setMessage("Invalid customer assignment ID.");
                setMessageType("error");
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                // The backend verifies that this assignment belongs
                // to the currently authenticated trainer.
                const data = await getCustomerGoals(assignmentId);

                if (active) {
                    setGoals(data);
                }
            } catch (error) {
                if (active) {
                    setMessage(getErrorMessage(error));
                    setMessageType("error");
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

    // Delete a goal only after the trainer explicitly confirms.
    async function handleDelete(goal: CustomerGoal) {
        const confirmed = window.confirm(
            `Permanently delete the goal "${goal.title}"?`
        );

        if (!confirmed) {
            return;
        }

        setBusyGoalId(goal.id);
        setMessage("");

        try {
            await deleteCustomerGoal(assignmentId, goal.id);

            // Remove the deleted goal from React state immediately.
            setGoals((previous) =>
                previous.filter((item) => item.id !== goal.id)
            );

            // Clear the form if the deleted goal was being edited.
            if (editingGoalId === goal.id) {
                resetForm();
            }

            setMessage("Goal deleted successfully.");
            setMessageType("success");
        } catch (error) {
            setMessage(getErrorMessage(error));
            setMessageType("error");
        } finally {
            setBusyGoalId(null);
        }
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Customer Fitness Goals
            </Typography>

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
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* Form for creating or editing a fitness goal. */}
                    <Paper sx={{ p: 3, mb: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            {editingGoalId === null
                                ? "Create Fitness Goal"
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
                                <Paper key={goal.id} sx={{ p: 3 }}>
                                    <Typography variant="h6">
                                        {goal.title}
                                    </Typography>

                                    <Typography sx={{ my: 1 }}>
                                        {goal.description || "No description"}
                                    </Typography>

                                    <Typography variant="body2">
                                        Target date: {goal.targetDate || "Not set"}
                                    </Typography>

                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        Target sessions:{" "}
                                        {goal.targetSessions ?? "Not set"}
                                    </Typography>

                                    {/* Trainer can change the goal status. */}
                                    <TextField
                                        select
                                        size="small"
                                        label="Status"
                                        value={goal.status}
                                        disabled={busyGoalId === goal.id}
                                        onChange={(event) =>
                                            void handleStatusChange(
                                                goal,
                                                event.target.value as GoalStatus
                                            )
                                        }
                                        sx={{ minWidth: 170, mb: 2 }}
                                    >
                                        <MenuItem value="ACTIVE">
                                            Active
                                        </MenuItem>
                                        <MenuItem value="COMPLETED">
                                            Completed
                                        </MenuItem>
                                        <MenuItem value="CANCELLED">
                                            Cancelled
                                        </MenuItem>
                                    </TextField>

                                    <Stack direction="row" spacing={2}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => startEditing(goal)}
                                            disabled={
                                                saving ||
                                                busyGoalId === goal.id
                                            }
                                        >
                                            Edit
                                        </Button>

                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            onClick={() =>
                                                void handleDelete(goal)
                                            }
                                            disabled={
                                                saving ||
                                                busyGoalId === goal.id
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </>
            )}
        </Container>
    );
};
