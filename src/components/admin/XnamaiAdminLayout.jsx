import * as React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  IconButton,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import BrandLogo from "../branding/BrandLogo";
import "../../styles/xnamai-admin.css";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1E66FF" },
    background: { default: "#F4F8FF", paper: "#FFFFFF" },
    text: { primary: "#0B1B33", secondary: "rgba(11,27,51,0.72)" },
  },
  shape: { borderRadius: 16 },
  typography: { fontFamily: ["Inter", "system-ui", "Segoe UI", "Roboto", "Arial"].join(",") },
});

export default function XnamaiAdminLayout({
  title,
  subtitle,
  actions,
  children,
  onBack,
  maxWidth = "lg",
}) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate("/admin"));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="xnamai-admin-page">
        <div className="xnamai-admin-bg" />
        <div className="xnamai-admin-shell">
          <AppBar
            position="sticky"
            elevation={0}
            className="xnamai-admin-header"
            sx={{ bgcolor: "transparent", color: "text.primary" }}
          >
            <Toolbar className="xnamai-admin-toolbar" sx={{ position: "relative" }}>
              <IconButton edge="start" color="inherit" onClick={handleBack} aria-label="Voltar">
                <ArrowBackIosNewRoundedIcon />
              </IconButton>

              <Box
                component={RouterLink}
                to="/admin"
                sx={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
              >
                <BrandLogo size={34} />
              </Box>

              <Box sx={{ ml: "auto" }} className="xnamai-admin-actions">
                {actions}
              </Box>
            </Toolbar>
          </AppBar>

          <Container maxWidth={maxWidth} className="xnamai-admin-section">
            {(title || subtitle) && (
              <Stack spacing={0.75} sx={{ mb: 2.5 }}>
                {title && (
                  <Typography className="xnamai-admin-title" sx={{ fontSize: { xs: 24, md: 36 } }}>
                    {title}
                  </Typography>
                )}
                {subtitle && (
                  <Typography className="xnamai-admin-subtitle">
                    {subtitle}
                  </Typography>
                )}
              </Stack>
            )}

            {children}
          </Container>
        </div>
      </div>
    </ThemeProvider>
  );
}

