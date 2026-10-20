import { useState, useEffect } from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Container, Typography, Box } from "@mui/material";
import dayjs from 'dayjs';
import type { Customer, Training } from "../types/trainer";
import { fetchTrainings, fetchCustomersByURL } from "../services/trainerService";

type TrainingWithCustomer = Training & { customer?: Customer };

export const TrainingList = () => {
    // Store the training records returned by the API.
    const [trainings, setTrainings] = useState<TrainingWithCustomer []>([]);    

    // Track whether the training data is still loading.
    const [loading, setLoading] = useState<boolean>(true);

    // Run this effect when the component first mount
    useEffect(() => {
    const loadTrainings = async () => {
        try {
            const data = await fetchTrainings();

            const rows = await Promise.all(
                data.map(async (training): Promise<TrainingWithCustomer> => {
                    try {
                        const customer = await fetchCustomersByURL(
                            training._links.customer.href
                        );
                        return { ...training, customer };
                    } catch (error) {
                        console.error("Error loading training customer:", error);
                        return training;
                    }
                })
            );

            setTrainings(rows);
        } catch (error) {
            console.error("Error loading trainings:", error);
        } finally {
            setLoading(false);
        }
    };

    void loadTrainings();
}, []); // Empty dependency array: run on initial mount.

    // Define the columns displayed in the training table.
    // GridColDef<Training>[] means an array of column definitions
    // for rows whose data follows the Training interface.

    const columns: GridColDef<TrainingWithCustomer>[] = [
        {
             // The field containing the date value in each training record.
             field: "date",

            // The column heading shown to the user.
            headerName: "Date & Time",
            // Allocate flexible width to this column.
            flex: 1.5,
            // Convert the date into the required display format.
            valueFormatter: (value) => {
                return value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "";
            },
        },
            // Display the duration of traiing session 
            {
                field: "duration",
                headerName: "Duration (min)",
                flex: 1,
                type: "number"
            },
            // Display the activity, such as Running or Cycling.
            {
                field: "activity",
                headerName: "Activity",
                flex: 1.5,
            },
            {
                // Create a column showing the customer's full name
                field: "customer",
                headerName: "Customer",
                flex: 1.5,

                 // Get the displayed value from the nested customer object.
                 valueGetter: (_, row) => {
                    return row.customer
                         ? `${row.customer.firstname} ${row.customer.lastname}`
                     : "N/A";
                 },
            },
    ];
    // Render the page and its training table.
  return (
    // Center the content and limit the maximum page width.
    <Container maxWidth="lg" sx={{ mt: 4 }}>

      {/* Main page heading */}
      <Typography variant="h4" component="h1" gutterBottom>
        Training Sessions
      </Typography>

      {/* Give the table a height of 600px and full available width */}
      <Box sx={{ height: 600, width: '100%' }}>

        {/* Display the training records in a data grid */}
        <DataGrid
          // Supply the training records as table rows.
          rows={trainings}

          // Supply the column definitions.
          columns={columns}

          // Identify each row using a stable, unique training ID.
          // Replace this with the actual ID property from your API.
          getRowId={(row: Training) => row.id || Math.random()}

          // Display the grid's loading indicator while fetching data.
          loading={loading}

          // Allow users to choose the number of rows per page.
          pageSizeOptions={[10, 25, 50]}

          // Initially display 10 training sessions per page.
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}

          // Display vertical borders between individual cells.
          showCellVerticalBorder

          // Display vertical borders between columns.
          showColumnVerticalBorder
        />
      </Box>
    </Container>
  );
}
