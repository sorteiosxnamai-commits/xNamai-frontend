// src/AdminDashboard.jsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useAuth } from "./authContext";
import { API_CONFIG } from "./config/api";
import "./styles/xnamai-admin.css";
import XnamaiAdminLayout from "./components/admin/XnamaiAdminLayout";

/* ---------- helpers de API (robusto com /api) ---------- */
const RAW_BASE = API_CONFIG.baseUrl || "/api";
const API_BASE = String(RAW_BASE).replace(/\/+$/, "");

const apiJoin = (path) => {
  let p = path.startsWith("/") ? path : `/${path}`;
  const baseHasApi = /\/api\/?$/.test(API_BASE);
  if (baseHasApi && p.startsWith("/api/")) p = p.slice(4);
  if (!baseHasApi && !p.startsWith("/api/")) p = `/api${p}`;
  return `${API_BASE}${p}`;
};

const authHeaders = () => {
  const tk =
    localStorage.getItem("ns_auth_token") ||
    sessionStorage.getItem("ns_auth_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("token");
  return tk
    ? { Authorization: `Bearer ${String(tk).replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "")}` }
    : {};
};

async function getJSON(path) {
  const r = await fetch(apiJoin(path), {
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "omit",
    cache: "no-store", // evita cache 304
  });
  if (!r.ok) {
    let err = `${r.status}`;
    try { const j = await r.json(); if (j?.error) err = j.error; } catch {}
    throw new Error(err);
  }
  return r.json();
}
async function postJSON(path, body, method = "POST") {
  const r = await fetch(apiJoin(path), {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "omit",
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) {
    let err = `${r.status}`;
    try { const j = await r.json(); if (j?.error) err = j.error; } catch {}
    throw new Error(err);
  }
  return r.json().catch(() => ({}));
}

function NavCard({ icon, title, desc, onClick }) {
  return (
    <Paper
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      className="xnamai-admin-card"
      sx={{
        p: { xs: 2, md: 2.5 },
        cursor: "pointer",
        transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
        borderColor: "rgba(15, 23, 42, 0.10)",
        "&:hover": {
          transform: "translateY(-2px)",
          borderColor: "rgba(30, 102, 255, 0.22)",
          boxShadow: "0 22px 56px rgba(15,23,42,0.12)",
        },
        "&:focus-visible": {
          outline: "3px solid rgba(30, 102, 255, 0.25)",
          outlineOffset: 2,
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, rgba(30,102,255,0.14) 0%, rgba(11,95,255,0.10) 100%)",
            border: "1px solid rgba(30, 102, 255, 0.18)",
            color: "primary.main",
            flex: "0 0 auto",
          }}
        >
          {icon}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 16, color: "text.primary" }}>
            {title}
          </Typography>
          <Typography sx={{ mt: 0.5, color: "text.secondary", fontWeight: 600, fontSize: 13, lineHeight: 1.35 }}>
            {desc}
          </Typography>
        </Box>

        <Box sx={{ color: "primary.main", opacity: 0.9, pt: 0.5 }}>
          <ArrowForwardRoundedIcon />
        </Box>
      </Stack>
    </Paper>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // resumo
  const [drawId, setDrawId] = React.useState(null);
  const [sold, setSold] = React.useState(0);
  const [remaining, setRemaining] = React.useState(0);

  // preço (em centavos)
  const [price, setPrice] = React.useState("");

  // novos campos
  const [maxSelect, setMaxSelect] = React.useState(5);
  const [bannerTitle, setBannerTitle] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  const loadSummary = React.useCallback(async () => {
    setLoading(true);
    try {
      // resumo do dashboard
      const r = await getJSON("/admin/dashboard/summary");
      setDrawId(r.draw_id ?? null);
      setSold(r.sold ?? 0);
      setRemaining(r.remaining ?? 0);
      if (Number.isFinite(Number(r.price_cents))) {
        setPrice(String(Number(r.price_cents)));
      }

      // configurações públicas
      try {
        const cfg = await getJSON("/config");

        const cfgCents =
          cfg?.ticket_price_cents ??
          cfg?.price_cents ??
          cfg?.current?.price_cents ??
          cfg?.current_draw?.price_cents ??
          null;
        if (cfgCents != null && Number.isFinite(Number(cfgCents))) {
          setPrice(String(Number(cfgCents)));
        }

        const maxSel =
          cfg?.max_numbers_per_selection ??
          cfg?.max_per_selection ??
          cfg?.max_select ??
          null;
        if (maxSel != null && !Number.isNaN(Number(maxSel))) {
          setMaxSelect(Number(maxSel));
        }

        const banner =
          cfg?.banner_title ??
          cfg?.promo_title ??
          cfg?.headline ??
          "";
        if (banner != null) setBannerTitle(String(banner));
      } catch (e) {
        console.warn("[AdminDashboard] GET /config opcional:", e?.message || e);
      }
    } catch (e) {
      console.error("[AdminDashboard] GET /summary failed:", e);
      setDrawId(null);
      setSold(0);
      setRemaining(0);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { loadSummary(); }, [loadSummary]);

  // SALVAR: mantém o fluxo do preço que já funciona e tenta salvar os novos campos
  const onSaveAll = async () => {
    setSaving(true);
    let msg = "Configurações atualizadas.";
    try {
      // 1) preço — usa a rota que já funciona hoje
      const priceCents = Math.max(0, Math.floor(Number(price || 0)));
      await postJSON("/admin/dashboard/ticket-price", { price_cents: priceCents });

      // 2) banner + max — tenta POST /config (se seu backend ainda não tiver, isso cairá no catch)
      try {
        await postJSON("/config", {
          banner_title: String(bannerTitle || ""),
          max_numbers_per_selection: Math.max(1, Math.floor(Number(maxSelect || 1))),
        });
      } catch (e) {
        console.warn("[AdminDashboard] POST /config falhou:", e?.message || e);
        msg =
          "Preço atualizado. Para salvar 'Frase promocional' e 'Máximo de tickets', habilite POST /api/config no backend.";
      }

      await loadSummary();
      alert(msg);
    } catch (e) {
      console.error("[AdminDashboard] salvar configs falhou:", e);
      alert("Não foi possível atualizar as configurações agora.");
    } finally {
      setSaving(false);
    }
  };

  const onNewDraw = async () => {
    try {
      setCreating(true);
      await postJSON("/admin/dashboard/new", {});
      await loadSummary();
      // Notifica o frontend para refetch imediato de config/numbers (reservados) sem esperar polling
      try {
        window.dispatchEvent(new CustomEvent("ns:draw:changed"));
        window.dispatchEvent(new CustomEvent("ns:numbers:reload"));
      } catch {}
    } catch (e) {
      console.error("[AdminDashboard] POST /new failed:", e);
    } finally {
      setCreating(false);
    }
  };

  // menu
  const [menuEl, setMenuEl] = React.useState(null);
  const open = Boolean(menuEl);
  const openMenu = (e) => setMenuEl(e.currentTarget);
  const closeMenu = () => setMenuEl(null);
  const goPainel = () => { closeMenu(); navigate("/admin"); };
  const doLogout = () => { closeMenu(); logout(); navigate("/"); };

  return (
    <XnamaiAdminLayout
      title="Painel Admin"
      subtitle="Configure o sorteio atual e acesse rapidamente as áreas principais."
      onBack={() => navigate("/")}
      actions={
        <>
          <IconButton color="inherit" onClick={openMenu} aria-label="Conta">
            <AccountCircleRoundedIcon />
          </IconButton>
          <Menu
            anchorEl={menuEl}
            open={open}
            onClose={closeMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={goPainel}>Painel (Admin)</MenuItem>
            <Divider />
            <MenuItem onClick={doLogout}>Sair</MenuItem>
          </Menu>
        </>
      }
    >
      <Stack spacing={3}>

          {/* Painel (resumo + preço e configs) */}
          <Paper className="xnamai-admin-card" variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} flexWrap="wrap">
              <Stack>
                <Typography sx={{ color: "text.secondary", fontWeight: 800 }}>Nº Sorteio atual</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary" }}>
                  {loading ? "…" : drawId ?? "-"}
                </Typography>
              </Stack>

              <Stack>
                <Typography sx={{ color: "text.secondary", fontWeight: 800 }}>Números vendidos</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary" }}>
                  {loading ? "…" : sold}
                </Typography>
              </Stack>

              <Stack>
                <Typography sx={{ color: "text.secondary", fontWeight: 800 }}>Números restantes</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary" }}>
                  {loading ? "…" : remaining}
                </Typography>
              </Stack>

              <Box sx={{ flex: 1 }} />

              <Box
                component="button"
                onClick={onNewDraw}
                disabled={creating}
                className="xnamai-admin-button secondary"
                style={{ cursor: creating ? "not-allowed" : "pointer" }}
              >
                {creating ? "Criando..." : "NOVO SORTEIO"}
              </Box>
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            {/* Valor por Ticket (centavos) */}
            <Typography sx={{ color: "text.secondary", fontWeight: 800, mb: 1 }}>Valor por ticket</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 2 }}>
              <TextField
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="em centavos (ex.: 100 = R$ 1,00)"
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                sx={{ maxWidth: 360 }}
              />
            </Stack>

            {/* Máximo de tickets por seleção */}
            <Typography sx={{ color: "text.secondary", fontWeight: 800, mb: 1 }}>
              Máximo de Tickets permitidos
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 2 }}>
              <TextField
                type="number"
                value={maxSelect}
                onChange={(e) => setMaxSelect(e.target.value)}
                placeholder="Ex.: 5"
                inputProps={{ min: 1 }}
                sx={{ maxWidth: 220 }}
              />
            </Stack>

            {/* Frase promocional */}
            <Typography sx={{ color: "text.secondary", fontWeight: 800, mb: 1 }}>
              Frase promocional
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 2.5 }}>
              <TextField
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                placeholder="Ex.: Sorteio de um Watch Winder…"
                fullWidth
              />
            </Stack>

            <Box
              component="button"
              onClick={onSaveAll}
              disabled={saving}
              className="xnamai-admin-button"
              style={{ cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Salvando..." : "ATUALIZAR"}
            </Box>
          </Paper>

          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: 16, mb: 1, color: "text.primary" }}>
              Acessos rápidos
            </Typography>
            <Box className="xnamai-admin-grid">
              <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                <NavCard
                  icon={<PeopleAltRoundedIcon />}
                  title="Cadastro e manutenção de clientes"
                  desc="Criar/editar clientes, saldo de cupom e permissões."
                  onClick={() => navigate("/admin/AdminClientesUser")}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                <NavCard
                  icon={<LocalOfferRoundedIcon />}
                  title="Sorteio ativo — compradores"
                  desc="Ver compradores e exportar CSV/PNG do sorteio aberto."
                  onClick={() => navigate("/admin/sorteiosAtivos")}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                <NavCard
                  icon={<InsightsRoundedIcon />}
                  title="Dashboard — análise"
                  desc="KPIs, gráficos e tabelas de performance."
                  onClick={() => navigate("/admin/analytics")}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                <NavCard
                  icon={<HistoryRoundedIcon />}
                  title="Lista de sorteios realizados"
                  desc="Histórico, vencedor e detalhes por sorteio."
                  onClick={() => navigate("/admin/sorteios")}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                <NavCard
                  icon={<AccountBalanceWalletRoundedIcon />}
                  title="Lista de clientes com saldo ativo"
                  desc="Clientes com saldo de cupom e expiração."
                  onClick={() => navigate("/admin/clientes")}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: "span 12", md: "span 6" } }}>
                <NavCard
                  icon={<EmojiEventsRoundedIcon />}
                  title="Lista de vencedores dos sorteios"
                  desc="Vencedores, status do prêmio e dados do produto."
                  onClick={() => navigate("/admin/vencedores")}
                />
              </Box>
            </Box>
          </Box>
      </Stack>
    </XnamaiAdminLayout>
  );
}
