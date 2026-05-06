// src/AdminSorteios.jsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, IconButton, Menu, MenuItem, Divider,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Collapse, Stack, Chip
} from "@mui/material";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import { useAuth } from "./authContext";
import { API_CONFIG } from "./config/api";
import "./styles/xnamai-admin.css";
import XnamaiAdminLayout from "./components/admin/XnamaiAdminLayout";

/* ---------- API base normalizada (mesma lógica do AccountPage) ---------- */
const RAW_BASE = API_CONFIG.baseUrl || "/api";

function normalizeApiBase(b) {
  if (!b) return "/api";
  let base = String(b).replace(/\/+$/, "");
  // se for http(s) e não terminar com /api, acrescenta /api
  if (/^https?:\/\//i.test(base) && !/\/api$/i.test(base)) base += "/api";
  return base;
}
const API_BASE = normalizeApiBase(RAW_BASE);

const apiJoin = (path) => {
  let p = path;
  if (!p.startsWith("/")) p = `/${p}`;
  // evita .../api + /api/...
  if (API_BASE.endsWith("/api") && p.startsWith("/api/")) p = p.slice(4);
  return `${API_BASE}${p}`;
};

/* ---------- helpers ---------- */
const pad3 = (n) => (n != null ? String(n).padStart(3, "0") : "--");
const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
};
const daysBetween = (start, end) => {
  const a = new Date(start), b = new Date(end || Date.now());
  if (Number.isNaN(a) || Number.isNaN(b)) return "-";
  const ms = Math.max(0, b - a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

const authHeaders = () => {
  const tk =
    localStorage.getItem("ns_auth_token") ||
    sessionStorage.getItem("ns_auth_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("token");
  return tk ? { Authorization: `Bearer ${tk}` } : {};
};

async function getJSON(pathOrUrl) {
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : apiJoin(pathOrUrl);
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function getFirst(paths) {
  for (const p of paths) {
    try {
      return await getJSON(p);
    } catch {
      // tenta o próximo
    }
  }
  return null;
}

/** Normaliza o payload da API em linhas para a tabela */
function buildRows(payload) {
  const arr = Array.isArray(payload)
    ? payload
    : payload?.history || payload?.draws || payload?.items || [];

  return (arr || [])
    .map((it) => {
      const id = it.id ?? it.draw_id ?? it.numero ?? it.n ?? null;
      const opened = it.opened_at ?? it.created_at ?? it.abertura ?? null;
      const closed = it.closed_at ?? it.fechado_em ?? it.fechamento ?? null;
      const realized =
        it.realized_at ?? it.raffled_at ?? it.data_realizacao ?? it.realizacao ?? null;

      const winner =
        it.winner_name ??
        it.vencedor_nome ??
        it.winner?.name ??
        it.usuario_vencedor ??
        "-";

      const dias =
        it.days_open ??
        it.dias_aberto ??
        (opened ? daysBetween(opened, closed) : "-");

      return {
        n: id,
        abertura: fmtDate(opened),
        fechamento: fmtDate(closed),
        dias,
        realizacao: fmtDate(realized),
        vencedor: winner || "-",
      };
    })
    .filter((r) => r.n != null)
    .sort((a, b) => Number(b.n || 0) - Number(a.n || 0));
}

/** Agrupa participantes por usuário -> lista de números */
function groupParticipants(list) {
  const map = new Map();
  for (const p of list || []) {
    const key = p.user_id ?? p.user_name ?? "—";
    const name = p.user_name || "—";
    const number = p.number ?? p.numero ?? null;
    const status = p.status ?? null;
    if (!map.has(key)) map.set(key, { name, numbers: [], statuses: new Set() });
    if (number != null) map.get(key).numbers.push(Number(number));
    if (status) map.get(key).statuses.add(String(status));
  }
  // ordena números e transforma statuses em string curta
  const rows = [];
  for (const [, v] of map.entries()) {
    v.numbers.sort((a, b) => a - b);
    rows.push({
      name: v.name,
      numbers: v.numbers,
      statusLabel: [...v.statuses].join(", "),
      qty: v.numbers.length,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return rows;
}

export default function AdminSorteios() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [menuEl, setMenuEl] = React.useState(null);
  const open = Boolean(menuEl);
  const openMenu = (e) => setMenuEl(e.currentTarget);
  const closeMenu = () => setMenuEl(null);
  const goPainel = () => { closeMenu(); navigate("/admin"); };
  const doLogout = () => { closeMenu(); logout(); navigate("/"); };

  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // estado de expansão e cache de participantes por draw_id
  const [expanded, setExpanded] = React.useState({});           // { [drawId]: boolean }
  const [partsCache, setPartsCache] = React.useState({});       // { [drawId]: { loading, error, items } }

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // tenta os fechados, depois history, depois lista geral
        const payload = await getFirst([
          "/draws?status=closed",
          "/admin/draws?status=closed",
          "/draws/history",
          "/admin/draws/history",
          "/draws",
        ]);
        if (alive && payload) setRows(buildRows(payload));
      } catch (e) {
        console.error("[admin/draws] fetch error:", e);
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function ensureParticipants(drawId) {
    if (partsCache[drawId]?.items || partsCache[drawId]?.loading) return;
    setPartsCache((s) => ({ ...s, [drawId]: { loading: true, error: null, items: null } }));
    try {
      const payload = await getFirst([
        `/admin/draws/${drawId}/participants`,
        `/draws/${drawId}/participants`,
        `/admin/draws/${drawId}/players`,
        `/draws/${drawId}/players`,
      ]);
      const list = payload?.participants || payload?.items || payload || [];
      setPartsCache((s) => ({ ...s, [drawId]: { loading: false, error: null, items: list } }));
    } catch (e) {
      console.error("[participants] fetch error:", e);
      setPartsCache((s) => ({ ...s, [drawId]: { loading: false, error: String(e?.message || e), items: [] } }));
    }
  }

  function toggleExpand(drawId) {
    setExpanded((s) => {
      const next = { ...s, [drawId]: !s[drawId] };
      return next;
    });
    // carrega sob demanda
    ensureParticipants(drawId);
  }

  return (
    <XnamaiAdminLayout
      title="Sorteios realizados"
      subtitle="Histórico de sorteios e detalhes de participantes por sorteio."
      onBack={() => navigate("/admin")}
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
      <Paper className="xnamai-admin-card" variant="outlined" sx={{ p: { xs: 1, md: 1.5 } }}>
        <div className="xnamai-admin-table-wrap">
          <div className="xnamai-admin-table">
            <TableContainer>
              <Table sx={{ minWidth: 920 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Nº SORTEIO</TableCell>
                    <TableCell>DATA ABERTURA</TableCell>
                    <TableCell>DATA FECHAMENTO</TableCell>
                    <TableCell>DIAS ABERTO</TableCell>
                    <TableCell>DATA REALIZAÇÃO</TableCell>
                    <TableCell>USUÁRIO VENCEDOR</TableCell>
                    <TableCell align="right">Detalhes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={7}>Carregando…</TableCell>
                    </TableRow>
                  )}
                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="xnamai-admin-empty">
                        Nenhum sorteio encontrado.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && rows.map((d) => {
                    const drawId = Number(d.n);
                    const isOpen = !!expanded[drawId];
                    const partState = partsCache[drawId];
                    const grouped = groupParticipants(partState?.items);

                    return (
                      <React.Fragment key={drawId}>
                        <TableRow hover onClick={() => toggleExpand(drawId)} sx={{ cursor: "pointer" }}>
                          <TableCell sx={{ fontWeight: 900, color: "primary.main" }}>{pad3(drawId)}</TableCell>
                          <TableCell>{d.abertura}</TableCell>
                          <TableCell>{d.fechamento}</TableCell>
                          <TableCell>{d.dias}</TableCell>
                          <TableCell>{d.realizacao}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{d.vencedor}</TableCell>
                          <TableCell align="right" sx={{ width: 56, color: "primary.main" }}>
                            {isOpen ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell colSpan={7} sx={{ p: 0, borderBottom: 0 }}>
                            <Collapse in={isOpen} timeout="auto" unmountOnExit>
                              <Box sx={{ px: 2, py: 2, bgcolor: "rgba(30,102,255,0.04)", borderTop: "1px solid rgba(15,23,42,0.08)" }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1, color: "text.primary" }}>
                                  Participantes & números do sorteio #{pad3(drawId)}
                                </Typography>

                                {!partState || partState.loading ? (
                                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700 }}>
                                    Carregando participantes…
                                  </Typography>
                                ) : partState.error ? (
                                  <Typography variant="body2" color="error">
                                    Erro ao carregar participantes: {partState.error}
                                  </Typography>
                                ) : grouped.length === 0 ? (
                                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700 }}>
                                    Nenhum participante encontrado.
                                  </Typography>
                                ) : (
                                  <Paper className="xnamai-admin-card" variant="outlined" sx={{ p: 1.25 }}>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Usuário</TableCell>
                                          <TableCell>Qtd</TableCell>
                                          <TableCell>Números</TableCell>
                                          <TableCell>Status</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {grouped.map((p, idx) => (
                                          <TableRow key={idx} hover>
                                            <TableCell sx={{ fontWeight: 800 }}>{p.name}</TableCell>
                                            <TableCell sx={{ fontWeight: 900, color: "primary.main" }}>{p.qty}</TableCell>
                                            <TableCell>
                                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                {p.numbers.map((n) => (
                                                  <Chip
                                                    key={n}
                                                    size="small"
                                                    label={String(n).padStart(2, "0")}
                                                    sx={{ bgcolor: "rgba(30,102,255,0.10)", border: "1px solid rgba(30,102,255,0.18)", fontWeight: 900 }}
                                                  />
                                                ))}
                                              </Stack>
                                            </TableCell>
                                            <TableCell sx={{ color: "text.secondary", fontWeight: 700 }}>
                                              {p.statusLabel || "-"}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </Paper>
                                )}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      </Paper>
    </XnamaiAdminLayout>
  );
}
