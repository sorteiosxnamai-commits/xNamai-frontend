import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { getJSON } from "./lib/api";
import "./styles/xnamai-admin.css";

function formatDateTimeBR(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoneyFromCents(cents) {
  return ((Number(cents) || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizePayload(payload) {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.purchases)
      ? payload.purchases
      : [];

  return {
    items,
    summary: payload?.summary || {},
    total: Number(payload?.total || items.length || 0),
  };
}

function PurchaseStatusChip({ status }) {
  const normalized = String(status || "").toLowerCase();

  const isPaid = [
    "approved",
    "paid",
    "pago",
    "sold",
    "vendido",
    "aprovado",
  ].includes(normalized);

  return (
    <Chip
      label={isPaid ? "PAGO" : normalized.toUpperCase() || "PAGO"}
      sx={{
        bgcolor: isPaid ? "rgba(37,109,255,0.12)" : "rgba(244,183,64,0.16)",
        color: "#16325c",
        fontWeight: 900,
        borderRadius: 999,
        px: 1.5,
        border: isPaid
          ? "1px solid rgba(37,109,255,0.26)"
          : "1px solid rgba(244,183,64,0.35)",
      }}
    />
  );
}

export default function AdminPurchaseHistory() {
  const [items, setItems] = React.useState([]);
  const [summary, setSummary] = React.useState({});
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadHistory = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("limit", "500");

      if (q.trim()) {
        params.set("q", q.trim());
      }

      if (type !== "all") {
        params.set("type", type);
      }

      const payload = await getJSON(`/admin/clients/purchase-history?${params.toString()}`);
      const normalized = normalizePayload(payload);

      setItems(normalized.items);
      setSummary(normalized.summary);
      setTotal(normalized.total);
    } catch (err) {
      console.error("[AdminPurchaseHistory] erro:", err);
      setItems([]);
      setSummary({});
      setTotal(0);
      setError("Não foi possível carregar o histórico de compras dos clientes.");
    } finally {
      setLoading(false);
    }
  }, [q, type]);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function handleSubmit(event) {
    event.preventDefault();
    loadHistory();
  }

  return (
    <>
      <div className="xnamai-admin-stack" style={{ marginBottom: 20 }}>
        <Typography className="xnamai-admin-title" sx={{ fontSize: { xs: 24, md: 36 } }}>
          Histórico de compras dos clientes
        </Typography>

        <Typography className="xnamai-admin-subtitle">
          Veja todas as compras pagas dos clientes, incluindo sorteio principal e promocionais.
        </Typography>
      </div>

      <Paper className="xnamai-admin-card" variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
        <Stack spacing={2}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              gap: 2,
            }}
          >
            <Box>
              <Typography sx={{ color: "#526078", fontWeight: 900, fontSize: 13 }}>
                COMPRAS PAGAS
              </Typography>
              <Typography sx={{ color: "#0b1933", fontWeight: 950, fontSize: 30 }}>
                {loading ? "..." : total}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ color: "#526078", fontWeight: 900, fontSize: 13 }}>
                CLIENTES
              </Typography>
              <Typography sx={{ color: "#0b1933", fontWeight: 950, fontSize: 30 }}>
                {loading ? "..." : Number(summary?.total_clients || 0)}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ color: "#526078", fontWeight: 900, fontSize: 13 }}>
                VALOR TOTAL
              </Typography>
              <Typography sx={{ color: "#0b1933", fontWeight: 950, fontSize: 30 }}>
                {summary?.total_amount_label || formatMoneyFromCents(summary?.total_amount_cents)}
              </Typography>
            </Box>
          </Box>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.5fr 0.7fr auto" },
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <TextField
              size="small"
              label="Buscar cliente, e-mail ou sorteio"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              fullWidth
            />

            <TextField
              size="small"
              label="Tipo"
              value={type}
              onChange={(event) => setType(event.target.value)}
              select
              SelectProps={{ native: true }}
              fullWidth
            >
              <option value="all">Todos</option>
              <option value="main">Principal</option>
              <option value="promotional">Promocional</option>
            </TextField>

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                borderRadius: 999,
                fontWeight: 900,
                px: 3,
                minHeight: 40,
                background: "linear-gradient(135deg, #1e63ff, #0b58ff)",
              }}
            >
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </Box>

          {error && (
            <Alert severity="warning" variant="outlined">
              {error}
            </Alert>
          )}
        </Stack>
      </Paper>

      <Paper className="xnamai-admin-card" variant="outlined" sx={{ p: { xs: 1, md: 1.5 } }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            <LinearProgress />
          </Box>
        ) : (
          <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
            <Table sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow>
                  <TableCell>CLIENTE</TableCell>
                  <TableCell>E-MAIL</TableCell>
                  <TableCell>TIPO</TableCell>
                  <TableCell>SORTEIO</TableCell>
                  <TableCell>NÚMEROS</TableCell>
                  <TableCell>VALOR</TableCell>
                  <TableCell>DATA</TableCell>
                  <TableCell>STATUS</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {!items.length && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 4, textAlign: "center", fontWeight: 800 }}>
                      Nenhuma compra paga encontrada.
                    </TableCell>
                  </TableRow>
                )}

                {items.map((item, index) => (
                  <TableRow key={`${item.type || "purchase"}-${item.id || index}`} hover>
                    <TableCell sx={{ fontWeight: 800 }}>
                      {item.customer_name || "Cliente"}
                    </TableCell>

                    <TableCell>{item.customer_email || "-"}</TableCell>

                    <TableCell sx={{ fontWeight: 800 }}>
                      {item.type_label || (item.type === "promotional" ? "Promocional" : "Principal")}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 800 }}>
                      {item.draw_title || "-"}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 800 }}>
                      {item.numbers_label || "-"}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 900 }}>
                      {item.amount_label || formatMoneyFromCents(item.amount_cents)}
                    </TableCell>

                    <TableCell>
                      {formatDateTimeBR(item.purchased_at || item.paid_at)}
                    </TableCell>

                    <TableCell>
                      <PurchaseStatusChip status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </>
  );
}
