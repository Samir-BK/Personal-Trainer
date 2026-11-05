import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

// Material UI provides accessible layout, status messages, and table controls.
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";

// Customer contact details come from the university REST API.
import type { Customer } from "../types/trainer";
import { fetchCustomers } from "../services/trainerService";

// Assignment IDs and ownership come from our Spring Boot backend.
import {
    getAssignedCustomers,
    type TrainerCustomerAssignment,
} from "../services/trainerCustomerService";

// Read the university customer ID from the HAL self-link.
// Example: https://example.com/api/customers/3 -> 3.
// A missing or invalid ID must not be matched to an assignment.
function getUniversityCustomerId(customer: Customer): number | null {
    const href = customer._links?.self?.href;

    if (!href) {
        return null;
    }

    // Accept a trailing slash or query string without depending on the host.
    const match = href.match(/\/customers\/(\d+)\/?(?:\?.*)?$/);
    const id = match ? Number(match[1]) : null;

    return id !== null && Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Each table row joins customer details from the university with the
// trainer's assignment record stored in PostgreSQL.
type AssignedCustomerRow = Customer & {
    assignmentId: number;
    universityCustomerId: number;
    assignedAt: string;
};

export const MyCustomers = () => {
    // Display only customers assigned to the authenticated trainer.
    const [rows, setRows] = useState<AssignedCustomerRow[]>([]);

    // Keep loading and error feedback separate from the data itself.
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Load the trainer's assignments and current university customer details.
    useEffect(() => {
        // Avoid updating state if the trainer navigates away before requests finish.
        let active = true;

        async function loadMyCustomers() {
            try {
                // Spring Security determines the trainer from the session cookie.
                // Never send a trainer ID from client-side state or URL parameters.
                const assignments: TrainerCustomerAssignment[] =
                    await getAssignedCustomers();

                // We store external customer IDs, not copies of personal details.
                const customers = await fetchCustomers();

                // Match by stable university ID rather than name or email.
                const customersById = new Map<number, Customer>();
                customers.forEach((customer) => {
                    const customerId = getUniversityCustomerId(customer);
                    if (customerId !== null) {
                        customersById.set(customerId, customer);
                    }
                });

                // Build rows using only assignments returned for this trainer.
                const assignedRows: AssignedCustomerRow[] = [];
                assignments.forEach((assignment) => {
                    const customer = customersById.get(
                        assignment.universityCustomerId
                    );

                    // The university record may have been removed or become unavailable.
                    // Preserve the existing behavior of omitting unmatched records.
                    if (!customer) {
                        return;
                    }

                    assignedRows.push({
                        ...customer,
                        // This PostgreSQL ID is used for trainer-specific goals.
                        assignmentId: assignment.id,
                        // This ID identifies the customer in the university API.
                        universityCustomerId: assignment.universityCustomerId,
                        assignedAt: assignment.assignedAt,
                    });
                });

                if (active) {
                    setRows(assignedRows);
                    setError("");
                }
            } catch (err) {
                console.error("Unable to load assigned customers:", err);

                if (active) {
                    // Do not leave previously loaded customer details visible after failure.
                    setRows([]);
                    setError(
                        "Unable to load your customers. Check that both APIs are available."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadMyCustomers();

        // Ignore late responses after the page unmounts.
        return () => {
            active = false;
        };
    }, []);

    // The DataGrid displays university contact details and assignment metadata.
    const columns: GridColDef<AssignedCustomerRow>[] = [
        { field: "firstname", headerName: "First Name", flex: 1, minWidth: 125 },
        { field: "lastname", headerName: "Last Name", flex: 1, minWidth: 125 },
        { field: "email", headerName: "Email", flex: 1.6, minWidth: 190 },
        { field: "phone", headerName: "Phone", flex: 1.1, minWidth: 145 },
        { field: "city", headerName: "City", flex: 1, minWidth: 120 },
        {
            field: "assignedAt",
            headerName: "Assigned On",
            flex: 1.1,
            minWidth: 145,
            // Format the backend timestamp in the trainer's local date format.
            valueFormatter: (value: string | null | undefined) =>
                value ? new Date(value).toLocaleDateString() : "—",
        },
        {
            field: "goals",
            headerName: "Fitness Goals",
            width: 165,
            sortable: false,
            filterable: false,
            // Use the PostgreSQL assignment ID, NOT the university customer ID.
            // Spring Boot checks assignment ownership again on the goals endpoint.
            renderCell: (params) => (
                <Button
                    component={RouterLink}
                    to={`/my-customers/${params.row.assignmentId}/goals`}
                    variant="contained"
                    size="small"
                    sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        boxShadow: "none",
                        "&:hover": { bgcolor: "primary.dark", boxShadow: "none" },
                    }}
                >
                    Manage Goals
                </Button>
            ),
        },
    ];

    return (
        // App.tsx already provides the outer responsive Container.
        // Avoid nesting another Container and unnecessarily narrowing the table.
        <Box sx={{ width: "100%", pb: 5 }}>
            {/* Page heading and explanation use the forest-green theme. */}
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{
                    mb: 3,
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                }}
            >
                <Box>
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
                        My Customers
                    </Typography>
                    <Typography color="text.secondary">
                        View your assigned customers and manage their fitness goals.
                    </Typography>
                </Box>

                {/* Allow trainers to return to the full university directory. */}
                <Button
                    component={RouterLink}
                    to="/customers"
                    variant="outlined"
                    color="secondary"
                    sx={{ fontWeight: 700, flexShrink: 0 }}
                >
                    Browse Customer Directory
                </Button>
            </Stack>

            {/* Surface API errors without replacing them with an empty-state message. */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Display a loading indicator while both API requests complete. */}
            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                    <CircularProgress color="secondary" />
                </Box>
            ) : !error && (
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
                    {/* Show a live count, not a hard-coded customer total. */}
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        sx={{
                            mb: 2.5,
                            alignItems: { xs: "flex-start", sm: "center" },
                            justifyContent: "space-between",
                        }}
                    >
                        <Typography variant="h6" sx={{ color: "secondary.main", fontWeight: 800 }}>
                            Assigned Customers
                        </Typography>
                        <Chip
                            label={`${rows.length} ${rows.length === 1 ? "customer" : "customers"}`}
                            sx={{ bgcolor: "#E8F5E1", color: "#174D43", fontWeight: 800 }}
                        />
                    </Stack>

                    {/* A helpful empty state explains how to assign the first customer. */}
                    {rows.length === 0 ? (
                        <Box sx={{ textAlign: "center", py: 7, px: 2 }}>
                            <Typography variant="h6" sx={{ color: "secondary.main", mb: 1 }}>
                                No assigned customers yet
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                Browse the customer directory and assign customers to your account.
                            </Typography>
                            <Button
                                component={RouterLink}
                                to="/customers"
                                variant="contained"
                                sx={{ fontWeight: 700 }}
                            >
                                Browse Customers
                            </Button>
                        </Box>
                    ) : (
                        // A horizontal scroll wrapper keeps every column and the
                        // Manage Goals button available on narrow screens.
                        <Box sx={{ width: "100%", overflowX: "auto" }}>
                            <Box sx={{ minWidth: 950, height: 550 }}>
                                <DataGrid
                                    rows={rows}
                                    columns={columns}
                                    // The assignment ID is unique to this trainer's row.
                                    getRowId={(row) => row.assignmentId}
                                    pageSizeOptions={[10, 25, 50]}
                                    initialState={{
                                        pagination: {
                                            paginationModel: { pageSize: 10, page: 0 },
                                        },
                                    }}
                                    disableRowSelectionOnClick
                                    sx={{
                                        border: 0,
                                        "& .MuiDataGrid-columnHeaders": {
                                            bgcolor: "#E8F5E1",
                                            color: "#174D43",
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
                    )}
                </Paper>
            )}
        </Box>
    );
};
