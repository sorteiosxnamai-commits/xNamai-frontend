// src/AdminVencedores.jsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button
} from "@mui/material";
import { API_CONFIG } from "./config/api";
import "./styles/xnamai-admin.css";
import XnamaiAdminLayout from "./components/admin/XnamaiAdminLayout";

/* ---------- API base util ---------- */
const RAW_BASE = API_CONFIG.baseUrl || "/api";
const API_BASE = String(RAW_BASE).replace(/\/+$/, "");
const apiJoin = (path) => {
  let p = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE.endsWith("/api") && p.startsWith("/api/")) p = p.slice(4);
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
async function getJSON(pathOrUrl) {
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : apiJoin(pathOrUrl);
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
async function patchJSON(path, body) {
  const url = apiJoin(path);
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

/* ---------- helpers ---------- */
const pad3 = (n) => (n != null ? String(n).padStart(3, "0") : "--");
const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
};

export default function AdminVencedores() {
  const navigate = useNavigate();

  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const payload = await getJSON("/api/admin/winners");
        const list = Array.isArray(payload?.winners) ? payload.winners : [];

        const lines = list.map((w) => ({
          key: `${w.draw_id}-${w.realized_at}`,
          drawId: w.draw_id,
          nome: w.winner_name || "-",
          numero: w.draw_id,
          numeroVencedor: (w.winner_number ?? "") === "" || w.winner_number == null ? "-" : w.winner_number,
          data: fmtDate(w.realized_at),
          status: w.status || (w.redeemed ? "RESGATADO" : "NÃO RESGATADO"),
          dias: w.days_since ?? "-",
          productName: w.product_name || "",
          productLink: w.product_link || "",
        }));

        if (alive) setRows(lines);
      } catch (e) {
        console.error("[AdminVencedores] fetch error:", e);
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { /* cleanup */ };
  }, []);

  const updateField = (key, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    );
  };

  const saveRow = async (row) => {
    try {
      setSavingId(row.drawId);
      const resp = await patchJSON(`/api/admin/winners/${row.drawId}`, {
        product_name: row.productName,
        product_link: row.productLink,
      });
      // garante sincronização local
      setRows((prev) =>
        prev.map((r) =>
          r.drawId === row.drawId
            ? { ...r, productName: resp.product_name || "", productLink: resp.product_link || "" }
            : r
        )
      );
    } catch (e) {
      console.error("[AdminVencedores] save error:", e);
      alert("Não foi possível salvar os dados do produto.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <XnamaiAdminLayout
      title="Vencedores"
      subtitle="Lista de vencedores dos sorteios e dados do prêmio."
      onBack={() => navigate("/admin")}
    >
      <Paper className="xnamai-admin-card" variant="outlined" sx={{ p: { xs: 1, md: 1.5 } }}>
        <div className="xnamai-admin-table-wrap">
          <div className="xnamai-admin-table">
            <TableContainer>
              <Table sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>NOME DO USUÁRIO</TableCell>
                    <TableCell>Nº SORTEIO</TableCell>
                    <TableCell>NÚMERO VENCEDOR</TableCell>
                    <TableCell>DATA DO SORTEIO</TableCell>
                    <TableCell>SITUAÇÃO DO PRÊMIO</TableCell>
                    <TableCell>DIAS CONTEMPLADO</TableCell>
                    <TableCell sx={{ minWidth: 220 }}>PRODUTO</TableCell>
                    <TableCell sx={{ minWidth: 260 }}>LINK DO PRODUTO</TableCell>
                    <TableCell align="right">AÇÕES</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && (
                    <TableRow><TableCell colSpan={9}>Carregando…</TableCell></TableRow>
                  )}
                  {!loading && rows.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="xnamai-admin-empty">Nenhum vencedor encontrado.</TableCell></TableRow>
                  )}
                  {rows.map((w) => (
                    <TableRow key={w.key} hover>
                      <TableCell sx={{ fontWeight: 800 }}>{w.nome}</TableCell>
                      <TableCell sx={{ fontWeight: 900, color: "primary.main" }}>{pad3(w.numero)}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{w.numeroVencedor}</TableCell>
                      <TableCell>{w.data}</TableCell>
                      <TableCell sx={{ color: w.status === "RESGATADO" ? "primary.main" : "text.secondary", fontWeight: 900 }}>
                        {w.status}
                      </TableCell>
                      <TableCell>{w.dias}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="Nome do produto"
                          value={w.productName}
                          onChange={(e) => updateField(w.key, "productName", e.target.value)}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          placeholder="https://…"
                          value={w.productLink}
                          onChange={(e) => updateField(w.key, "productLink", e.target.value)}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => saveRow(w)}
                          disabled={savingId === w.drawId}
                        >
                          {savingId === w.drawId ? "Salvando…" : "Salvar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      </Paper>
    </XnamaiAdminLayout>
  );
}
