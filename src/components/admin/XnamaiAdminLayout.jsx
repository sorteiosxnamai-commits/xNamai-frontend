import * as React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Container,
  CssBaseline,
  IconButton,
  Menu,
  MenuItem,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import BrandLogo from "../branding/BrandLogo";
import { useAuth } from "../../authContext";
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
  const { user, logout } = useAuth();
  const handleBack =
    onBack ||
    (() => {
      try {
        navigate("/");
      } catch {
        window.location.href = "/";
      }
    });

  const [profileAnchor, setProfileAnchor] = React.useState(null);
  const profileOpen = Boolean(profileAnchor);

  const openProfile = (e) => setProfileAnchor(e.currentTarget);
  const closeProfile = () => setProfileAnchor(null);

  const clearAdminSession = React.useCallback(() => {
    try {
      [
        "adminToken",
        "adminUser",
        "token",
        "access_token",
        "user",
        "ns_auth_token",
      ].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      sessionStorage.clear();
    } catch {
      // ignore
    }
  }, []);

  const handleLogoutAdmin = React.useCallback(() => {
    closeProfile();
    clearAdminSession();
    logout();
    navigate("/");
  }, [clearAdminSession, logout, navigate]);

  const profileName =
    (user?.name || user?.full_name || user?.display_name || user?.email || "Admin")
      .toString()
      .trim();
  const profileInitial = (profileName?.[0] || "A").toUpperCase();

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
                {actions ? <Box sx={{ display: "flex", alignItems: "center" }}>{actions}</Box> : null}

                <Box
                  component="button"
                  type="button"
                  onClick={openProfile}
                  aria-label="Abrir menu de perfil"
                  style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
                >
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                      borderRadius: 999,
                      pl: 1,
                      pr: 1.5,
                      py: 0.8,
                      minWidth: 0,
                      fontWeight: 900,
                      letterSpacing: ".01em",
                      border: "1px solid rgba(30,102,255,0.18)",
                      bgcolor: "rgba(255,255,255,0.80)",
                      color: "#001f4f",
                      boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
                      backdropFilter: "blur(12px)",
                      transition: "transform 220ms ease, box-shadow 220ms ease, background 220ms ease",
                      "&:hover": {
                        bgcolor: "#fff",
                        boxShadow: "0 16px 34px rgba(15,23,42,0.12)",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #0f5bff, #6ea8ff)",
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 14,
                        fontWeight: 900,
                      }}
                    >
                      {profileInitial}
                    </Box>
                    <Box sx={{ display: { xs: "none", sm: "block" } }}>{profileName}</Box>
                    <ExpandMoreRoundedIcon sx={{ opacity: 0.8 }} />
                  </Box>
                </Box>

                <Menu
                  anchorEl={profileAnchor}
                  open={profileOpen}
                  onClose={closeProfile}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 1,
                        borderRadius: 3,
                        border: "1px solid rgba(15,23,42,0.08)",
                        boxShadow: "0 22px 60px rgba(15, 23, 42, 0.16)",
                        minWidth: 220,
                        overflow: "hidden",
                      },
                    },
                  }}
                >
                  <MenuItem onClick={handleLogoutAdmin} sx={{ fontWeight: 800 }}>
                    <LogoutRoundedIcon fontSize="small" style={{ marginRight: 10 }} />
                    Sair do admin
                  </MenuItem>
                </Menu>
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

