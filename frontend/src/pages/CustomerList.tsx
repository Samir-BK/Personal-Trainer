import { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
    Alert,
    Box,
    Button,
    Chip,
    Container,
    Paper,
    Stack,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from "@mui/material";

// University customer records are fetched from the university REST API.
import type { Customer } from "../types/trainer";
import { fetchCustomers, createCustomer, updateCustomer, type CustomerRequest } from "../services/trainerService";

// Assignments belong to the authenticated trainer and are stored in Spring Boot.
import {
    assignCustomer,
    getAssignedCustomers,
    removeAssignment,
    type TrainerCustomerAssignment,
} from "../services/trainerCustomerService";

// The university API uses HAL links instead of a normal customer ID field.
// Extract the numeric ID from links such as /api/customers/3.
// An invalid or missing link must never be sent to our backend.
function getUniversityCustomerId(customer: Customer): number | null {
    const href = customer._links?.self?.href;

    if (!href) {
        return null;
    }

    const match = href.match(/\/customers\/(\d+)\/?(?:\?.*)?$/);
    const id = match ? Number(match[1]) : null;

    return id !== null && Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Displays the university directory alongside the logged-in trainer's
// assignment status. Customer information is never copied into PostgreSQL.
export const CustomerList = () => {
    // The university REST API provides the full list of customers.
    const [customers, setCustomers] = useState<Customer[]>([]);

    // Our Spring Boot backend provides only this trainer's assignments.
    // Spring Security identifies the trainer from the authenticated session.
    const [assignments, setAssignments] = useState<TrainerCustomerAssignment[]>([]);

    // Keep initial loading separate from the per-customer action spinner.
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [busyCustomerId, setBusyCustomerId] = useState<number | null>(null);

    // One dismissible alert is used for both success and error feedback.
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">("success");


    // Controls whether the Add Customer dialog is visible.
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    // Tracks which university customer is currently being edited.
    // null means the dialog is creating a new customer.
    // A numeric ID means the dialog is editing an existing customer.
    const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);

    // Prevent duplicate customer creation requests.
    const [savingCustomer, setSavingCustomer] = useState(false);

    // Store the customer's input fields separately from the
    // university customer records displayed in the DataGrid.
    const [customerForm, setCustomerForm] = useState<CustomerRequest>({
        firstname: "",
        lastname: "",
        streetaddress: "",
        postcode: "",
        city: "",
        email: "",
        phone: "",
    });

    // Store errors specific to the Add Customer form.
    const [formError, setFormError] = useState("");


    // Load directory records and private assignments when the page opens.
    useEffect(() => {
        // Ignore late responses after the user navigates away.
        let active = true;

        async function loadDirectory() {
            try {
                // Both sources are needed to display accurate Assign/Remove buttons.
                const [customerData, assignmentData] = await Promise.all([
                    fetchCustomers(),
                    getAssignedCustomers(),
                ]);

                if (active) {
                    setCustomers(customerData);
                    setAssignments(assignmentData);
                    setLoadFailed(false);
                }
            } catch (error) {
                console.error("Error loading customer data:", error);

                if (active) {
                    // Do not allow assignment actions when assignment status
                    // could be incomplete or out of date.
                    setLoadFailed(true);
                    setMessage("Unable to load customers or assignments. Please refresh and try again.");
                    setMessageType("error");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadDirectory();

        return () => {
            active = false;
        };
    }, []);

    // Find an assignment by university ID rather than customer name or email.
    // The returned assignment ID is our PostgreSQL ID, used for deletion.
    function findAssignment(
        universityCustomerId: number
    ): TrainerCustomerAssignment | undefined {
        return assignments.find(
            (assignment) =>
                assignment.universityCustomerId === universityCustomerId
        );
    }

    // Assign a university customer to the currently authenticated trainer.
    async function handleAssign(customer: Customer) {
        const universityCustomerId = getUniversityCustomerId(customer);

        if (universityCustomerId === null) {
            setMessage("This customer has no valid customer ID.");
            setMessageType("error");
            return;
        }

        // Avoid concurrent actions that could produce confusing table state.
        if (busyCustomerId !== null || loadFailed) {
            return;
        }

        setBusyCustomerId(universityCustomerId);
        setMessage("");

        try {
            // The service sends the university ID; the backend obtains the
            // trainer ID from the session, not from user-controlled input.
            const newAssignment = await assignCustomer(universityCustomerId);

            // Update the button immediately without reloading the directory.
            setAssignments((previous) => [...previous, newAssignment]);
            setMessage("Customer assigned successfully.");
            setMessageType("success");
        } catch (error) {
            console.error("Unable to assign customer:", error);

            const backendMessage = axios.isAxiosError(error)
                ? error.response?.data?.error
                : undefined;

            setMessage(
                typeof backendMessage === "string"
                    ? backendMessage
                    : "Unable to assign customer."
            );
            setMessageType("error");
        } finally {
            setBusyCustomerId(null);
        }
    }

    // Remove this trainer's assignment, not the university customer itself.
    async function handleRemove(assignment: TrainerCustomerAssignment) {
        if (busyCustomerId !== null || loadFailed) {
            return;
        }

        setBusyCustomerId(assignment.universityCustomerId);
        setMessage("");

        try {
            // Spring Boot verifies that the assignment belongs to this trainer.
            await removeAssignment(assignment.id);

            // Update the displayed button from Remove back to Assign.
            setAssignments((previous) =>
                previous.filter((item) => item.id !== assignment.id)
            );
            setMessage("Customer assignment removed.");
            setMessageType("success");
        } catch (error) {
            console.error("Unable to remove assignment:", error);

            const backendMessage = axios.isAxiosError(error)
                ? error.response?.data?.error
                : undefined;

            setMessage(
                typeof backendMessage === "string"
                    ? backendMessage
                    : "Unable to remove customer assignment."
            );
            setMessageType("error");
        } finally {
            setBusyCustomerId(null);
        }
    }

    // Update one input field without overwriting the others.
    // The field name must match a property in CustomerRequest.
    function updateCustomerForm(
        field: keyof CustomerRequest,
        value: string
    ) {
        setCustomerForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    // Clear form fields after successful creation or cancellation.
    function resetCustomerForm() {
        setCustomerForm({
            firstname: "",
            lastname: "",
            streetaddress: "",
            postcode: "",
            city: "",
            email: "",
            phone: "",
        });

        setFormError("");
    }

    // Open the Add Customer dialog.
    function openAddCustomerDialog() {
        setEditingCustomerId(null);
        resetCustomerForm();
        setAddDialogOpen(true);
    }

    // Open the existing customer form in EDIT mode.
    //
    // We use the customer's university HAL self-link to identify
    // the record that should be updated.
    //
    // The form is populated with its current values so the trainer
    // only needs to change the fields they want to modify.
    function openEditCustomerDialog(customer: Customer) {
        const customerId = getUniversityCustomerId(customer);

        // Never send an update request without a valid university ID.
        if (customerId === null) {
            setMessage("Cannot edit a customer without a valid ID.");
            setMessageType("error");
            return;
        }

        // Store the customer ID to distinguish editing from creation.
        setEditingCustomerId(customerId);

        // Copy the current university customer details into the form.
        // Empty strings prevent controlled React inputs from receiving
        // undefined or null values.
        setCustomerForm({
            firstname: customer.firstname ?? "",
            lastname: customer.lastname ?? "",
            streetaddress: customer.streetaddress ?? "",
            postcode: customer.postcode ?? "",
            city: customer.city ?? "",
            email: customer.email ?? "",
            phone: customer.phone ?? "",
        });

        // Clear previous validation errors and open the same dialog.
        setFormError("");
        setAddDialogOpen(true);
    }


    // Close the dialog without sending any request.
    function closeAddCustomerDialog() {
        // Do not close while the POST request is running.
        if (savingCustomer) {
            return;
        }

        setAddDialogOpen(false);
        setEditingCustomerId(null);
        resetCustomerForm();
    }

    // Save customer details to the university REST API.
    //
    // CREATE MODE:
    //   editingCustomerId === null
    //   POST /customers
    //
    // EDIT MODE:
    //   editingCustomerId contains a university customer ID
    //   PUT /customers/{id}
    // Submit the new customer to the university REST API.

    // Save customer details to the university REST API.
    //
    // CREATE MODE:
    //   editingCustomerId === null
    //   POST /customers
    //
    // EDIT MODE:
    //   editingCustomerId contains a university customer ID
    //   PUT /customers/{id}
    //
    // Reusing the same function avoids duplicating form validation,
    // loading states, error handling, and directory refreshing.
    async function handleSaveCustomer() {

        // Prevent multiple simultaneous create/update requests.
        if (savingCustomer) {
            return;
        }

        // Remove accidental whitespace before submitting customer data.
        const request: CustomerRequest = {
            firstname: customerForm.firstname.trim(),
            lastname: customerForm.lastname.trim(),
            streetaddress: customerForm.streetaddress.trim(),
            postcode: customerForm.postcode.trim(),
            city: customerForm.city.trim(),
            email: customerForm.email.trim(),
            phone: customerForm.phone.trim(),
        };

        // Validate the required customer fields.
        // University API validation remains the final authority.
        if (
            !request.firstname ||
            !request.lastname ||
            !request.email
        ) {
            setFormError(
                "First name, last name, and email are required."
            );
            return;
        }

        // Validate the email format before sending the request.
        // The previous button-click form did not automatically
        // trigger the browser's native email validation.
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(request.email)) {
            setFormError("Enter a valid email address.");
            return;
        }

        // Disable the Save button and clear previous form errors.
        setSavingCustomer(true);
        setFormError("");

        try {
            if (editingCustomerId !== null) {

                // EDIT: Update the existing university customer.
                // The Spring Boot trainer assignment is not modified.
                await updateCustomer(editingCustomerId, request);

            } else {

                // CREATE: Add a new record to the university directory.
                // It is not automatically assigned to the current trainer.
                await createCustomer(request);
            }

            // Fetch fresh customer data from the university API.
            // This ensures the DataGrid displays the saved details.
            const updatedCustomers = await fetchCustomers();
            setCustomers(updatedCustomers);

            // Show the appropriate message based on the form mode.
            setMessage(
                editingCustomerId !== null
                    ? "Customer updated successfully."
                    : "Customer created successfully."
            );
            setMessageType("success");

            // Close the dialog and clear the editing state.
            setAddDialogOpen(false);
            setEditingCustomerId(null);
            resetCustomerForm();

        } catch (error) {

            // Log the original error for development troubleshooting.
            console.error("Unable to save customer:", error);

            // Prefer the university API error when it provides one.
            const backendError = axios.isAxiosError(error)
                ? error.response?.data?.error
                : undefined;

            // Keep the dialog open so entered values are not lost.
            setFormError(
                typeof backendError === "string"
                    ? backendError
                    : "Unable to save customer. Please try again."
            );

        } finally {

            // Restore the button after success or failure.
            setSavingCustomer(false);
        }
    }


    // Define DataGrid columns. Preserve all university customer fields
    // and add a private trainer-assignment action at the end of each row.
    const columns: GridColDef<Customer>[] = [
        { field: "firstname", headerName: "First Name", minWidth: 130, flex: 1 },
        { field: "lastname", headerName: "Last Name", minWidth: 130, flex: 1 },
        { field: "streetaddress", headerName: "Street Address", minWidth: 170, flex: 1.4 },
        { field: "postcode", headerName: "Post Code", minWidth: 105, flex: 0.8 },
        { field: "city", headerName: "City", minWidth: 120, flex: 1 },
        { field: "email", headerName: "Email", minWidth: 200, flex: 1.5 },
        { field: "phone", headerName: "Phone", minWidth: 130, flex: 1.1 },
        {
            field: "assignment",
            headerName: "My Customers",
            width: 160,
            sortable: false,
            filterable: false,
            // This cell uses assignment data from Spring Boot; it does not
            // modify records held by the university customer API.
            renderCell: (params) => {
                const customer = params.row;
                const universityCustomerId = getUniversityCustomerId(customer);

                if (universityCustomerId === null) {
                    return (
                        <Typography variant="caption" color="text.secondary">
                            ID unavailable
                        </Typography>
                    );
                }

                const assignment = findAssignment(universityCustomerId);
                const isBusy = busyCustomerId === universityCustomerId;
                const disabled = busyCustomerId !== null || loadFailed;

                if (assignment) {
                    return (
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={disabled}
                            onClick={() => void handleRemove(assignment)}
                            sx={{ fontWeight: 700, borderRadius: 2 }}
                        >
                            {isBusy ? "Removing..." : "Remove"}
                        </Button>
                    );
                }

                return (
                    <Button
                        variant="contained"
                        size="small"
                        disabled={disabled}
                        onClick={() => void handleAssign(customer)}
                        sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            fontWeight: 800,
                            borderRadius: 2,
                            boxShadow: "none",
                            "&:hover": {
                                bgcolor: "primary.dark",
                                boxShadow: "none",
                            },
                        }}
                    >
                        {isBusy ? "Assigning..." : "Assign"}
                    </Button>
                );
            },
        },

        {
            // Allow trainers to edit customer records from the university API.
            //
            // This button edits the university customer itself.
            // It does not modify trainer-specific PostgreSQL assignments.
            field: "editCustomer",
            headerName: "Edit Customer",
            width: 150,
            sortable: false,
            filterable: false,

            // Each row provides the original customer data.
            // Clicking Edit opens the shared Add/Edit Customer dialog.
            renderCell: (params) => (
                <Button
                    variant="outlined"
                    size="small"
                    color="secondary"
                    onClick={() => openEditCustomerDialog(params.row)}
                    disabled={
                        savingCustomer ||
                        busyCustomerId !== null ||
                        loading
                    }
                    sx={{
                        fontWeight: 700,
                        borderRadius: 2,
                    }}
                >
                    Edit
                </Button>
            ),
        },

    ];

    return (
        // App.tsx already provides a shared page container. This narrower
        // container controls the directory's content width on large screens.
        <Container maxWidth="xl" disableGutters sx={{ mt: { xs: 1, md: 2 }, mb: 6 }}>
            {/* A small section label and forest-green title match other pages. */}
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
                    Customer Directory
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 680 }}>
                    Browse customers and assign them to your trainer account.
                    Assignments are private to your account.
                </Typography>

                {/* Open the customer creation form.
    The lime-green button matches the application's fitness theme. */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
                    <Button
                        variant="contained"
                        onClick={openAddCustomerDialog}
                        sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            fontWeight: 700,
                            px: 3,
                            "&:hover": {
                                bgcolor: "primary.dark",
                            },
                        }}
                    >
                        + Add Customer
                    </Button>
                </Box>

            </Box>

            {/* Summary badges reflect the data currently loaded on this page. */}
            {!loading && !loadFailed && (
                <Stack direction="row" spacing={1.5} useFlexGap sx={{ mb: 3, flexWrap: "wrap" }}>
                    <Chip
                        label={`${customers.length} customers`}
                        sx={{ bgcolor: "#E8F5E1", color: "#174D43", fontWeight: 700 }}
                    />
                    <Chip
                        label={`${assignments.length} assigned to me`}
                        variant="outlined"
                        sx={{ borderColor: "#9BCF8D", color: "secondary.main", fontWeight: 700 }}
                    />
                </Stack>
            )}

            {/* Display success or failure messages without hiding the table. */}
            {message && (
                <Alert
                    severity={messageType}
                    onClose={() => setMessage("")}
                    sx={{ mb: 3, borderRadius: 2 }}
                >
                    {message}
                </Alert>
            )}

            {/* Render the directory in a white card with subtle green styling.
                DataGrid manages sorting, pagination, and its loading state. */}
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 1, sm: 2 },
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 4,
                    boxShadow: "0 12px 35px rgba(23, 77, 67, 0.06)",
                }}
            >
                <Box sx={{ width: "100%", overflowX: "auto" }}>
                    <Box sx={{ height: 610, minWidth: 850 }}>
                        <DataGrid
                            // HAL self-links identify university records uniquely.
                            rows={loadFailed ? [] : customers}
                            columns={columns}
                            getRowId={(row: Customer) =>
                                row._links?.self?.href || row.email
                            }
                            loading={loading}
                            pageSizeOptions={[10, 25, 50]}
                            initialState={{
                                pagination: {
                                    paginationModel: { pageSize: 10, page: 0 },
                                },
                            }}
                            // Keep column headings visible and readable.
                            sx={{
                                border: "none",
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
                                    display: "flex",
                                    alignItems: "center",
                                },
                            }}
                        />
                    </Box>
                </Box>

                {/* Add Customer dialog.
    A Dialog keeps the trainer on the customer directory while
    creating a new record in the university REST API. */}
                <Dialog
                    open={addDialogOpen}
                    onClose={closeAddCustomerDialog}
                    fullWidth
                    maxWidth="sm"
                    slotProps={{
                        paper: {
                            sx: {
                                borderRadius: 3,
                            },
                        },
                    }}
                >
                    {/* Dialog heading uses the application's forest-green color. */}
                    <DialogTitle
                        sx={{
                            color: "secondary.main",
                            fontWeight: 800,
                        }}
                    >
                        {editingCustomerId === null
                            ? "Enter the customer's details to create a new record."
                            : "Update the customer's information in the university directory."}
                    </DialogTitle>

                    <DialogContent>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 3 }}
                        >
                            Enter the customer's details to create a record
                            in the university customer directory.
                        </Typography>

                        {/* Show validation or university API errors within the dialog. */}
                        {formError && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {formError}
                            </Alert>
                        )}

                        {/* These fields update customerForm in React state.
            No request is sent until Create Customer is clicked. */}
                        <Stack spacing={2}>
                            <TextField
                                label="First Name"
                                fullWidth
                                required
                                value={customerForm.firstname}
                                onChange={(event) =>
                                    updateCustomerForm("firstname", event.target.value)
                                }
                            />

                            <TextField
                                label="Last Name"
                                fullWidth
                                required
                                value={customerForm.lastname}
                                onChange={(event) =>
                                    updateCustomerForm("lastname", event.target.value)
                                }
                            />

                            <TextField
                                label="Street Address"
                                fullWidth
                                value={customerForm.streetaddress}
                                onChange={(event) =>
                                    updateCustomerForm("streetaddress", event.target.value)
                                }
                            />

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                <TextField
                                    label="Postcode"
                                    fullWidth
                                    value={customerForm.postcode}
                                    onChange={(event) =>
                                        updateCustomerForm("postcode", event.target.value)
                                    }
                                />

                                <TextField
                                    label="City"
                                    fullWidth
                                    value={customerForm.city}
                                    onChange={(event) =>
                                        updateCustomerForm("city", event.target.value)
                                    }
                                />
                            </Stack>

                            <TextField
                                label="Email"
                                type="email"
                                fullWidth
                                required
                                value={customerForm.email}
                                onChange={(event) =>
                                    updateCustomerForm("email", event.target.value)
                                }
                            />

                            <TextField
                                label="Phone"
                                fullWidth
                                value={customerForm.phone}
                                onChange={(event) =>
                                    updateCustomerForm("phone", event.target.value)
                                }
                            />
                        </Stack>
                    </DialogContent>

                    {/* Cancel closes the dialog.
        Create Customer submits the form to the university API. */}
                    <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Button
                            color="secondary"
                            onClick={closeAddCustomerDialog}
                            disabled={savingCustomer}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="contained"
                            onClick={() => void handleSaveCustomer()}
                            disabled={savingCustomer}
                            sx={{
                                bgcolor: "primary.main",
                                color: "primary.contrastText",
                                fontWeight: 700,
                                "&:hover": {
                                    bgcolor: "primary.dark",
                                },
                            }}
                        >
                            {savingCustomer
                                ? "Saving..."
                                : editingCustomerId === null
                                    ? "Create Customer"
                                    : "Save Changes"}
                        </Button>
                    </DialogActions>
                </Dialog>

            </Paper>
        </Container>
    );
};
