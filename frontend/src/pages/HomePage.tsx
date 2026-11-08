
import { Box, Button, Container, Grid, Paper, Typography } from "@mui/material";
import { Link } from "react-router-dom";

/**
 * Home Dashboard for authenticated trainers.
 * This is the main landing page after login.
 * Each dashboard card links to an existing application feature.
 */
export const HomePage = () => {

    // Main features trainers can access from their dashboard.
    const dashboardLinks = [
        {
            title: "Customer Directory",
            description: "Browse and manage university customers.",
            path: "/customers",
        },
        {
            title: "My Customers",
            description: "Manage assigned customers and their goals.",
            path: "/my-customers",
        },
        {
            title: "Training Sessions",
            description: "View, add, and manage training sessions.",
            path: "/trainings",
        },
        {
            title: "Training Calendar",
            description: "Explore sessions by month, week, or day.",
            path: "/calendar",
        },
        {
            title: "Training Statistics",
            description: "Analyze training minutes by activity.",
            path: "/statistics",
        },
        {
            title: "My Profile",
            description: "View your trainer account information.",
            path: "/profile",
        },
    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 5, mb: 6 }}>

            {/* Welcome section shown after successful login. */}
            <Box sx={{ mb: 4 }}>
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                        color: "secondary.main",
                        fontWeight: 800,
                        mb: 1,
                    }}
                >
                    Welcome to Your Dashboard
                </Typography>

                <Typography color="text.secondary">
                    Manage your customers, training sessions,
                    schedules, and fitness goals in one place.
                </Typography>
            </Box>

            {/* Responsive feature cards.
                They automatically wrap into a single column
                on smaller mobile screens. */}
            <Grid container spacing={3}>
                {dashboardLinks.map((item) => (
                    <Grid key={item.path} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                height: "100%",
                                borderRadius: 3,
                                border: "1px solid",
                                borderColor: "divider",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                gap: 2,
                                transition: "0.2s",
                                "&:hover": {
                                    borderColor: "#9BE564",
                                    transform: "translateY(-3px)",
                                },
                            }}
                        >
                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: "secondary.main",
                                        fontWeight: 700,
                                        mb: 1,
                                    }}
                                >
                                    {item.title}
                                </Typography>

                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {item.description}
                                </Typography>
                            </Box>

                            {/* React Router navigation avoids
                                full-page reloads between features. */}
                            <Button
                                component={Link}
                                to={item.path}
                                variant="contained"
                                sx={{
                                    alignSelf: "flex-start",
                                    bgcolor: "#174D43",
                                    color: "white",
                                    fontWeight: 700,
                                    "&:hover": {
                                        bgcolor: "#246B5D",
                                    },
                                }}
                            >
                                Open
                            </Button>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};
