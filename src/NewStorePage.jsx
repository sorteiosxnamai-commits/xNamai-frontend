// src/NewStorePage.jsx
// Tamanho aproximado: ~1060 linhas (mantido o conteúdo original + iniciais + fix de número no mobile)

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { SelectionContext } from "./selectionContext";
import PixModal from "./PixModal";
import { createPixPayment, checkPixStatus } from "./services/pix";
import { useAuth } from "./authContext";
import { API_CONFIG } from "./config/api";

import {
   List, ListItem, ListItemText,
  Alert, Accordion, AccordionSummary, AccordionDetails
} from "@mui/material";
import PixIcon from "@mui/icons-material/Pix";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";

import GiftCardSimulator from "./components/GiftCardSimulator.jsx";
import "./styles/xnamai-home.css";

import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Paper,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

// Imagens institucionais (neutras, marca xNaMai)
import imgCardExemplo from "./assets/images/giftcard-illustration.svg";
import imgTabelaUtilizacao from "./assets/images/usage-table-illustration.svg";
import imgAcumulo1 from "./assets/images/accumulo-1.svg";
import imgAcumulo2 from "./assets/images/accumulo-2.svg";

// Tema
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1E66FF" }, // azul premium
    secondary: { main: "#0B5FFF" },
    error: { main: "#D32F2F" },
    warning: { main: "#F2B705" },
    success: { main: "#2E7D32" },
    background: { default: "#F4F8FF", paper: "#FFFFFF" },
    text: { primary: "#0B1B33", secondary: "rgba(11,27,51,0.72)" },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: ["Inter", "system-ui", "Segoe UI", "Roboto", "Arial"].join(","),
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderColor: "rgba(15, 23, 42, 0.10)",
        },
      },
    },
  },
});

// Helpers
const pad2 = (n) => n.toString().padStart(2, "0");

// Mocks
const MOCK_INDISPONIVEIS = [];

// Base do backend
const API_BASE = String(API_CONFIG.baseUrl || "/api").replace(/\/+$/, "");

// ===== Helpers de auth + reserva =====
function sanitizeToken(t) {
  if (!t) return "";
  let s = String(t).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  )
    s = s.slice(1, -1);
  if (/^Bearer\s+/i.test(s)) s = s.replace(/^Bearer\s+/i, "").trim();
  return s.replace(/\s+/g, "");
}
function getAuthToken() {
  try {
    const keys = ["ns_auth_token", "authToken", "token", "jwt", "access_token"];
    for (const k of keys) {
      const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (raw) return sanitizeToken(raw);
    }
    return "";
  } catch {
    return "";
  }
}
async function reserveNumbers(numbers) {
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const r = await fetch(`${API_BASE}/api/reservations`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ numbers }),
  });

  if (r.status === 409) {
    const j = await r.json().catch(() => ({}));
    const c = j?.conflicts || j?.n || [];
    throw new Error(
      `Alguns números ficaram indisponíveis: ${
        Array.isArray(c) ? c.join(", ") : c
      }`
    );
  }
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.error || "Falha ao reservar");
  }
  return r.json(); // { reservationId, drawId, expiresAt, numbers }
}

// Checagem do limite no backend (evita preflight; re-tenta com Authorization se 401)
async function checkUserPurchaseLimit({ addCount = 0, drawId } = {}) {
  const qs = new URLSearchParams();
  qs.set("add", String(addCount));
  if (drawId != null) qs.set("draw_id", String(drawId));

  // 1ª tentativa: sem headers (sem preflight)
  let res = await fetch(`${API_BASE}/api/purchase-limit/check?${qs}`, {
    credentials: "include",
    cache: "no-store",
  });

  // 2ª tentativa (se precisar header Authorization)
  if (res.status === 401) {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    res = await fetch(`${API_BASE}/api/purchase-limit/check?${qs}`, {
      credentials: "include",
      cache: "no-store",
      headers,
    });
  }

  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(`limit_check_${res.status}`);

  const j = await res.json().catch(() => ({}));
  const blocked = !!(
    j?.blocked ??
    j?.limitReached ??
    j?.reached ??
    j?.exceeded
  );
  const current = j?.current ?? j?.cnt ?? j?.count ?? null;
  const max = j?.max ?? j?.limit ?? j?.MAX ?? null;
  return { blocked, current, max };
}

