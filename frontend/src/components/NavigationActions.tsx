
import { useState, type MouseEvent } from "react";
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogoutButton } from "./LogoutButton";

// Define navigation links in one place so desktop and mobile
// navigation always display the same application pages.
const navigationItems = [
  {label: "Home", path: "/"},
  { label: "Customers", path: "/customers" },
  { label: "My Customers", path: "/my-customers" },
  { label: "Trainings", path: "/trainings" },
  { label: "Calendar", path: "/calendar"},
  {label: "Statistics", path: "/statistics"}
];

export function NavigationActions() {
  // Read the current route to highlight the active navigation item.
  const location = useLocation();
  const navigate = useNavigate();

  // Use Material UI's theme breakpoint for responsive navigation.
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Store the element that anchors the mobile dropdown menu.
  // null means the menu is closed.
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  // Open the mobile navigation menu.
  function handleMenuOpen(event: MouseEvent<HTMLElement>) {
    setMenuAnchor(event.currentTarget);
  }

  // Close the mobile navigation menu.
  function handleMenuClose() {
    setMenuAnchor(null);
  }

  // Navigate to a page and close the mobile menu.
  function handleMobileNavigation(path: string) {
    handleMenuClose();
    navigate(path);
  }

  // Determine whether a navigation item represents the current route.
  // Nested routes like /my-customers/5/goals also highlight My Customers.
  function isActive(path: string): boolean {
    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  }

  // Hide private navigation on the public authentication pages.
  // Actual API security is enforced by Spring Security.
  if (
    location.pathname === "/login" ||
    location.pathname === "/register"
  ) {
    return null;
  }

  return (
    <>
      {isMobile ? (
        <>
          {/* Small screens use a compact dropdown navigation menu. */}
          <IconButton
            color="inherit"
            aria-label="Open navigation menu"
            aria-controls={
              menuAnchor ? "mobile-navigation-menu" : undefined
            }
            aria-haspopup="true"
            onClick={handleMenuOpen}
          >
            <MenuIcon />
          </IconButton>

          <Menu
            id="mobile-navigation-menu"
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
          >
            {navigationItems.map((item) => (
              <MenuItem
                key={item.path}
                selected={isActive(item.path)}
                onClick={() =>
                  handleMobileNavigation(item.path)
                }
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>

          {/* Keep logout accessible even on small screens. */}
          <LogoutButton />
        </>
      ) : (
        // Desktop screens display navigation links horizontally.
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              component={Link}
              to={item.path}
              aria-current={
                isActive(item.path) ? "page" : undefined
              }
              sx={{
                // Keep readable labels without uppercase transformation.
                textTransform: "none",
                fontWeight: isActive(item.path) ? 700 : 500,

                // Lime highlights the active route against the dark navbar.
                color: isActive(item.path)
                  ? "#9BE564"
                  : "#FFFFFF",

                // Use a subtle green background for the selected page.
                backgroundColor: isActive(item.path)
                  ? "rgba(155, 229, 100, 0.14)"
                  : "transparent",

                borderRadius: 2,

                "&:hover": {
                  backgroundColor: "rgba(155, 229, 100, 0.20)",
                },
              }}
            >
              {item.label}
            </Button>
          ))}

          {/* End the current Spring Security session. */}
          <LogoutButton />
        </Box>
      )}
    </>
  );
}
