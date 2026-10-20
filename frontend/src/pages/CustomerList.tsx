import { useState, useEffect } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Container, Typography, Box } from "@mui/material";
import type { Customer } from "../types/trainer";
import { fetchCustomers } from "../services/trainerService";

export const CustomerList = () => {
    // Store customer list fetched from the API
    const [customers, setCustomers] = useState<Customer[]>([]);
    // Manage loading state for DataGrid spinner overlay
    const [loading, setLoading] = useState<boolean>(true);

    // fetch customer list when components loads
    useEffect(() => {
        fetchCustomers()
        .then((data) => setCustomers(data))
        .catch((err) => console.error("Error loading customers: ", err))
        .finally(() => setLoading(false));
    }, []);

    // Configure DataGrid columns mapping to customer interface properties
    const columns: GridColDef[] = [
        { field: "firstname", headerName: "First Name", flex: 1},
        { field: "lastname", headerName: "Last Name", flex: 1},
        { field: "streetaddress", headerName: "Street Address", flex: 1.5},
        { field: "postcode", headerName: "Post code", flex: 0.8},
        { field: "city", headerName: "City", flex: 1},
        { field: "email", headerName: "Email", flex: 1.5},
        { field: "phone", headerName: "Phone", flex: 1.2},    ]

    return (
        // Contianer wraps the entire page and controls its maximum width.
        <Container maxWidth="lg" sx={{ mt: 4 }}>

            {/* Page heading */}
            <Typography variant = "h4" component = "h1" gutterBottom>
                Customer Directory
            </Typography>

             {/* Box wraps the table and sets its dimensions */}
             <Box sx={{ height: 600, width: '100%' }}>
                {/* DataGrid displays customer records in a table */}
                <DataGrid
                // The customer data displayed as rows in the table
                rows = {customers}

                // Defines the columns and how their values are displayed
                columns = {columns}

                // Gives every row a unique identifier  
                // First, use the customer's HAL self-link URL.
                // If it is unavailable, use the customer's email.  

                getRowId = {(row: Customer) =>
                    row._links?.self?.href || row.email
                }
                // Show a loading indicatior while the data is beign fetched
                loading = {loading}

                pageSizeOptions = {[10, 25, 50]}

                // Sets the initail pagination settings
                initialState = {{
                    pagination: {
                        paginationModel: {
                            pageSize: 10 // Displays 10 rows per page initially
                        }
                    }
                }}

                // Displays vertical borders between cells
                showCellVerticalBorder

                // Displays vertical borders between columns
                showColumnVerticalBorder
                />
             </Box>
        </Container>
    )
}