export default function NewStorePage({
  indisponiveis = MOCK_INDISPONIVEIS,
  groupUrl = "https://chat.whatsapp.com/GdosYmyW2Jj1mDXNDTFt6F",
}) {
  const totalGridNumbers = 100;
  const navigate = useNavigate();
  const { selecionados, setSelecionados, limparSelecao } =
    React.useContext(SelectionContext);
  const { user, token, logout } = useAuth();
  const isAuthenticated = !!(user?.email || user?.id || token);

  // Estados vindos do backend
  const [srvIndisponiveis, setSrvIndisponiveis] = React.useState([]);

  // Iniciais dos vendidos (n -> "AB")
  const [soldInitials, setSoldInitials] = React.useState({});

  // Preço dinâmico
  const FALLBACK_PRICE = Number(process.env.REACT_APP_PIX_PRICE) || 55;
  const [unitPrice, setUnitPrice] = React.useState(FALLBACK_PRICE);

  // Config dinâmicas
  const [bannerTitle, setBannerTitle] = React.useState("");
  const [maxSelect, setMaxSelect] = React.useState(5);

  // Draw atual (se o backend expuser)
  const [currentDrawId, setCurrentDrawId] = React.useState(null);

  // Limite acumulado do usuário
  const [limitUsage, setLimitUsage] = React.useState({
    current: null,
    max: null,
  });

  // ===== Carregar preço, textos e (se houver) draw id — sem 404 no console
  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/config`, {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const j = await res.json().catch(() => ({}));

          // preço
          const cents =
            j?.ticket_price_cents ??
            j?.price_cents ??
            j?.current?.price_cents ??
            j?.current_draw?.price_cents;
          const reais =
            cents != null && Number.isFinite(Number(cents))
              ? Number(cents) / 100
              : Number(j?.ticket_price ?? j?.price);
          if (alive && Number.isFinite(reais) && reais > 0) setUnitPrice(reais);

          // draw id (se enviado)
          const did =
            j?.current_draw_id ??
            j?.draw_id ??
            j?.current?.id ??
            j?.current_draw?.id;
          if (alive && did != null) setCurrentDrawId(did);

          // banner dinâmico
          if (alive && typeof j?.banner_title === "string") {
            setBannerTitle(j.banner_title);
          }

          // teto de seleção dinâmico
          const maxSel =
            j?.max_numbers_per_selection ?? j?.max_select ?? j?.selection_limit;
          if (alive && Number.isFinite(Number(maxSel)) && Number(maxSel) > 0) {
            setMaxSelect(Number(maxSel));
          }
        }
      } catch {
        // fallback silencioso
      } finally {
        // também tentamos carregar o uso do limite (add=0)
        try {
          const info = await checkUserPurchaseLimit({
            addCount: 0,
            drawId: currentDrawId,
          });
          if (alive) setLimitUsage({ current: info.current, max: info.max });
        } catch {}
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch imediato quando um novo sorteio for criado/aberto (admin)
  React.useEffect(() => {
    const onDrawChanged = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/config`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const j = await res.json().catch(() => ({}));
        const did =
          j?.current_draw_id ?? j?.draw_id ?? j?.current?.id ?? j?.current_draw?.id;
        if (did != null) setCurrentDrawId(did);
      } catch {}
    };
    window.addEventListener("ns:draw:changed", onDrawChanged);
    return () => window.removeEventListener("ns:draw:changed", onDrawChanged);
  }, []);

  // Polling leve de /api/numbers (sem Content-Type p/ não gerar preflight)
  const reloadSrvNumbers = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/numbers`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const j = await res.json();

      const indis = [];
      const initials = {};

      for (const it of j?.numbers || []) {
        const st = String(it.status || "").toLowerCase();
        const num = Number(it.n);
        if (st === "taken" || st === "sold") {
          indis.push(num);
          const rawInit =
            it.initials ||
            it.owner_initials ||
            it.ownerInitials ||
            it.owner ||
            it.oi;
          if (rawInit) initials[num] = String(rawInit).slice(0, 3).toUpperCase();
        }
      }

      setSrvIndisponiveis(Array.from(new Set(indis)));
      setSoldInitials(initials);
    } catch {
      /* silencioso */
    }
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      await reloadSrvNumbers();
      if (!alive) return;
    })();

    const id = setInterval(() => {
      if (!alive) return;
      reloadSrvNumbers();
    }, 15000);

    const onReload = () => {
      if (!alive) return;
      reloadSrvNumbers();
    };
    window.addEventListener("ns:numbers:reload", onReload);

    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("ns:numbers:reload", onReload);
    };
  }, [reloadSrvNumbers]);

  const indisponiveisAll = React.useMemo(
    () =>
      Array.from(new Set([...(indisponiveis || []), ...srvIndisponiveis])),
    [indisponiveis, srvIndisponiveis]
  );

  // menu avatar
  const [menuEl, setMenuEl] = React.useState(null);
  const menuOpen = Boolean(menuEl);
  const handleOpenMenu = (e) => setMenuEl(e.currentTarget);
  const handleCloseMenu = () => setMenuEl(null);
  const goConta = () => {
    handleCloseMenu();
    navigate("/conta");
  };
  const goLogin = () => {
    handleCloseMenu();
    navigate("/login");
  };
  const doLogout = () => {
    handleCloseMenu();
    logout();
    navigate("/");
  };

  // modal (confirmação)
  const [open, setOpen] = React.useState(false);
  const handleAbrirConfirmacao = () => setOpen(true);
  const handleFechar = () => setOpen(false);

  // PIX modal
  const [pixOpen, setPixOpen] = React.useState(false);
  const [pixLoading, setPixLoading] = React.useState(false);
  const [pixData, setPixData] = React.useState(null);
  const [pixAmount, setPixAmount] = React.useState(0);

  // sucesso PIX
  const [pixApproved, setPixApproved] = React.useState(false);
  const handlePixApproved = React.useCallback(() => {
    setPixApproved(true);
    setPixOpen(false);
    setPixLoading(false);
  }, []);

  // === Modal de limite ===
  const [limitOpen, setLimitOpen] = React.useState(false);
  const [limitInfo, setLimitInfo] = React.useState({
    type: "purchase",
    current: undefined,
    max: undefined,
  });
  const openLimitModal = (info) => {
    setLimitInfo(info || { type: "purchase" });
    setLimitOpen(true);
  };

  // Quantos ainda pode comprar segundo o servidor
  const remainingFromServer =
    (limitUsage.max ?? Infinity) - (limitUsage.current ?? 0);

  const handleIrPagamento = async () => {
    setOpen(false);

    if (!isAuthenticated) {
      navigate("/login", { replace: false, state: { from: "/", wantPay: true } });
      return;
    }

    const addCount = selecionados.length || 1;

    try {
      const { blocked, current, max } = await checkUserPurchaseLimit({
        addCount,
        drawId: currentDrawId,
      });

      const wouldBe = (current ?? 0) + addCount;
      const overByFront = Number.isFinite(max) && wouldBe > max;

      if (blocked || overByFront) {
        openLimitModal({
          type: "purchase",
          current: current ?? limitUsage.current,
          max: max ?? limitUsage.max ?? 5,
        });
        setLimitUsage({ current: current ?? 0, max: max ?? 5 });
        return;
      }
    } catch (e) {
      console.warn("[limit-check] falhou, seguindo fluxo]:", e);
    }

    const amount = selecionados.length * unitPrice;
    setPixAmount(amount);
    setPixOpen(true);
    setPixLoading(true);
    setPixApproved(false);

    try {
      const { reservationId } = await reserveNumbers(selecionados);
      const data = await createPixPayment({
        orderId: String(Date.now()),
        amount,
        numbers: selecionados,
        reservationId,
      });
      setPixData(data);

      setLimitUsage((old) => ({
        current:
          Number.isFinite(old.current) ? (old.current ?? 0) + addCount : old.current,
        max: old.max,
      }));
    } catch (e) {
      alert(e.message || "Falha ao gerar PIX");
      setPixOpen(false);
    } finally {
      setPixLoading(false);
    }
  };

  // Polling de status PIX
  React.useEffect(() => {
    if (!pixOpen || !pixData?.paymentId || pixApproved) return;
    const id = setInterval(async () => {
      try {
        const st = await checkPixStatus(pixData.paymentId);
        if (st?.status === "approved") handlePixApproved();
      } catch {}
    }, 3500);
    return () => clearInterval(id);
  }, [pixOpen, pixData, pixApproved, handlePixApproved]);

  // Seleção com teto (front)
  const isIndisponivel = (n) => indisponiveisAll.includes(n);
  const isSelecionado = (n) => selecionados.includes(n);
  const handleClickNumero = (n) => {
    if (isIndisponivel(n)) return;
    setSelecionados((prev) => {
      const already = prev.includes(n);
      if (already) return prev.filter((x) => x !== n);

      if (prev.length >= maxSelect) {
        openLimitModal({
          type: "selection",
          current: maxSelect,
          max: maxSelect,
        });
        return prev;
      }

      if (Number.isFinite(remainingFromServer) && remainingFromServer <= prev.length) {
        openLimitModal({
          type: "purchase",
          current: limitUsage.current ?? 0,
          max: limitUsage.max ?? 5,
        });
        return prev;
      }

      return [...prev, n];
    });
  };

  const getCellSx = (n) => {
    if (isIndisponivel(n))
      return {
        border: "1px solid rgba(15, 23, 42, 0.14)",
        bgcolor: "rgba(15, 23, 42, 0.30)",
        color: "rgba(255,255,255,0.94)",
        cursor: "not-allowed",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
        opacity: 0.9,
      };

    if (isSelecionado(n))
      return {
        border: "1px solid rgba(30, 102, 255, 0.85)",
        bgcolor: "#1E66FF",
        color: "#FFFFFF",
        boxShadow: "0 10px 20px rgba(30, 102, 255, 0.28)",
      };

    return {
      border: "1px solid rgba(30,102,255,0.24)",
      bgcolor: "#FFFFFF",
      color: "#1E66FF",
      "&:hover": {
        borderColor: "rgba(30, 102, 255, 0.52)",
        boxShadow: "0 10px 16px rgba(30, 102, 255, 0.18)",
        transform: "translateY(-1px)",
      },
      transition: "border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease",
      "&:active": { transform: "scale(0.98)" },
    };
  };

  const continuarDisabled =
    !selecionados.length ||
    (Number.isFinite(remainingFromServer) &&
      selecionados.length > Math.max(0, remainingFromServer));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <div className="xnamai-page">
        <div className="xnamai-page-content">
      {/* Topo */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          top: 0,
          left: 0,
          right: 0,
          zIndex: (t) => t.zIndex.drawer + 1,
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
                fontSize: { xs: 11, sm: 11.8, md: 12.2 },
                px: { xs: 0.45, sm: 0.65, md: 0.8 },
                py: 0.55,
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
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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
                fontFamily: '"Space Grotesk", "Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                fontSize: { xs: 17, sm: 18.5, md: 20 },
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
              onClick={handleOpenMenu}
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
                <MenuItem onClick={goConta}>Área do cliente</MenuItem>
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

      {/* Conteúdo */}
      <Container maxWidth="lg" sx={{ pt: { xs: 10, md: 11 }, pb: { xs: 3.5, md: 5 } }}>
        <Stack spacing={4}>
          <Box id="inicio" />

          <Paper
            variant="outlined"
            className="xnamai-hero"
            sx={{
              p: { xs: 3, sm: 3.4, md: 4.4 },
              borderRadius: 1.5,
              bgcolor: "#FFFFFF",
              borderColor: "rgba(15,23,42,0.08)",
              boxShadow: "0 14px 34px rgba(15, 23, 42, 0.08)",
              backdropFilter: "blur(6px)",
              transition: "transform 180ms ease, box-shadow 180ms ease",
              "&:hover": {
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.10)",
              },
            }}
          >
            <Box className="xnamai-heroDots" />
            <Stack spacing={{ xs: 2, md: 2.4 }} alignItems="flex-start">
              <Stack
                direction="column"
                spacing={{ xs: 2.2, md: 2.8 }}
                alignItems="flex-start"
              >
                <Stack spacing={1.45} sx={{ maxWidth: 860 }}>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      letterSpacing: -0.9,
                      lineHeight: 1.03,
                      color: "#0B1B33",
                      fontSize: { xs: 31, sm: 36, md: 48 },
                    }}
                  >
                    Bem-vindos ao Sorteio da
                    <br />
                    <Box
                      component="span"
                      sx={{
                        color: "#1E66FF",
                        textShadow: "0 0 16px rgba(30, 102, 255, 0.28)",
                      }}
                    >
                      xNaMai
                    </Box>
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 900,
                      color: "#1E66FF",
                      fontSize: { xs: 15, md: 17.5 },
                      lineHeight: 1.35,
                    }}
                  >
                    “Participe, concorra e ainda receba 100% do valor de volta.”
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      color: "rgba(11,27,51,0.78)",
                      maxWidth: 760,
                      fontSize: { xs: 14.2, md: 15.3 },
                      lineHeight: 1.65,
                    }}
                  >
                    A xNaMai apresenta o único sorteio em que você nunca sai perdendo. Ao
                    participar, você garante uma vaga na disputa por{" "}
                    <strong>R$ 5.000 em créditos</strong>, e ainda transforma o valor da sua
                    participação em um Cartão Presente Digital, válido para compras em todo o
                    site.
                  </Typography>

                  <Typography variant="body2" sx={{ color: "rgba(11,27,51,0.60)", fontSize: 12.8, lineHeight: 1.5 }}>
                    Sorteio válido até o preenchimento total da tabela. Baseado no resultado
                    oficial da Loteria Federal (Caixa Econômica Federal).
                  </Typography>
                </Stack>

              </Stack>
            </Stack>
          </Paper>

          {/* === CARTELA === */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2.2, md: 3 },
              borderRadius: 5,
              bgcolor: "#FFFFFF",
              borderColor: "rgba(15,23,42,0.08)",
              boxShadow: "0 18px 44px rgba(15, 23, 42, 0.10)",
            }}
          >
            <Box id="sobre" />
            {/* Título do bloco (com ícone à esquerda, como na referência) */}
            <Stack
              direction="row"
              spacing={1.2}
              alignItems="center"
              justifyContent="center"
              sx={{
                mb: 1.8,
                py: 1.4,
                px: 2,
                borderRadius: 3,
                border: "1px solid rgba(30, 102, 255, 0.20)",
                background:
                  "linear-gradient(90deg, rgba(30,102,255,0.14) 0%, rgba(30,102,255,0.08) 55%, rgba(13,171,255,0.10) 100%)",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 900,
                  letterSpacing: 1,
                  color: "#1E66FF",
                  fontSize: { xs: 20, md: 40 },
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                {bannerTitle || "SORTEIO TISSOT PRX DAMASCUS"}
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
              sx={{ mb: 2.3 }}
            >
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" flexWrap="wrap">
                {/* Legenda com bolinhas (como na referência) */}
                <Stack direction="row" spacing={0.6} alignItems="center" sx={{ px: 1.05, py: 0.46, borderRadius: 999, bgcolor: "rgba(30,102,255,0.12)", border: "1px solid rgba(30,102,255,0.26)" }}>
                  <Typography variant="caption" sx={{ color: "#1E66FF", fontWeight: 900, letterSpacing: 0.3 }}>
                    DISPONÍVEL
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.6} alignItems="center" sx={{ px: 1.05, py: 0.46, borderRadius: 999, border: "1px solid rgba(30,102,255,0.48)", bgcolor: "rgba(30,102,255,0.12)" }}>
                  <Typography variant="caption" sx={{ color: "#1E66FF", fontWeight: 900, letterSpacing: 0.3 }}>
                    RESERVADO
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.6} alignItems="center" sx={{ px: 1.05, py: 0.46, borderRadius: 999, border: "1px solid rgba(15,23,42,0.22)", bgcolor: "rgba(15,23,42,0.10)" }}>
                  <Typography variant="caption" sx={{ color: "rgba(11,27,51,0.80)", fontWeight: 900, letterSpacing: 0.3 }}>
                    INDISPONÍVEL
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ ml: 0.5, color: "rgba(11,27,51,0.72)" }}>
                  {Number.isFinite(limitUsage.max) && Number.isFinite(limitUsage.current)
                    ? `• Você tem ${Math.max(
                        0,
                        (limitUsage.max ?? 0) - (limitUsage.current ?? 0)
                      )} de ${limitUsage.max} possíveis`
                    : " "}
                </Typography>
                {!!selecionados.length && (
                  <Typography variant="body2" sx={{ ml: 1, color: "rgba(11,27,51,0.72)" }}>
                    • {selecionados.length} selecionado(s) (máx. {maxSelect} por seleção)
                  </Typography>
                )}
              </Stack>

              <Stack direction="row" spacing={1.1} alignItems="stretch" sx={{ width: { xs: "100%", md: 360 } }}>
                <Button
                  fullWidth
                  variant="outlined"
                  disabled={!selecionados.length}
                  onClick={limparSelecao}
                  sx={{
                    borderRadius: 1.6,
                    fontWeight: 900,
                    borderColor: "rgba(30,102,255,0.45)",
                    color: "#1E66FF",
                    bgcolor: "#FFFFFF",
                    py: 1.02,
                    textTransform: "uppercase",
                    fontSize: 12,
                    "&:hover": {
                      borderColor: "rgba(30,102,255,0.62)",
                      bgcolor: "rgba(244,248,255,0.98)",
                    },
                  }}
                >
                  Limpar Seleção
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={continuarDisabled}
                  onClick={handleAbrirConfirmacao}
                  sx={{
                    borderRadius: 1.6,
                    fontWeight: 1000,
                    color: "#FFFFFF",
                    bgcolor: "#1E66FF",
                    boxShadow: "0 12px 18px rgba(30, 102, 255, 0.28)",
                    py: 1.02,
                    textTransform: "uppercase",
                    fontSize: 12,
                    "&:hover": {
                      bgcolor: "#2B73FF",
                    },
                  }}
                >
                  Continuar
                </Button>
              </Stack>

              <Box id="produtos" sx={{ width: 0, height: 0 }} />
            </Stack>

            <Box sx={{ minWidth: 0 }}>
                {/* Grid expandida para visual mais denso e moderno */}
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 980,
                    mx: "auto",
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(5, minmax(0, 1fr))",
                        sm: "repeat(8, minmax(0, 1fr))",
                        md: "repeat(10, minmax(0, 1fr))",
                        lg: "repeat(10, minmax(0, 1fr))",
                      },
                      gap: { xs: 0.75, md: 0.85 },
                      boxSizing: "border-box",
                      p: 0,
                      border: "none",
                      background: "transparent",
                      boxShadow: "none",
                    }}
                  >
                    {Array.from({ length: totalGridNumbers }).map((_, idx) => {
                      const sold = isIndisponivel(idx);
                      const initials = soldInitials[idx];
                      return (
                        <Box
                          key={idx}
                          onClick={() => handleClickNumero(idx)}
                          sx={{
                            ...getCellSx(idx),
                            borderRadius: 1.8,
                            userSelect: "none",
                            cursor: sold ? "not-allowed" : "pointer",
                            height: { xs: 38, md: 44 },
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 950,
                            fontVariantNumeric: "tabular-nums",
                            position: "relative",
                          }}
                        >
                          <Stack spacing={0.2} alignItems="center" sx={{ pointerEvents: "none" }}>
                            <Box component="span" sx={{ fontSize: { xs: 13, md: 14.5 }, lineHeight: 1 }}>
                              {pad2(idx)}
                            </Box>
                            {sold && initials && (
                              <Box
                                component="span"
                                sx={{
                                  mt: 0.25,
                                  px: 0.8,
                                  py: 0.15,
                                  borderRadius: 999,
                                  fontSize: 10,
                                  fontWeight: 900,
                                  letterSpacing: 0.6,
                                  bgcolor: "rgba(11,27,51,0.10)",
                                  border: "1px solid rgba(15,23,42,0.12)",
                                  color: "rgba(11,27,51,0.86)",
                                }}
                              >
                                {initials}
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
            </Box>

            {/* >>>>> LINHA INFERIOR (apenas texto adicionado) */}
            <Box sx={{ mt: 2.5, textAlign: "center" }}>
              {(() => {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                const dia = String(d.getDate()).padStart(2, "0");
                return (
                  <Typography variant="subtitle1" sx={{ opacity: 0.95, fontWeight: 800, color: "rgba(11,27,51,0.82)" }}>
                    📅 Utilizaremos o sorteio do dia <strong>{dia}</strong> ou o
                    primeiro sorteio da <strong>Loteria Federal</strong> após a tabela fechada.
                  </Typography>
                );
              })()}
            </Box>
          </Paper>
          {/* === FIM CARTELA === */}

          {/* === BENEFÍCIOS (barra inferior) === */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 5,
              bgcolor: "rgba(255,255,255,0.92)",
              borderColor: "rgba(15, 23, 42, 0.08)",
              boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 1.4, md: 2 }}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ flex: 1 }}>
                <VerifiedUserRoundedIcon sx={{ color: "primary.main" }} />
                <Box>
                  <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                    Ambiente 100% seguro
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(11,27,51,0.62)" }}>
                    Seus dados protegidos
                  </Typography>
                </Box>
              </Stack>

              <Divider
                flexItem
                orientation="vertical"
                sx={{ display: { xs: "none", md: "block" }, borderColor: "rgba(15,23,42,0.10)" }}
              />

              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ flex: 1 }}>
                <ReplayRoundedIcon sx={{ color: "primary.main" }} />
                <Box>
                  <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                    100% do valor de volta
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(11,27,51,0.62)" }}>
                    Em cartão presente digital
                  </Typography>
                </Box>
              </Stack>

              <Divider
                flexItem
                orientation="vertical"
                sx={{ display: { xs: "none", md: "block" }, borderColor: "rgba(15,23,42,0.10)" }}
              />

              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ flex: 1 }}>
                <LockRoundedIcon sx={{ color: "primary.main" }} />
                <Box>
                  <Typography sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                    Transparência total
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(11,27,51,0.62)" }}>
                    Resultado via Loteria Federal
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Paper>

          {/* Demais seções */}
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={1.5}>

              <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
  <Stack spacing={1.2}>
    <Box
              sx={{
                mb: 2,
                p: { xs: 1.25, md: 1.5 },
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.12)",
                background:
                  "linear-gradient(90deg, rgba(103,194,58,0.12), rgba(255,193,7,0.10))",
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 900,
                  textAlign: "center",
                  letterSpacing: 1,
                  background: "linear-gradient(90deg, #67C23A, #FFC107)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 0 12px rgba(103,194,58,0.18)",
                }}
              >
               Como Funciona Seu Cartão Presente Digital
              </Typography>
            </Box>
              <Typography variant="body1">
      Cada participação que você faz se transforma em crédito no seu Cartão Presente Digital, acumulando automaticamente o valor investido.
      A validade do saldo é de 6 meses, sendo renovada a cada nova participação.
    </Typography>
      <Typography variant="body1">
      • Saldo acumulativo em um único cartão
    </Typography>

    <Typography variant="body1">
      • Validade renovada automaticamente
    </Typography>

    <Typography variant="body1">
              • Uso exclusivo no site da xNaMai Sorteios
    </Typography>

    <Typography variant="body1">
      • Código pessoal e intransferível
    </Typography>
    <Typography variant="body1">
      • Crédito perfeito para planejar a compra do seu próximo relógio
    </Typography>
    <Typography variant="body1">
      <strong>Dica:</strong> É a maneira mais inteligente de participar, enquanto concorre, você acumula crédito para usar quando quiser.
    </Typography>
  </Stack>
</Paper>

             
              <Box
                component="img"
                src={imgCardExemplo}
                alt="Cartão presente - exemplo"
                sx={{ width: "100%", maxWidth: 800, mx: "auto", display: "block", borderRadius: 2 }}
              />
             
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={1.2}>
              <Typography variant="h6" fontWeight={800}>
                Informações do sorteio
              </Typography>
              <Typography variant="body1">
                • A vaga só é confirmada após a compensação do pagamento.
              </Typography>
              <Typography variant="body1">
                • O sorteio é realizado assim que todos os números são vendidos.
              </Typography>
              <Typography variant="body1">
                • O ganhador é o participante com o último número sorteado pela Lotomania.
              </Typography>
              <Typography variant="body1">
                • Prazo máximo: 7 dias após abertura da rodada.
              </Typography>
              <Typography variant="body1">
                • Envio do prêmio: frete por conta do vencedor.
              </Typography>
              <Typography variant="body1">
                • O Cartão Presente não é cumulativo com o prêmio nem com outras promoções do site.
              </Typography>
              <Typography variant="body1">
                Transparência total: o resultado pode ser conferido publicamente no site oficial da Caixa Econômica Federal.
              </Typography>
              
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={900}>
                Regras para utilização dos <Box component="span" sx={{ opacity: 0.85 }}>cartões presente</Box>
              </Typography>
              <Stack component="ul" sx={{ pl: 3, m: 0 }} spacing={1}>
                <Typography component="li">Uso exclusivo no site da <strong>xNaMai Sorteios.</strong></Typography>
                <Typography component="li">
                  Não é possível comprar outro cartão-presente com crédito de sorteio.
                </Typography>
                <Typography component="li">Sem conversão em dinheiro.</Typography>
               <Typography component="li">
                  Utilização em uma única compra, na compra de diversos produtos e também é possível usar somente parte do valor acumulado. 
                  <Link
                    href="https://chat.whatsapp.com/GdosYmyW2Jj1mDXNDTFt6F"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {" "}Solicitar no grupo
                  </Link>
                </Typography>
                
                <Typography component="li">Validade: <strong>6 meses</strong>, renovável automaticamente a cada participação..</Typography>
                <Typography component="li">
                  A xNaMai não se responsabiliza por perda, extravio ou validade expirada.
                </Typography>
                <Typography component="li">
                  O cartão não é cumulativo com outros cupons de desconto.
                </Typography>
                
              </Stack>
              <Box
                component="img"
                src={imgTabelaUtilizacao}
                alt="Tabela para utilização do cartão presente"
                sx={{ width: "100%", maxWidth: 900, mx: "auto", display: "block", borderRadius: 2, mt: 1 }}
              />
              <Typography align="center" sx={{ mt: 1.5, fontWeight: 700, letterSpacing: 1 }}>
                Sempre considerar o valor integral do produto na forma de pagamento escolhida (Pix ou crédito).
              </Typography>
             
            </Stack>
          </Paper>

          <GiftCardSimulator
        productName="Relógio Tissot PRX Powermatic 80"
        creditPriceDefault={6799.99}
        pixPriceDefault={5779.99}
        giftBalanceDefault={800}
      />


           <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
  <Stack spacing={2}>
    {/* Exemplo Prático */}
    <Typography variant="h6">⌚ Exemplo Prático</Typography>

    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
      Relógio Tissot PRX Powermatic 80
    </Typography>

    <Divider />

    {/* Crédito */}
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <CreditCardOutlinedIcon fontSize="small" />
        <Chip size="small" label="Compra no crédito" />
      </Stack>
      <List dense disablePadding>
        <ListItem disableGutters>
          <ListItemText primary="Valor no crédito: R$ 6.799,99" />
        </ListItem>
        <ListItem disableGutters>
          <ListItemText primary="→ Pode usar até R$ 800,00 do cartão presente" />
        </ListItem>
        <ListItem disableGutters>
          <ListItemText primary="→ Valor final: R$ 5.999,99 (parcelado em até 12x sem juros)" />
        </ListItem>
      </List>
    </Stack>

    <Divider />

    {/* Pix */}
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <PixIcon fontSize="small" />
        <Chip size="small" color="success" label="À vista (Pix)" />
      </Stack>
      <List dense disablePadding>
        <ListItem disableGutters>
          <ListItemText primary="Valor à vista (Pix): R$ 5.779,99" />
        </ListItem>
        <ListItem disableGutters>
          <ListItemText primary="→ Pode aplicar os mesmos R$ 800,00" />
        </ListItem>
        <ListItem disableGutters>
          <ListItemText primary="→ Valor final: R$ 4.979,99" />
        </ListItem>
      </List>
    </Stack>

    <Alert severity="info" icon={<HelpOutlineOutlinedIcon />}>
      <Typography variant="body2">
        <strong>Importante:</strong> o desconto sempre acompanha a forma de pagamento.
        Compras via Pix devem ter o desconto aplicado <strong>manualmente</strong> pela equipe da loja.
      </Typography>
    </Alert>

    <Divider sx={{ my: 1 }} />

    {/* FAQ */}
    <Typography variant="h6">❓ Perguntas Frequentes (FAQ)</Typography>

    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>1. Como funciona o sorteio?</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2">
          Baseado no resultado oficial da Lotomania. O ganhador é quem possui o último número sorteado.
        </Typography>
      </AccordionDetails>
    </Accordion>

    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>2. Quando o sorteio acontece?</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2">Assim que todos os números são vendidos.</Typography>
      </AccordionDetails>
    </Accordion>

    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>3. O que ganho ao participar?</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2">
          Você concorre ao prêmio e ainda recebe o valor investido de volta em créditos no site.
        </Typography>
      </AccordionDetails>
    </Accordion>

    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>4. Onde posso usar meu cartão presente?</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2">
          Somente no site da xNaMai Sorteios, em qualquer produto disponível no site (respeitando a tabela).
        </Typography>
      </AccordionDetails>
    </Accordion>

    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>5. Posso transferir meu crédito?</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2">
          Não. O cartão é pessoal, intransferível e sem conversão em dinheiro.
        </Typography>
      </AccordionDetails>
    </Accordion>

    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>6. O prêmio inclui o frete?</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2">Não. O custo de envio é por conta do vencedor.</Typography>
      </AccordionDetails>
    </Accordion>

    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>7. Onde acompanho os resultados e novas rodadas?</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2">
          No grupo oficial da xNaMai Sorteios no WhatsApp.
        </Typography>
      </AccordionDetails>
    </Accordion>

    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>8. Posso usar somente uma parte do meu saldo acumulado?</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2">
          Sim, você pode desmembrar o seu cartão presente e usar somente uma parte do seu saldo.
        </Typography>
      </AccordionDetails>
    </Accordion>

    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>9. Posso comprar mais de 1 produto usando meus créditos?</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2">
          Sim, você pode escolher diversos produtos no site para aplicar seu desconto.
          Basta seguir a tabela de utilização dos cartões presente.
        </Typography>
      </AccordionDetails>
    </Accordion>
  </Stack>
</Paper>



          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={1.5}>
              <Typography>
                Dica: A cada participação o valor investido se soma ao 
                valor investido no sorteio anterior e sua validade é automaticamente renovada.

              </Typography>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <Box component="img" src={imgAcumulo1} alt="Exemplo de acúmulo 1" sx={{ width: "100%", maxWidth: 560, borderRadius: 2 }} />
                <Box component="img" src={imgAcumulo2} alt="Exemplo de acúmulo 2" sx={{ width: "100%", maxWidth: 560, borderRadius: 2 }} />
              </Stack>
            </Stack>
          </Paper>

          {/* Convite grupo */}
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, md: 4 },
              textAlign: "center",
              bgcolor: "rgba(103, 194, 58, 0.05)",
              borderColor: "primary.main",
            }}
          >
            <Typography variant="h4" fontWeight={900} sx={{ mb: 1 }}>
              Clique no link abaixo e faça parte do <br /> grupo do sorteio!
            </Typography>
            <Typography sx={{ opacity: 0.85, mb: 2 }}>
              Lá você acompanha novidades, abertura de novas rodadas e avisos importantes.
            </Typography>
            <Button
              component="a"
              href={groupUrl}
              target="_blank"
              rel="noopener"
              size="large"
              variant="contained"
              color="success"
              sx={{ px: 4, py: 1.5, fontWeight: 800, letterSpacing: 0.5 }}
            >
              SIM, EU QUERO PARTICIPAR!
            </Button>
          </Paper>
        </Stack>
      </Container>
        </div>
      </div>

      {/* Modal de confirmação */}
      <Dialog open={open} onClose={handleFechar} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 800, textAlign: "center" }}>
          Confirme sua seleção
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          {selecionados.length ? (
            <>
              <Typography variant="body2" sx={{ opacity: 0.85, mb: 1 }}>
                Você selecionou {selecionados.length} {selecionados.length === 1 ? "número" : "números"}:
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 1, mb: 1 }}>
                {selecionados.slice().sort((a, b) => a - b).map(pad2).join(", ")}
              </Typography>
              <Typography variant="body1" sx={{ mt: 0.5, mb: 1 }}>
                Total: <strong>R$ {(selecionados.length * unitPrice).toFixed(2)}</strong>
              </Typography>
              {Number.isFinite(remainingFromServer) && (
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  Você ainda pode comprar {Math.max(0, remainingFromServer)} número(s) neste sorteio.
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Nenhum número selecionado.
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            gap: 1.2,
            flexWrap: "wrap",
            flexDirection: { xs: "column", sm: "row" },
            "& > *": { flex: 1 },
          }}
        >
          <Button variant="outlined" onClick={handleFechar} sx={{ py: 1.2, fontWeight: 700 }}>
            SELECIONAR MAIS NÚMEROS
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              limparSelecao();
              setOpen(false);
            }}
            disabled={!selecionados.length}
            sx={{ py: 1.2, fontWeight: 700 }}
          >
            LIMPAR SELEÇÃO
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleIrPagamento}
            disabled={continuarDisabled}
            sx={{ py: 1.2, fontWeight: 700 }}
          >
            IR PARA PAGAMENTO
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal PIX (QR) */}
      <PixModal
        open={pixOpen}
        onClose={() => {
          setPixOpen(false);
          setPixApproved(false);
        }}
        loading={pixLoading}
        data={pixData}
        amount={pixAmount}
        onCopy={() => {
          if (pixData) {
            navigator.clipboard.writeText(
              pixData.copy_paste_code || pixData.qr_code || ""
            );
          }
        }}
        onRefresh={async () => {
          if (!pixData?.paymentId) {
            setPixOpen(false);
            return;
          }
          try {
            const st = await checkPixStatus(pixData.paymentId);
            if (st.status === "approved") {
              handlePixApproved();
            } else {
              alert(`Status: ${st.status || "pendente"}`);
            }
          } catch {
            alert("Não foi possível consultar o status agora.");
          }
        }}
      />

      {/* Modal de sucesso do PIX */}
      <Dialog open={pixApproved} onClose={() => setPixApproved(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 900, textAlign: "center" }}>
          Pagamento confirmado! 🎉
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            Seus números foram reservados.
          </Typography>
          <Typography sx={{ opacity: 0.9 }}>
            Boa sorte! Você pode acompanhar tudo na <strong>Área do cliente</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button fullWidth variant="contained" color="success" onClick={() => setPixApproved(false)} sx={{ py: 1.2, fontWeight: 800 }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: limite atingido */}
      <Dialog open={limitOpen} onClose={() => setLimitOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontSize: 20, fontWeight: 900, textAlign: "center" }}>
          {limitInfo?.type === "selection"
            ? `Você pode selecionar no máximo ${maxSelect} números`
            : "Número máximo de compras por usuário atingido"}
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          <Typography sx={{ opacity: 0.9 }}>
            {limitInfo?.type === "selection"
              ? "Para continuar, remova um número antes de adicionar outro."
              : "Você já alcançou o limite de números neste sorteio."}
          </Typography>
          {(Number.isFinite(limitInfo?.current) || Number.isFinite(limitInfo?.max)) && (
            <Typography sx={{ mt: 1, fontWeight: 700 }}>
              ({limitInfo?.current ?? "-"} de {limitInfo?.max ?? "-"})
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button fullWidth variant="contained" onClick={() => setLimitOpen(false)} sx={{ py: 1.1, fontWeight: 800 }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
