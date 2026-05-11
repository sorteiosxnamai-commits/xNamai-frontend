import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import { useAuth } from "../authContext";

export default function PublicTopbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const isAuthenticated = !!(user?.email || user?.id || token);
  const [menuEl, setMenuEl] = React.useState(null);
  const menuOpen = Boolean(menuEl);

  function handleCloseMenu() {
    setMenuEl(null);
  }

  function goAccount() {
    handleCloseMenu();
    navigate("/conta");
  }

  function goLogin() {
    handleCloseMenu();
    navigate("/login");
  }

  function doLogout() {
    handleCloseMenu();
    logout();
    navigate("/");
  }

  function handleLogoClick() {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    navigate("/");
  }

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        top: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
        bgcolor: "rgba(255, 255, 255, 0.92)",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        backdropFilter: "blur(8px) saturate(140%)",
      }}
    >
      <Toolbar sx={{ minHeight: 55 }}>
        <Container
          maxWidth={false}
          disableGutters
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 1,
            px: { xs: 1, sm: 1.5, md: 1.75 },
          }}
        >
          <Box sx={{ justifySelf: "start" }}>
            <Button
              onClick={() => navigate("/cadastro")}
              variant="text"
              sx={{
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: 1.1,
                color: isAuthenticated ? "rgba(11,27,51,0.86)" : "#1E66FF",
                fontSize: { xs: 12, sm: 12.8, md: 13.2 },
                px: { xs: 0.7, sm: 0.9, md: 1.1 },
                py: 0.7,
                borderRadius: 999,
                border: "1px solid transparent",
                bgcolor: "transparent",
                whiteSpace: "nowrap",
                minWidth: "auto",
                transition: "all 180ms ease",
                "&:hover": {
                  bgcolor: "rgba(30, 102, 255, 0.08)",
                  borderColor: "rgba(30, 102, 255, 0.26)",
                },
                "&:focus-visible": {
                  bgcolor: "rgba(30, 102, 255, 0.08)",
                  borderColor: "rgba(30, 102, 255, 0.26)",
                },
              }}
            >
              {isAuthenticated ? "Minha Conta" : "Criar Conta"}
            </Button>
          </Box>

          <Button
            onClick={handleLogoClick}
            variant="text"
            sx={{
              justifySelf: "center",
              px: 0,
              minWidth: "auto",
              textTransform: "none",
              "&:hover": { bgcolor: "transparent" },
            }}
          >
            <Typography
              component="span"
              sx={{
                color: "#1E66FF",
                fontFamily:
                  '"Space Grotesk", "Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                fontSize: { xs: 18.5, sm: 20, md: 22 },
                fontWeight: 700,
                letterSpacing: { xs: "3.8px", sm: "4.4px", md: "5px" },
                lineHeight: 1,
                textTransform: "uppercase",
                transform: "scaleX(1.15)",
                transformOrigin: "center",
                whiteSpace: "nowrap",
              }}
            >
              XNaMai
            </Typography>
          </Button>

          <Box sx={{ justifySelf: "end" }}>
            <IconButton
              color="inherit"
              sx={{
                color: "rgba(11,27,51,0.92)",
                border: "1px solid transparent",
                bgcolor: "transparent",
                width: 44,
                height: 44,
                transition: "transform 180ms ease, background-color 180ms ease",
                "&:hover": {
                  bgcolor: "rgba(30, 102, 255, 0.08)",
                  transform: "translateY(-1px)",
                },
              }}
              onClick={(event) => setMenuEl(event.currentTarget)}
              aria-label={isAuthenticated ? "Abrir menu do usuário" : "Abrir menu de login"}
            >
              <AccountCircleRoundedIcon sx={{ fontSize: 30 }} />
            </IconButton>
          </Box>

          <Menu
            anchorEl={menuEl}
            open={menuOpen}
            onClose={handleCloseMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            {isAuthenticated ? (
              <>
                <MenuItem onClick={goAccount}>Área do cliente</MenuItem>
                <Divider />
                <MenuItem onClick={doLogout}>Sair</MenuItem>
              </>
            ) : (
              <MenuItem onClick={goLogin}>Entrar</MenuItem>
            )}
          </Menu>
        </Container>
      </Toolbar>
    </AppBar>
  );
}
