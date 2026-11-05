
import { useState, useEffect } from "react";
import axios from "axios";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
    Container,
    Typography,
    Box,
    Button,
    Alert,
} from "@mui/material";

import type { Customer } from "../types/trainer";
import { fetchCustomers } from "../services/trainerService";

import {
    assignCustomer,
    getAssignedCustomers,
    removeAssignment,
    type TrainerCustomerAssignment,
} from "../services/trainerCustomerService";

// University customers do not expose an ordinary id property.
// Extract their numeric ID from the HAL self-link.
function getUniversityCustomerId(customer: Customer): number | null {
    const href = customer._links?.self?.href;

    if (!href) {
        return null;
    }

    const match = href.match(/\/customers\/(\d+)\/?(?:\?.*)?$/);

    if (!match) {
        return null;
    }

    return Number(match[1]);
}

export const CustomerList = () => {
    // Customer information comes from the university REST API.
    const [customers, setCustomers] = useState<Customer[]>([]);

    // Trainer-specific assignments come from our Spring Boot backend.
    const [assignments, setAssignments] = useState<
        TrainerCustomerAssignment[]
    >([]);

    const [loading, setLoading] = useState<boolean>(true);

    // Track which customer currently has an assignment operation running.
    const [busyCustomerId, setBusyCustomerId] = useState<number | null>(null);

    // Display success and error messages to the trainer.
    const [message, setMessage] = useState<string>("");
    const [messageType, setMessageType] = useState<"success" | "error">(
        "success"
    );

    useEffect(() => {
        // Load the university directory and our assignments independently.
        // Promise.all waits for both requests before displaying the table.
        Promise.all([
            fetchCustomers(),
            getAssignedCustomers(),
        ])
            .then(([customerData, assignmentData]) => {
                setCustomers(customerData);
                setAssignments(assignmentData);
            })
            .catch((error) => {
                console.error("Error loading customer data:", error);

                setMessage("Unable to load customers or assignments.");
                setMessageType("error");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Find the current trainer's assignment for a university customer.
    function findAssignment(
        universityCustomerId: number
    ): TrainerCustomerAssignment | undefined {
        return assignments.find(
            (assignment) =>
                assignment.universityCustomerId === universityCustomerId
        );
    }

    async function handleAssign(customer: Customer) {
        const universityCustomerId = getUniversityCustomerId(customer);

        if (universityCustomerId === null) {
            setMessage("This customer has no valid university customer ID.");
            setMessageType("error");
            return;
        }

        setBusyCustomerId(universityCustomerId);
        setMessage("");

        try {
            // The backend identifies the trainer using the session cookie.
            const newAssignment = await assignCustomer(
                universityCustomerId
            );

            // Update the DataGrid button without reloading the page.
            setAssignments((previous) => [
                ...previous,
                newAssignment,
            ]);

            setMessage("Customer assigned successfully.");
            setMessageType("success");
        } catch (error) {
            console.error("Unable to assign customer:", error);

            // Display the backend error when available.
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.error
                : undefined;

            setMessage(
                typeof errorMessage === "string"
                    ? errorMessage
                    : "Unable to assign customer."
            );

            setMessageType("error");
        } finally {
            setBusyCustomerId(null);
        }
    }

    async function handleRemove(assignment: TrainerCustomerAssignment) {
        setBusyCustomerId(assignment.universityCustomerId);
        setMessage("");

        try {
            // The backend checks ownership before deleting.
            await removeAssignment(assignment.id);

            // Remove the assignment from local React state.
            setAssignments((previous) =>
                previous.filter((item) => item.id !== assignment.id)
            );

            setMessage("Customer assignment removed.");
            setMessageType("success");
        } catch (error) {
            console.error("Unable to remove assignment:", error);

            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.error
                : undefined;

            setMessage(
                typeof errorMessage === "string"
                    ? errorMessage
                    : "Unable to remove customer assignment."
            );

            setMessageType("error");
        } finally {
            setBusyCustomerId(null);
        }
    }

    // Keep all existing customer columns.
    const columns: GridColDef<Customer>[] = [
        { field: "firstname", headerName: "First Name", flex: 1 },
        { field: "lastname", headerName: "Last Name", flex: 1 },
        {
            field: "streetaddress",
            headerName: "Street Address",
            flex: 1.5,
        },
        { field: "postcode", headerName: "Post code", flex: 0.8 },
        { field: "city", headerName: "City", flex: 1 },
        { field: "email", headerName: "Email", flex: 1.5 },
        { field: "phone", headerName: "Phone", flex: 1.2 },

        // Add a trainer-specific action without modifying university data.
        {
            field: "assignment",
            headerName: "My Customers",
            width: 150,
            sortable: false,
            filterable: false,

            renderCell: (params) => {
                const customer = params.row;

                const universityCustomerId =
                    getUniversityCustomerId(customer);

                // Do not send an invalid ID to the backend.
                if (universityCustomerId === null) {
                    return (
                        <Typography variant="caption">
                            ID unavailable
                        </Typography>
                    );
                }

                const assignment = findAssignment(universityCustomerId);

                const isBusy = busyCustomerId === universityCustomerId;

                if (assignment) {
                    return (
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={isBusy}
                            onClick={() => handleRemove(assignment)}
                        >
                            {isBusy ? "Removing..." : "Remove"}
                        </Button>
                    );
                }

                return (
                    <Button
                        variant="contained"
                        size="small"
                        disabled={isBusy}
                        onClick={() => handleAssign(customer)}
                    >
                        {isBusy ? "Assigning..." : "Assign"}
                    </Button>
                );
            },
        },
    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Customer Directory
            </Typography>

            <Typography variant="body2" sx={{ mb: 2 }}>
                Assign university customers to your trainer account.
                Assignments are private to your account.
            </Typography>

            {message && (
                <Alert
                    severity={messageType}
                    sx={{ mb: 2 }}
                    onClose={() => setMessage("")}
                >
                    {message}
                </Alert>
            )}

            <Box sx={{ height: 600, width: "100%" }}>
                <DataGrid
                    rows={customers}
                    columns={columns}
                    getRowId={(row: Customer) =>
                        row._links?.self?.href || row.email
                    }
                    loading={loading}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{
                        pagination: {
                            paginationModel: {
                                pageSize: 10,
                            },
                        },
                    }}
                    showCellVerticalBorder
                    showColumnVerticalBorder
                />
            </Box>
        </Container>
    );
};
