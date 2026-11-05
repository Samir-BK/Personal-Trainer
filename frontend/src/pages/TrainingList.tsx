import { useEffect, useState } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
    Alert,
    Box,
    Chip,
    Container,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import dayjs from "dayjs";

import type { Customer, Training } from "../types/trainer";
import {
    fetchTrainings,
    fetchCustomersByURL,
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
            </Paper>
        </Container>
    );
};
