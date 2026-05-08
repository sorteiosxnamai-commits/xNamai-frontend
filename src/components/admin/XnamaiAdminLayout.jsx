import React, { useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { Box, Container, CssBaseline, ThemeProvider, Typography, createTheme } from "@mui/material";
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
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const normalizedPath = location.pathname.replace(/\/+$/, "");
  const isAdminHome = normalizedPath === "/admin";

  const clearAdminSession = () => {
    try {
      const keysToRemove = [
        "adminToken",
        "token",
        "authToken",
        "accessToken",
        "refreshToken",
        "user",
        "adminUser",
        "isAdmin",
        "xnamaiUser",
        "xnamaiAdmin",
        "newstoreUser",
        "newstoreAdmin",
      ];

      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      Object.keys(localStorage).forEach((key) => {
        const lower = key.toLowerCase();

        if (
          lower.includes("token") ||
          lower.includes("auth") ||
          lower.includes("admin") ||
          lower.includes("user") ||
          lower.includes("xnamai") ||
          lower.includes("newstore")
        ) {
          localStorage.removeItem(key);
        }
      });

      Object.keys(sessionStorage).forEach((key) => {
        const lower = key.toLowerCase();

        if (
          lower.includes("token") ||
          lower.includes("auth") ||
          lower.includes("admin") ||
          lower.includes("user") ||
          lower.includes("xnamai") ||
          lower.includes("newstore")
        ) {
          sessionStorage.removeItem(key);
        }
      });

      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0].trim();

        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/admin`;
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Erro ao limpar sessão admin:", error);
    }
  };

  const handleBackToAdmin = () => {
    navigate("/admin");
  };

  const handleSwitchAccount = () => {
    clearAdminSession();

    setTimeout(() => {
      window.location.replace("/");
    }, 80);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="xnamai-admin-page">
        <div className="xnamai-admin-bg" />
        <div className="xnamai-admin-shell">
          <header className="xnamai-admin-topbar">
            <div className="xnamai-admin-topbar-left">
              {!isAdminHome && (
                <button
                  type="button"
                  className="xnamai-admin-back-button"
                  onClick={onBack || handleBackToAdmin}
                  aria-label="Voltar ao painel"
                  title="Voltar ao painel"
                >
                  ←
                </button>
              )}
            </div>

            <Box
              component={RouterLink}
              to="/admin"
              sx={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex" }}
            >
              <BrandLogo size={34} />
            </Box>

            <div className="xnamai-admin-profile-area">
              <div className="xnamai-admin-actions">{actions}</div>

              <button
                type="button"
                className="xnamai-admin-profile-button"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-label="Abrir menu de perfil"
              >
                👤
              </button>

              {profileOpen && (
                <div className="xnamai-admin-profile-menu">
                  <button type="button" onClick={handleSwitchAccount}>
                    Trocar de conta
                  </button>
                </div>
              )}
            </div>
          </header>

          <Container maxWidth={maxWidth} className="xnamai-admin-section">
            {(title || subtitle) && (
              <div className="xnamai-admin-stack" style={{ marginBottom: 20 }}>
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
              </div>
            )}

            {children}
          </Container>
        </div>
      </div>
    </ThemeProvider>
  );
}

