// src/NewStorePage.jsx
// Tamanho aproximado: ~1060 linhas (mantido o conteúdo original + iniciais + fix de número no mobile)

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { SelectionContext } from "./selectionContext";
import PixModal from "./PixModal";
import { checkPixStatus, generateMainReservationPix } from "./services/pix";
import { isPaidStatus } from "./lib/paymentStatus";
import {
  getNumberCellSx,
  getNumberVisualState,
  getUnavailableInitialsSx,
  isReservedStatus,
  isUnavailableStatus,
} from "./lib/numberGridState";
import {
  fetchPublicConfig,
  resolveCurrentDrawId,
  resolveMaxNumbersPerUser,
} from "./services/draws";
import { fetchPurchaseLimitCheck } from "./services/user";
import { apiJoin, authHeaders } from "./lib/api";
import { useAuth } from "./authContext";
import { API_CONFIG } from "./config/api";

const DEFAULT_LIMIT_USAGE = {
  max_numbers_per_user: 5,
  paid_count: 0,
  reserved_count: 0,
  used_count: 0,
  remaining: 5,
  can_buy: true,
};

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
import PublicTopbar from "./components/PublicTopbar";
import "./styles/xnamai-home.css";

import {
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
  Link,
  Paper,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

// PNG em `public/assets` (CRA — respeita PUBLIC_URL em deploy)
const imgTabelaUtilizacao = `${process.env.PUBLIC_URL ?? ""}/assets/tabela-utilizacao-cartao.png`;
const imgDicaAcumuloUnificada = `${process.env.PUBLIC_URL ?? ""}/assets/dica-acumulo-unificada.png`;
const imgDicaAcumuloUnificada2x = `${process.env.PUBLIC_URL ?? ""}/assets/dica-acumulo-unificada@2x.png`;
const imgDicaAcumuloUnificada3x = `${process.env.PUBLIC_URL ?? ""}/assets/dica-acumulo-unificada@3x.png`;

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

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function pickFirstText(...values) {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return "";
}

// Mocks
const MOCK_INDISPONIVEIS = [];

const XNAMAI_WHATSAPP_GROUP_URL =
  "https://chat.whatsapp.com/GN2cTb75SAyEBabyxVdaxC?mode=gi_t";

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
async function reserveNumbers(numbers, drawId) {
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json" };

  if (token) headers.Authorization = `Bearer ${token}`;

  const body = {
    numbers,
  };

  if (drawId != null && Number.isFinite(Number(drawId))) {
    body.draw_id = Number(drawId);
  }

  const r = await fetch(`${API_BASE}/api/reservations`, {
    method: "POST",
    headers,
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const j = await r.json().catch(() => ({}));

  if (r.status === 409) {
    const c = j?.conflicts || j?.n || [];
    throw new Error(
      `Alguns números ficaram indisponíveis: ${
        Array.isArray(c) ? c.join(", ") : c
      }`
    );
  }

  if (!r.ok) {
    throw new Error(j?.message || j?.error || "Falha ao reservar");
  }

  return j;
}

export default function NewStorePage({
  indisponiveis = MOCK_INDISPONIVEIS,
  groupUrl = XNAMAI_WHATSAPP_GROUP_URL,
}) {
  const totalGridNumbers = 100;
  const navigate = useNavigate();
  const { selecionados, setSelecionados, limparSelecao } =
    React.useContext(SelectionContext);
  const { user, token } = useAuth();
  const isAuthenticated = !!(user?.email || user?.id || token);

  // Estados vindos do backend
  const [srvIndisponiveis, setSrvIndisponiveis] = React.useState([]);
  // Números com reserva ativa no backend (status reserved/pending)
  const [srvReservados, setSrvReservados] = React.useState([]);
  // Números confirmados localmente após PIX aprovado (até o /api/numbers refletir sold).
  const [locallySoldNumbers, setLocallySoldNumbers] = React.useState([]);

  // Iniciais dos vendidos (n -> "AB")
  const [soldInitials, setSoldInitials] = React.useState({});

  // Preço dinâmico
  const FALLBACK_PRICE = Number(process.env.REACT_APP_PIX_PRICE) || 55;
  const [unitPrice, setUnitPrice] = React.useState(FALLBACK_PRICE);

  // Config pública (/api/config) — textos do sorteio vêm daqui (sem fallback antigo hardcoded)
  const [publicConfig, setPublicConfig] = React.useState(null);

  const displayPrizeTitle = React.useMemo(() => {
    const c = publicConfig || {};
    const cur = c?.current || {};
    const dr = c?.current_draw || {};
    return (
      pickFirstText(
        c?.banner_title,
        c?.bannerTitle,
        dr?.banner_title,
        cur?.banner_title,
        c?.draw_title,
        c?.drawTitle,
        dr?.title,
        cur?.title,
        c?.title,
        c?.prize_title,
        c?.prizeTitle,
        dr?.prize_title,
        c?.prize,
        c?.promo_text,
        c?.promotional_text,
        c?.description
      ) || "SORTEIO XNAMAI"
    );
  }, [publicConfig]);

  const displayPrizeDescription = React.useMemo(() => {
    const c = publicConfig || {};
    const cur = c?.current || {};
    const dr = c?.current_draw || {};
    return (
      pickFirstText(
        c?.banner_description,
        c?.bannerDescription,
        dr?.banner_description,
        cur?.banner_description,
        c?.description,
        c?.promo_description,
        c?.promotional_description,
        dr?.description
      ) || "Participe do sorteio xNaMai e acompanhe sua participação pela sua conta."
    );
  }, [publicConfig]);

  const displayPrizeName = React.useMemo(() => {
    const c = publicConfig || {};
    const cur = c?.current || {};
    const dr = c?.current_draw || {};
    return (
      pickFirstText(
        c?.prize,
        c?.prize_name,
        c?.prizeName,
        dr?.prize_name,
        c?.award,
        c?.award_name,
        dr?.prize_title
      ) || displayPrizeTitle
    );
  }, [publicConfig, displayPrizeTitle]);

  const cashbackPercentLabel = React.useMemo(() => {
    const c = publicConfig || {};
    const draw = c?.current_draw || c?.currentDraw || c?.current || {};

    const raw =
      draw?.cashback_percent ??
      draw?.cashbackPercent ??
      c?.cashback_percent ??
      c?.cashbackPercent;

    const value = Number(raw);

    if (!Number.isFinite(value)) {
      return "50%";
    }

    const safeValue = Math.min(100, Math.max(0, Math.round(value)));
    return `${safeValue}%`;
  }, [publicConfig]);

  // Draw atual (se o backend expuser)
  const [currentDrawId, setCurrentDrawId] = React.useState(null);

  const [limitUsage, setLimitUsage] = React.useState(DEFAULT_LIMIT_USAGE);
  const pixGeneratingRef = React.useRef(false);
  const numbersLoadingRef = React.useRef(false);
  const numbersReloadTimerRef = React.useRef(null);

  const loadPurchaseLimit = React.useCallback(
    async (drawId = currentDrawId) => {
      const id = drawId ?? currentDrawId;
      if (!id || !isAuthenticated) return;

      try {
        const res = await fetch(
          apiJoin(`/purchase-limit/check?draw_id=${encodeURIComponent(id)}&add=0`),
          {
            method: "GET",
            credentials: "include",
            headers: authHeaders(),
            cache: "no-store",
          }
        );

        const data = await res.json().catch(() => null);
        const payload = data?.ok !== false && data ? data : null;

        if (payload && res.ok) {
          const max = Number(
            payload.max_numbers_per_user ?? payload.max ?? DEFAULT_LIMIT_USAGE.max_numbers_per_user
          );
          const paid = Number(payload.paid_count || 0);
          const reserved = Number(payload.reserved_count || 0);
          const used = Number(
            payload.used_count ?? payload.current ?? paid + reserved
          );
          const remaining = Number.isFinite(Number(payload.remaining))
            ? Math.max(0, Number(payload.remaining))
            : Math.max(0, max - used);

          setLimitUsage({
            max_numbers_per_user: max > 0 ? max : 5,
            paid_count: paid,
            reserved_count: reserved,
            used_count: used,
            remaining,
            can_buy: payload.can_buy !== false,
          });
          return payload;
        }
      } catch (err) {
        console.warn("[purchase-limit] failed", err);
      }
      return null;
    },
    [currentDrawId, isAuthenticated]
  );

  const configMaxSelectable = React.useMemo(
    () => resolveMaxNumbersPerUser(publicConfig),
    [publicConfig]
  );

  const maxSelectable = Number(
    limitUsage?.max_numbers_per_user ||
      publicConfig?.max_numbers_per_user ||
      configMaxSelectable ||
      5
  );
  const usedCount = Number(limitUsage?.used_count || 0);
  const remainingCount = Math.max(
    0,
    Number(limitUsage?.remaining ?? maxSelectable - usedCount)
  );
  const selectedNow = selecionados.length;
  const remainingAfterSelection = Math.max(0, remainingCount - selectedNow);
  const selectionStatusLabel = `Usados: ${usedCount}/${maxSelectable} • Agora: ${selectedNow} • Restam: ${remainingAfterSelection}`;

  // ===== Carregar preço, textos e (se houver) draw id — sem 404 no console
  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const j = await fetchPublicConfig();
        if (!j || !alive) return;

        setPublicConfig(j);

        const cents =
          j?.ticket_price_cents ??
          j?.price_cents ??
          j?.current?.price_cents ??
          j?.current_draw?.price_cents;
        const reais =
          cents != null && Number.isFinite(Number(cents))
            ? Number(cents) / 100
            : Number(j?.ticket_price ?? j?.price);
        if (Number.isFinite(reais) && reais > 0) setUnitPrice(reais);

        const did = resolveCurrentDrawId(j);
        if (did != null) setCurrentDrawId(did);
      } catch {
        /* fallback silencioso */
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (currentDrawId && isAuthenticated) {
      loadPurchaseLimit(currentDrawId);
    }
  }, [currentDrawId, isAuthenticated, loadPurchaseLimit]);

  // Refetch imediato quando um novo sorteio for criado/aberto (admin)
  React.useEffect(() => {
    const onDrawChanged = async () => {
      try {
        const j = await fetchPublicConfig();
        if (!j) return;
        setPublicConfig(j);
        const did = resolveCurrentDrawId(j);
        if (did != null) setCurrentDrawId(did);
      } catch {}
    };
    window.addEventListener("ns:draw:changed", onDrawChanged);
    return () => window.removeEventListener("ns:draw:changed", onDrawChanged);
  }, []);

  // Polling leve de /api/numbers (sem Content-Type p/ não gerar preflight)
  const reloadSrvNumbers = React.useCallback(async () => {
    if (numbersLoadingRef.current) return;
    numbersLoadingRef.current = true;

    try {
      const qs = new URLSearchParams();

      if (currentDrawId != null && Number.isFinite(Number(currentDrawId))) {
        qs.set("draw_id", String(currentDrawId));
      }

      const numbersUrl = qs.toString()
        ? `${API_BASE}/api/numbers?${qs.toString()}`
        : `${API_BASE}/api/numbers`;

      const res = await fetch(numbersUrl, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const j = await res.json();

      const indis = [];
      const reservs = [];
      const initials = {};

      for (const it of j?.numbers || []) {
        const num = Number(it.n ?? it.number);
        if (!Number.isInteger(num)) continue;

        const st = it.status;
        const paySt = it.payment_status ?? it.paymentStatus;

        if (isUnavailableStatus(st, paySt)) {
          indis.push(num);
          const rawInit =
            it.initials ||
            it.owner_initials ||
            it.ownerInitials ||
            it.owner ||
            it.oi;
          if (rawInit) initials[num] = String(rawInit).slice(0, 3).toUpperCase();
        } else if (isReservedStatus(st, paySt)) {
          reservs.push(num);
        }
      }

      const indisSet = new Set(indis);

      setSrvIndisponiveis(Array.from(indisSet));
      setSrvReservados(
        Array.from(new Set(reservs)).filter((n) => !indisSet.has(n))
      );
      setSoldInitials(initials);
      setLocallySoldNumbers((prev) => prev.filter((n) => !indisSet.has(n)));
    } catch {
      /* silencioso */
    } finally {
      numbersLoadingRef.current = false;
    }
  }, [currentDrawId]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      await reloadSrvNumbers();
      if (!alive) return;
    })();

    const id = setInterval(() => {
      if (!alive) return;
      reloadSrvNumbers();
    }, 30000);

    const scheduleNumbersReload = () => {
      if (!alive) return;
      if (numbersReloadTimerRef.current) {
        clearTimeout(numbersReloadTimerRef.current);
      }
      numbersReloadTimerRef.current = setTimeout(() => {
        numbersReloadTimerRef.current = null;
        reloadSrvNumbers();
      }, 400);
    };

    window.addEventListener("ns:numbers:reload", scheduleNumbersReload);
    window.addEventListener("xnamai:numbers-refresh", scheduleNumbersReload);
    window.addEventListener("xnamai:pix-approved", scheduleNumbersReload);

    return () => {
      alive = false;
      clearInterval(id);
      if (numbersReloadTimerRef.current) {
        clearTimeout(numbersReloadTimerRef.current);
      }
      window.removeEventListener("ns:numbers:reload", scheduleNumbersReload);
      window.removeEventListener("xnamai:numbers-refresh", scheduleNumbersReload);
      window.removeEventListener("xnamai:pix-approved", scheduleNumbersReload);
    };
  }, [reloadSrvNumbers]);

  const indisponiveisAll = React.useMemo(
    () =>
      Array.from(
        new Set([
          ...(indisponiveis || []),
          ...srvIndisponiveis,
          ...locallySoldNumbers,
        ])
      ),
    [indisponiveis, srvIndisponiveis, locallySoldNumbers]
  );

  // Reservados efetivos = reservados do servidor que ainda NÃO foram marcados
  // como vendidos/indisponíveis (evita conflito visual entre estados).
  const reservadosAll = React.useMemo(() => {
    const indisSet = new Set(indisponiveisAll);
    return srvReservados.filter((n) => !indisSet.has(n));
  }, [srvReservados, indisponiveisAll]);

  // modal (confirmação)
  const [open, setOpen] = React.useState(false);
  const handleAbrirConfirmacao = () => setOpen(true);
  const handleFechar = () => setOpen(false);

  // PIX modal
  const [pixOpen, setPixOpen] = React.useState(false);
  const [pixLoading, setPixLoading] = React.useState(false);
  const [pixData, setPixData] = React.useState(null);
  const [pixAmount, setPixAmount] = React.useState(0);
  const [pixError, setPixError] = React.useState("");
  const [pixRefreshMsg, setPixRefreshMsg] = React.useState("");

  // Dados já existentes do usuário logado.
  // Não bloqueia o PIX no frontend.
  const currentUser = user || {};

  // sucesso PIX
  const [pixApproved, setPixApproved] = React.useState(false);
  const handlePixApproved = React.useCallback(async () => {
    try {
      const paidNow = [...selecionados];

      setPixApproved(true);
      setPixOpen(false);
      setPixLoading(false);
      setPixError("");
      setSelecionados([]);

      if (paidNow.length) {
        setLocallySoldNumbers((prev) =>
          Array.from(new Set([...prev, ...paidNow]))
        );
      }

      loadPurchaseLimit(currentDrawId);
      window.dispatchEvent(new Event("xnamai:numbers-refresh"));
    } catch (err) {
      console.warn("[NEWSTORE_PIX_APPROVED_REFRESH_WARN]", err);
    }
  }, [setSelecionados, selecionados, loadPurchaseLimit, currentDrawId]);

  // === Modal de limite ===
  const [limitOpen, setLimitOpen] = React.useState(false);
  const [limitInfo, setLimitInfo] = React.useState({
    type: "purchase",
    current: undefined,
    max: undefined,
    message: "",
  });
  const openLimitModal = (info) => {
    setLimitInfo(info || { type: "purchase" });
    setLimitOpen(true);
  };

  const handleGeneratePix = React.useCallback(async () => {
    if (pixGeneratingRef.current) return;
    pixGeneratingRef.current = true;

    const amount = selecionados.length * unitPrice;

    setPixAmount(amount);
    setPixError("");
    setPixOpen(true);
    setPixLoading(true);
    setPixApproved(false);

    try {
      const reserveResult = await reserveNumbers(selecionados, currentDrawId);
      const reservationId =
        reserveResult?.reservationId ||
        reserveResult?.reservation_id ||
        reserveResult?.id ||
        reserveResult?.reservation_group_id;

      if (!reservationId) {
        throw new Error("Reserva não retornou ID para gerar PIX.");
      }

      const json = await generateMainReservationPix(reservationId);

      setPixData({
        ...json,
        paymentId: json.paymentId || json.payment_id || json.id,
        payment_id: json.payment_id || json.paymentId || json.id,
        reservation_id: json.reservation_id || reservationId,
        qr_code: json.qr_code,
        qr_code_base64: json.qr_code_base64,
        copy_paste_code: json.copy_paste_code,
        ticket_url: json.ticket_url,
        amount_cents: json.amount_cents ?? json.amountCents,
      });

      const cents = Number(json.amount_cents ?? json.amountCents);
      if (Number.isFinite(cents) && cents > 0) {
        setPixAmount(cents / 100);
      }

      loadPurchaseLimit(currentDrawId);
      reloadSrvNumbers();
    } catch (err) {
      console.error("[MAIN_PIX_FRONT_ERROR]", err);
      setPixData(null);

      if (err?.code === "mercado_pago_payment_rejected") {
        setPixError(
          "Pagamento recusado pelo provedor. Tente novamente ou revise os dados do cadastro."
        );
      } else {
        setPixError("Não foi possível gerar o PIX. Tente novamente.");
      }
    } finally {
      pixGeneratingRef.current = false;
      setPixLoading(false);
    }
  }, [selecionados, unitPrice, currentDrawId, loadPurchaseLimit, reloadSrvNumbers]);

  const handleIrPagamento = async () => {
    setOpen(false);

    if (!isAuthenticated) {
      navigate("/login", { replace: false, state: { from: "/", wantPay: true } });
      return;
    }

    const addCount = selecionados.length || 1;

    try {
      const limit = await fetchPurchaseLimitCheck({
        addCount,
        drawId: currentDrawId,
      });
      setLimitUsage({
        max_numbers_per_user: Number(
          limit?.max_numbers_per_user || maxSelectable
        ),
        paid_count: Number(limit?.paid_count || 0),
        reserved_count: Number(limit?.reserved_count || 0),
        used_count: Number(limit?.used_count || 0),
        remaining: Math.max(0, Number(limit?.remaining ?? 0)),
        can_buy: limit?.blocked !== true,
      });

      const wouldBe = Number(limit?.used_count || 0) + addCount;
      const overByFront = wouldBe > maxSelectable;

      if (limit?.blocked || overByFront) {
        openLimitModal({
          type: "purchase",
          current: limit?.used_count ?? usedCount,
          max: maxSelectable,
          message: `Você já possui ${limit?.used_count ?? usedCount} de ${maxSelectable} números neste sorteio. É possível selecionar apenas mais ${Math.max(0, Number(limit?.remaining ?? remainingCount))}.`,
        });
        return;
      }
    } catch (e) {
      console.warn("[limit-check] falhou, seguindo fluxo]:", e);
    }

    await handleGeneratePix();
  };

  // Polling de status PIX
  React.useEffect(() => {
    if (!pixOpen || !pixData?.paymentId || pixApproved) return;
    const id = setInterval(async () => {
      try {
        const st = await checkPixStatus(pixData.paymentId);
        const payStatus = st?.status || st?.payment_status;
        if (isPaidStatus(payStatus)) handlePixApproved();
      } catch {}
    }, 3500);
    return () => clearInterval(id);
  }, [pixOpen, pixData, pixApproved, handlePixApproved]);

  // Seleção com teto (front)
  const unavailableSet = React.useMemo(
    () => new Set(indisponiveisAll),
    [indisponiveisAll]
  );
  const reservedSet = React.useMemo(() => new Set(reservadosAll), [reservadosAll]);

  const isIndisponivel = (n) => unavailableSet.has(n);
  const isReservado = (n) => reservedSet.has(n);
  const isSelecionado = (n) => selecionados.includes(n);

  // Se um número selecionado localmente passou a ser reservado/indisponível
  // no backend, o servidor prevalece: removemos da seleção do usuário.
  React.useEffect(() => {
    if (!selecionados.length) return;
    const bloqueados = new Set([...indisponiveisAll, ...reservadosAll]);
    const filtrados = selecionados.filter((n) => !bloqueados.has(n));
    if (filtrados.length !== selecionados.length) {
      setSelecionados(filtrados);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indisponiveisAll, reservadosAll]);

  const handleClickNumero = (n) => {
    if (isIndisponivel(n) || isReservado(n)) return;
    setSelecionados((prev) => {
      const already = prev.includes(n);
      if (already) return prev.filter((x) => x !== n);

      if (remainingCount <= 0) {
        openLimitModal({
          type: "purchase",
          current: usedCount,
          max: maxSelectable,
          message: `Você já possui ${usedCount} de ${maxSelectable} números neste sorteio. É possível selecionar apenas mais ${remainingCount}.`,
        });
        return prev;
      }

      if (prev.length >= remainingCount) {
        openLimitModal({
          type: "selection",
          current: prev.length,
          max: maxSelectable,
          message: `Você já possui ${usedCount} de ${maxSelectable} números neste sorteio. É possível selecionar apenas mais ${remainingCount}.`,
        });
        return prev;
      }

      return [...prev, n];
    });
  };

  const getCellSx = (n) => {
    const visual = getNumberVisualState({
      number: n,
      unavailableNumbers: unavailableSet,
      reservedNumbers: reservedSet,
    });
    return getNumberCellSx(visual, isSelecionado(n));
  };

  const continuarDisabled =
    !selecionados.length ||
    remainingCount <= 0 ||
    selecionados.length > remainingCount;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <div className="xnamai-page">
        <div className="xnamai-page-content">
      {/* Topo */}
      <PublicTopbar />

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
                    Bem-vindo ao sorteios da{" "}
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
                    {`Participe, concorra e ainda receba ${cashbackPercentLabel} do valor de volta`}
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
                    participar, você garante uma vaga na disputa por um item premium, e ainda
                    transforma o valor da sua participação em um Cartão Presente Digital, válido
                    para compras em todo o site, com exceção dos itens promocionais.
                  </Typography>

                  <Typography variant="body2" sx={{ color: "rgba(11,27,51,0.60)", fontSize: 12.8, lineHeight: 1.5 }}>
                    Sorteio válido até o preenchimento total da tabela. Baseado no resultado
                    oficial da Loteria Federal, modalidade Lotomania.
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
              direction="column"
              spacing={1}
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
                component="h2"
                sx={{
                  fontWeight: 900,
                  letterSpacing: 1,
                  color: "#1E66FF",
                  fontSize: { xs: 20, md: 40 },
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                {displayPrizeTitle}
              </Typography>
              <Typography
                component="p"
                sx={{
                  mx: "auto",
                  maxWidth: 720,
                  textAlign: "center",
                  color: "rgba(11,27,51,0.72)",
                  fontSize: { xs: 14, md: 15 },
                  lineHeight: 1.55,
                  fontWeight: 600,
                }}
              >
                {displayPrizeDescription}
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
                <Stack direction="row" spacing={0.6} alignItems="center" sx={{ px: 1.05, py: 0.46, borderRadius: 999, border: "1px solid #F2C94C", bgcolor: "#FFE9A8" }}>
                  <Typography variant="caption" sx={{ color: "#8A5A00", fontWeight: 900, letterSpacing: 0.3 }}>
                    RESERVADO
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.6}
                  alignItems="center"
                  sx={{
                    px: 1.05,
                    py: 0.46,
                    borderRadius: 999,
                    border: "1px solid #9CA3AF",
                    bgcolor: "#D1D5DB",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "#1F2937", fontWeight: 900, letterSpacing: 0.3 }}>
                    INDISPONÍVEL
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ ml: 0.5, color: "rgba(11,27,51,0.82)", fontWeight: 700 }}
                >
                  {selectionStatusLabel}
                </Typography>
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
                  LIMPAR SELEÇÃO
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
                  CONTINUAR
                </Button>
              </Stack>

              <Box id="produtos" sx={{ width: 0, height: 0 }} />
            </Stack>

            <Box sx={{ minWidth: 0 }}>
                {/* Grid expandida para visual mais denso e moderno */}
                <Box
                  sx={{
                    width: "fit-content",
                    maxWidth: "100%",
                    mx: "auto",
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(5, 42px)",
                        sm: "repeat(8, 48px)",
                        md: "repeat(10, 56px)",
                        lg: "repeat(10, 56px)",
                      },
                      justifyContent: "center",
                      gap: { xs: 0.95, md: 1.15 },
                      boxSizing: "border-box",
                      p: 0,
                      border: "none",
                      background: "transparent",
                      boxShadow: "none",
                    }}
                  >
                    {Array.from({ length: totalGridNumbers }).map((_, idx) => {
                      const visual = getNumberVisualState({
                        number: idx,
                        unavailableNumbers: unavailableSet,
                        reservedNumbers: reservedSet,
                      });
                      const unavailable = visual === "unavailable";
                      const reservado = visual === "reserved";
                      const initials = soldInitials[idx];
                      return (
                        <Box
                          key={idx}
                          onClick={() => handleClickNumero(idx)}
                          className={unavailable ? "xnamai-number-cell--unavailable" : undefined}
                          sx={{
                            ...getCellSx(idx),
                            borderRadius: 1.1,
                            userSelect: "none",
                            cursor: unavailable || reservado ? "not-allowed" : "pointer",
                            aspectRatio: "1 / 1",
                            width: "100%",
                            height: { xs: 42, md: 56 },
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 950,
                            fontVariantNumeric: "tabular-nums",
                            position: "relative",
                          }}
                        >
                          <Stack spacing={0.2} alignItems="center" sx={{ pointerEvents: "none" }}>
                            <Box component="span" sx={{ fontSize: { xs: 14.5, md: 15.5 }, lineHeight: 1 }}>
                              {pad2(idx)}
                            </Box>
                            {unavailable && initials && (
                              <Box
                                component="span"
                                className="xnamai-number-cell__initials--unavailable"
                                sx={getUnavailableInitialsSx()}
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

            <Box sx={{ mt: 2.5, textAlign: "center" }}>
              <Typography variant="subtitle1" sx={{ opacity: 0.95, fontWeight: 800, color: "rgba(11,27,51,0.82)" }}>
                Resultado baseado no primeiro resultado oficial da Lotomania após todos os
                números serem reservados.
              </Typography>
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
                    {`${cashbackPercentLabel} do valor de volta`}
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
                    Resultado via Lotomania (Caixa)
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Paper>

          {/* === CONTEÚDO OFICIAL — PDF Sorteio Xnamai === */}
          <Stack spacing={2.5} className="xnamai-official-rules">
            <Paper className="xnamai-official-card" variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
              <Typography component="h2" className="xnamai-official-card__title">
                Como funciona seu Cartão Presente Digital
              </Typography>
              <Typography className="xnamai-official-card__text" sx={{ mb: 1.5 }}>
                Cada participação que você faz se transforma em crédito no seu Cartão Presente
                Digital, acumulando automaticamente o valor investido. A validade do saldo é de
                3 meses, sendo renovada a cada nova participação.
              </Typography>
              <ul className="xnamai-official-card__list">
                <li>Saldo acumulativo em um único cartão</li>
                <li>Validade renovada automaticamente</li>
                <li>Uso exclusivo no site da xNaMai</li>
                <li>Código pessoal e intransferível</li>
                <li>Crédito perfeito para planejar a compra do seu próximo pedido</li>
              </ul>
              <Box className="xnamai-official-note">
                <strong>Dica:</strong> É a maneira mais inteligente de participar: enquanto
                concorre, você acumula crédito retornando uma parte do valor pago no seu número
                da sorte.
              </Box>
            </Paper>

            <Paper className="xnamai-official-card" variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
              <Typography component="h2" className="xnamai-official-card__title">
                Informações do sorteio
              </Typography>
              <ul className="xnamai-official-card__list">
                <li>A vaga só é confirmada após a compensação do pagamento.</li>
                <li>O sorteio é realizado quando todos os números forem vendidos.</li>
                <li>O ganhador é o participante com o último número sorteado pela Lotomania.</li>
                <li>
                  Para o resultado dos sorteios, será utilizado o primeiro resultado da
                  Lotomania após todos os números serem reservados.
                </li>
                <li>Prazo máximo: 7 dias após abertura da rodada.</li>
                <li>Envio do prêmio: frete por conta do vencedor.</li>
                <li>
                  O Cartão Presente não é cumulativo com o prêmio nem com outras promoções do
                  site.
                </li>
              </ul>
              <Box className="xnamai-official-note">
                Caso o seu número esteja entre os 10 primeiros, de 00 a 09, o número da sorte
                será exibido com dois algarismos, incluindo o zero.
              </Box>
              <Box className="xnamai-official-note" sx={{ mt: 1.5 }}>
                <strong>Transparência total:</strong> o resultado pode ser conferido
                publicamente no site oficial da Caixa Econômica Federal, na modalidade
                Lotomania.
              </Box>
            </Paper>

            <Paper className="xnamai-official-card" variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
              <Typography component="h2" className="xnamai-official-card__title">
                Regras para utilização dos Cartões Presente
              </Typography>
              <ul className="xnamai-official-card__list">
                <li>Uso exclusivo no site da xNaMai.</li>
                <li>Não é possível comprar outro cartão-presente com crédito de sorteio.</li>
                <li>Sem conversão em dinheiro.</li>
                <li>
                  O crédito pode ser utilizado em uma única compra, em diversos produtos ou
                  parcialmente, conforme orientação do atendimento.
                </li>
                <li>
                  Para utilizar o saldo, solicite atendimento pelo canal oficial da xNaMai via
                  WhatsApp.
                </li>
                <li>
                  Validade de 3 meses, renovável automaticamente a cada nova participação.
                </li>
                <li>
                  A xNaMai não se responsabiliza por perda, extravio ou validade expirada.
                </li>
                <li>O cartão não é cumulativo com outros cupons de desconto.</li>
              </ul>
              <Link
                href="https://wa.me/5511945145530"
                target="_blank"
                rel="noopener noreferrer"
                className="xnamai-official-whatsapp-btn"
              >
                Solicitar atendimento no WhatsApp
              </Link>
            </Paper>

            <Paper className="xnamai-official-card" variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
              <Typography component="h2" className="xnamai-official-card__title">
                Tabela para utilização do Cartão Presente
              </Typography>
              <Typography className="xnamai-official-card__text" sx={{ mb: 1 }}>
                Sempre considerar o valor integral do produto na forma de pagamento escolhida.
              </Typography>
              <div className="xnamai-official-table-wrap">
                <table className="xnamai-official-table">
                  <thead>
                    <tr>
                      <th>Cartão Presente</th>
                      <th>Condição de uso</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Até 10% do valor do pedido</td>
                      <td>Pedido mínimo R$ 800,00</td>
                    </tr>
                    <tr>
                      <td>Observação</td>
                      <td>O cartão presente não é aplicado em produtos na promoção.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Paper>
          </Stack>

          {/* BLOCO ANTIGO OCULTO TEMPORARIAMENTE — manter para possível reaproveitamento futuro */}
          <div className="xnamai-hidden-legacy">
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
               Como funciona seu Cartão Presente Digital
              </Typography>
            </Box>
              <Typography variant="body1">
                Cada participação se transforma em crédito no seu Cartão Presente Digital,
                acumulando automaticamente parte do valor investido. A validade do saldo é de 3
                meses e é renovada a cada nova participação.
              </Typography>
              <Typography variant="body1">
                • Saldo acumulativo em um único cartão
              </Typography>
              <Typography variant="body1">
                • Validade renovada automaticamente a cada nova participação
              </Typography>
              <Typography variant="body1">
                • Uso exclusivo no site da xNaMai
              </Typography>
              <Typography variant="body1">
                • Código pessoal e intransferível
              </Typography>
              <Typography variant="body1">
                • Crédito ideal para planejar a compra do seu próximo pedido
              </Typography>
              <Typography variant="body1">
                <strong>Dica:</strong> É a maneira mais inteligente de participar: enquanto
                concorre, você acumula crédito retornando parte do valor pago no seu número da
                sorte.
              </Typography>
  </Stack>
</Paper>

              <Box
                sx={{
                  width: "100%",
                  maxWidth: 800,
                  mx: "auto",
                  mt: { xs: 10, md: 16 },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: "#1E66FF",
                    fontStyle: "italic",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: { xs: 15, sm: 16 },
                    mb: "22px",
                    textAlign: "left",
                    lineHeight: 1.35,
                    whiteSpace: "pre-line",
                  }}
                >
                  {`imagem ilustrativa do\ncartão presente`}
                </Typography>
                <Box
                  component="img"
                  src="/assets/cartao-presente.png"
                  alt="Cartão presente - exemplo"
                  sx={{
                    width: "100%",
                    display: "block",
                    borderRadius: 2,
                  }}
                />
              </Box>
             
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
                • O sorteio é realizado quando todos os números forem vendidos ou reservados
                conforme as regras da campanha.
              </Typography>
              <Typography variant="body1">
                • O ganhador será definido pelo último número sorteado no resultado oficial da
                Lotomania.
              </Typography>
              <Typography variant="body1">
                • Exemplo: se a linha final da Lotomania terminar com 82, 84, 85, 88 e 99, o
                número considerado será o último: 99.
              </Typography>
              <Typography variant="body1">
                • Caso o número sorteado esteja entre 00 e 09, será considerado com dois
                algarismos, incluindo o zero.
              </Typography>
              <Typography variant="body1">
                • Para o resultado, será utilizado o primeiro resultado da Lotomania após todos
                os números serem reservados.
              </Typography>
              <Typography variant="body1">
                • Prazo máximo da rodada: 7 dias após a abertura.
              </Typography>
              <Typography variant="body1">
                • Envio do prêmio: frete por conta do vencedor.
              </Typography>
              <Typography variant="body1">
                • O Cartão Presente não é cumulativo com o prêmio nem com outras promoções do
                site.
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={1.2}>
              <Typography variant="h6" fontWeight={800}>
                Transparência total
              </Typography>
              <Typography variant="body1">
                O resultado pode ser conferido publicamente no site oficial da Caixa Econômica
                Federal, na modalidade Lotomania.
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={900}>
                Regras para utilização dos Cartões Presente
              </Typography>
              <Stack component="ul" sx={{ pl: 3, m: 0 }} spacing={1}>
                <Typography component="li">
                  Uso exclusivo no site da xNaMai.
                </Typography>
                <Typography component="li">
                  Não é possível comprar outro cartão-presente com crédito de sorteio.
                </Typography>
                <Typography component="li">Sem conversão em dinheiro.</Typography>
                <Typography component="li">
                  O crédito pode ser utilizado em uma única compra, em diversos produtos ou
                  parcialmente, conforme orientação do atendimento.
                </Typography>
                <Typography component="li">
                  Para utilizar o saldo, solicite atendimento pelo canal oficial da xNaMai.{" "}
                  <Link
                    href="https://wa.me/5511945145530"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </Link>
                </Typography>
                <Typography component="li">
                  Validade de 3 meses, renovável automaticamente a cada nova participação.
                </Typography>
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
        productName={displayPrizeName}
        creditPriceDefault={6799.99}
        pixPriceDefault={5779.99}
        giftBalanceDefault={800}
      />


           <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mt: 2 }}>
  <Stack spacing={2}>
    {/* Exemplo Prático */}
    <Typography variant="h6">ÔîÜ Exemplo Prático</Typography>

    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
      <strong>{displayPrizeName}</strong>
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
  </Stack>
</Paper>



          <Paper variant="outlined" sx={{ p: 0, overflow: "hidden" }}>
            <Box
              component="img"
              src={imgDicaAcumuloUnificada}
              srcSet={`${imgDicaAcumuloUnificada} 1x, ${imgDicaAcumuloUnificada2x} 2x, ${imgDicaAcumuloUnificada3x} 3x`}
              sizes="100vw"
              alt="Dica de acúmulo com exemplos de participação e renovação de validade"
              sx={{
                width: "100%",
                display: "block",
                imageRendering: "auto",
              }}
            />
          </Paper>
          </div>

          <Paper className="xnamai-official-card" variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Typography component="h2" className="xnamai-official-card__title">
                Perguntas Frequentes (FAQ)
              </Typography>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>1. Como funciona o sorteio?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    Baseado no resultado oficial da Lotomania. O ganhador é quem possui o último
                    número sorteado.
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
                    Você concorre ao prêmio e ainda recebe parte do valor investido de volta em
                    créditos no site.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>4. Onde posso usar meu cartão presente?</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    Somente no site da xNaMai Sorteios, em qualquer produto disponível no site
                    (respeitando a tabela).
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
                  <Typography variant="body2">
                    Não. O custo de envio é por conta do vencedor.
                  </Typography>
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
                    Sim, você pode desmembrar o seu cartão presente e usar somente uma parte do seu
                    saldo.
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
              rel="noopener noreferrer"
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
                Total:{" "}
                <strong>
                  {(selecionados.length * unitPrice).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </strong>
              </Typography>
              {Number.isFinite(remainingAfterSelection) && (
                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                  Após esta seleção, você ainda poderá comprar {remainingAfterSelection} número(s) neste sorteio.
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
          setPixError("");
          setPixRefreshMsg("");
        }}
        loading={pixLoading}
        data={pixData}
        amount={pixAmount}
        inlineMessage={pixError || pixRefreshMsg}
        onCopy={() => {
          if (pixData) {
            navigator.clipboard.writeText(
              pixData.copy_paste_code || pixData.qr_code || ""
            );
          }
        }}
        onRefresh={async () => {
          if (!pixData?.paymentId) return;
          setPixRefreshMsg("");
          try {
            const st = await checkPixStatus(pixData.paymentId);
            const payStatus = st?.status || st?.payment_status;
            if (isPaidStatus(payStatus)) {
              handlePixApproved();
            } else {
              setPixRefreshMsg(`Status: ${payStatus || "pendente"}`);
            }
          } catch {
            setPixRefreshMsg("Não foi possível consultar o pagamento agora.");
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
            Seus números foram confirmados e agora estão indisponíveis.
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
            ? `Você pode selecionar no máximo ${maxSelectable} números`
            : "Número máximo de compras por usuário atingido"}
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          <Typography sx={{ opacity: 0.9 }}>
            {limitInfo?.message ||
              (limitInfo?.type === "selection"
                ? "Para continuar, remova um número antes de adicionar outro."
                : "Você já alcançou o limite de números neste sorteio.")}
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
