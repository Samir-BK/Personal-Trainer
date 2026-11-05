
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

// Material UI components for the page layout and customer table.
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";

// Customer information comes from the university REST API.
import type { Customer } from "../types/trainer";
import { fetchCustomers } from "../services/trainerService";

// Customer assignments are stored in our Spring Boot backend.
import {
    getAssignedCustomers,
    type TrainerCustomerAssignment,
} from "../services/trainerCustomerService";

// Extract a university customer's numeric ID from its HAL self-link.
// Example: https://example.com/api/customers/3 -> 3
// Returns null if the link is missing or does not contain a valid ID.
function getUniversityCustomerId(customer: Customer): number | null {
    const href = customer._links?.self?.href;

    if (!href) {
        return null;
    }

    const match = href.match(/\/customers\/(\d+)\/?(?:\?.*)?$/);

    return match ? Number(match[1]) : null;
}

// Each table row combines customer details from the university API
// with trainer-specific assignment information from PostgreSQL.
type AssignedCustomerRow = Customer & {
    assignmentId: number;
    universityCustomerId: number;
    assignedAt: string;
};

export const MyCustomers = () => {

    // Stores the customers assigned to the currently logged-in trainer.
    const [rows, setRows] = useState<AssignedCustomerRow[]>([]);

    // Controls whether the loading spinner is displayed.
    const [loading, setLoading] = useState<boolean>(true);

    // Stores an error message if either API request fails.
    const [error, setError] = useState<string>("");

    // useEffect runs when the page is first mounted.
    // We fetch customer assignments and university customer details.
    useEffect(() => {

        // Prevents updating React state after leaving this page.
        let active = true;

        async function loadMyCustomers() {
            try {
                // Step 1: Fetch the current trainer's assignments.
                // Spring Security identifies the trainer using the session.
                // We never send a trainer ID from the frontend.
                const assignments: TrainerCustomerAssignment[] =
                    await getAssignedCustomers();

                // Step 2: Fetch university customer information.
                // PostgreSQL stores only customer IDs, not their personal data.
                const customers = await fetchCustomers();

                // Step 3: Build a lookup table using university customer IDs.
                // A Map allows us to find a customer quickly by their ID.
                // This is safer than matching customers using names or emails.
                const customersById = new Map<number, Customer>();

                customers.forEach((customer) => {
                    const customerId = getUniversityCustomerId(customer);

                    // Ignore records without a usable university customer ID.
                    if (customerId !== null) {
                        customersById.set(customerId, customer);
                    }
                });

                // Step 4: Match each assignment with its university customer.
                // Only customers assigned to this trainer appear in the table.
                const assignedRows: AssignedCustomerRow[] = [];

                assignments.forEach((assignment) => {
                    const customer = customersById.get(
                        assignment.universityCustomerId
                    );

                    // Skip assignments whose customer details are unavailable.
                    // Later, we can display these separately as missing records.
                    if (!customer) {
                        return;
                    }

                    assignedRows.push({
                        ...customer,

                        // Assignment ID belongs to our PostgreSQL database.
                        assignmentId: assignment.id,

                        // Customer ID belongs to the university REST API.
                        universityCustomerId:
                            assignment.universityCustomerId,

                        // Timestamp comes from the trainer_customer table.
                        assignedAt: assignment.assignedAt,
                    });
                });

                // Only update state if the page is still mounted.
                if (active) {
                    setRows(assignedRows);
                    setError("");
                }

            } catch (err) {
                // Log the original error for debugging.
                console.error("Unable to load assigned customers:", err);

                // Display a user-friendly message instead of crashing.
                if (active) {
                    setError(
                        "Unable to load your customers. Check that both APIs are available."
                    );
                }

            } finally {
                // Stop displaying the spinner when loading finishes.
                if (active) {
                    setLoading(false);
                }
            }
        }

        // Start loading customers when the component mounts.
        void loadMyCustomers();

        // Cleanup executes when the user leaves the page.
        return () => {
            active = false;
        };

    }, []);

    // Define the columns displayed in the Material UI DataGrid.
    const columns: GridColDef<AssignedCustomerRow>[] = [
        {
            field: "firstname",
            headerName: "First Name",
            flex: 1,
        },
        {
            field: "lastname",
            headerName: "Last Name",
            flex: 1,
        },
        {
            field: "email",
            headerName: "Email",
            flex: 1.6,
        },
        {
            field: "phone",
            headerName: "Phone",
            flex: 1.1,
        },
        {
            field: "city",
            headerName: "City",
            flex: 1,
        },
        {
            field: "assignedAt",
            headerName: "Assigned On",
            flex: 1.2,

            // Convert the ISO timestamp into a readable local date.
            // Example: 2026-11-04T19:00:00Z -> local date.
            valueFormatter: (value: string | null | undefined) =>
                value ? new Date(value).toLocaleDateString() : "—",
        },

        {
            field: "goals",
            headerName: "Fitness Goals",
            width: 160,
            sortable: false,
            filterable: false,

            // Each button opens the goals belonging to this specific
            // trainer-customer assignment.
            //
            // Use assignmentId, NOT universityCustomerId.
            // The backend verifies that the logged-in trainer owns it.
            renderCell: (params) => (
                <Button
                    component={RouterLink}
                    to={`/my-customers/${params.row.assignmentId}/goals`}
                    variant="contained"
                    size="small"
                >
                    Manage Goals
                </Button>
            ),
        },

    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>

            {/* Page heading */}
            <Typography variant="h4" component="h1" gutterBottom>
                My Customers
            </Typography>

            {/* Explain the purpose of this page */}
            <Typography variant="body2" sx={{ mb: 3 }}>
                Customers assigned to your trainer account.
                Goals and private training notes will be added here next.
            </Typography>

            {/* Link back to the complete university customer directory */}
            <Box sx={{ mb: 2 }}>
                <Button
                    component={RouterLink}
                    to="/customers"
                    variant="outlined"
                >
                    Browse Customer Directory
                </Button>
            </Box>

            {/* Show an error message if customer loading fails */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Show a spinner while requests are still running */}
            {loading ? (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        p: 4,
                    }}
                >
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* Show the number of matched assigned customers */}
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                        Assigned customers: {rows.length}
                    </Typography>

                    {/* Display assigned customers in a paginated table */}
                    <Box sx={{ height: 550, width: "100%" }}>
                        <DataGrid
                            // Rows contain university details and assignment data.
                            rows={rows}

                            // Column configuration defined above.
                            columns={columns}

                            // Use the PostgreSQL assignment ID as the row key.
                            getRowId={(row) => row.assignmentId}

                            // Allow users to select the page size.
                            pageSizeOptions={[10, 25, 50]}

                            // Display 10 records per page initially.
                            initialState={{
                                pagination: {
                                    paginationModel: {
                                        pageSize: 10,
                                    },
                                },
                            }}

                            // Display borders between rows' cells and columns.
                            showCellVerticalBorder
                            showColumnVerticalBorder
                        />
                    </Box>
                </>
            )}
        </Container>
    );
};
