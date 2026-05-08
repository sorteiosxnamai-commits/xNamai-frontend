// src/AdminSorteios.jsx
import React from "react";
import { getDrawsHistory, setDrawStatus } from "./services/adminDraws";

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return "-";
  }
}

function formatMoney(cents) {
  const value = Number(cents || 0) / 100;

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function statusLabel(status) {
  const value = String(status || "").toLowerCase();

  if (["open", "active", "aberto", "ativo"].includes(value)) return "Ativo";
  if (["closed", "finished", "encerrado", "finalizado"].includes(value)) return "Encerrado";
  if (["draft", "rascunho"].includes(value)) return "Rascunho";

  return status || "-";
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "48px 20px 80px",
    background:
      "radial-gradient(circle at 10% 15%, rgba(37, 99, 235, 0.13), transparent 30%), radial-gradient(circle at 90% 20%, rgba(34, 211, 238, 0.17), transparent 32%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
    color: "#0f1f3a",
  },
  shell: {
    width: "100%",
    maxWidth: "1150px",
    margin: "0 auto",
  },
  title: {
    fontSize: "36px",
    lineHeight: 1.1,
    margin: "0 0 10px",
    fontWeight: 500,
  },
  subtitle: {
    margin: "0 0 22px",
    color: "#53617a",
    fontSize: "16px",
  },
  card: {
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(15, 31, 58, 0.08)",
    borderRadius: "16px",
    boxShadow: "0 20px 45px rgba(15, 31, 58, 0.10)",
    padding: "14px",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px",
  },
  th: {
    textAlign: "left",
    background: "#f1f5ff",
    color: "#0b1933",
    padding: "14px",
    fontSize: "14px",
    fontWeight: 900,
    borderBottom: "1px solid #dbe6fb",
  },
  td: {
    padding: "14px",
    borderBottom: "1px solid #eef2f7",
    color: "#0f1f3a",
    fontSize: "14px",
    verticalAlign: "middle",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 900,
    background: "#eaf2ff",
    color: "#1e63ff",
  },
  activeBadge: {
    background: "#ecfdf5",
    color: "#047857",
  },
  closedBadge: {
    background: "#f1f5f9",
    color: "#475569",
  },
  button: {
    border: "1px solid #dbe6fb",
    background: "#fff",
    color: "#1e63ff",
    borderRadius: "999px",
    padding: "9px 13px",
    fontWeight: 900,
    cursor: "pointer",
    marginRight: "8px",
  },
  dangerButton: {
    border: "1px solid #fecdd3",
    background: "#fff1f2",
    color: "#be123c",
    borderRadius: "999px",
    padding: "9px 13px",
    fontWeight: 900,
    cursor: "pointer",
  },
  refreshButton: {
    border: "none",
    background: "linear-gradient(135deg, #1e63ff, #0b58ff)",
    color: "#fff",
    borderRadius: "999px",
    padding: "12px 22px",
    fontWeight: 900,
    cursor: "pointer",
    marginBottom: "18px",
  },
  error: {
    marginBottom: "14px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    color: "#be123c",
    fontWeight: 800,
  },
  success: {
    marginBottom: "14px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    color: "#047857",
    fontWeight: 800,
  },
};

export default function AdminSorteios() {
  const [draws, setDraws] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  async function loadDraws() {
    try {
      setLoading(true);
      setError("");

      const data = await getDrawsHistory();
      setDraws(data?.draws || []);
    } catch (err) {
      setError(err.message || "Erro ao carregar sorteios.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadDraws();
  }, []);

  async function handleStatus(id, status) {
    const label = status === "open" ? "ativar" : "encerrar";

    const confirmAction = window.confirm(
      `Tem certeza que deseja ${label} o sorteio #${id}?`
    );

    if (!confirmAction) return;

    try {
      setActionLoading(`${id}-${status}`);
      setError("");
      setMessage("");

      await setDrawStatus(id, status);

      setMessage(
        status === "open"
          ? `Sorteio #${id} definido como ativo.`
          : `Sorteio #${id} encerrado.`
      );

      await loadDraws();
    } catch (err) {
      setError(err.message || "Erro ao alterar status do sorteio.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <h1 style={styles.title}>Sorteios realizados</h1>
        <p style={styles.subtitle}>
          Histórico de sorteios, status e organização dos sorteios criados.
        </p>

        <button style={styles.refreshButton} onClick={loadDraws} disabled={loading}>
          {loading ? "CARREGANDO..." : "ATUALIZAR LISTA"}
        </button>

        {error ? <div style={styles.error}>{error}</div> : null}
        {message ? <div style={styles.success}>{message}</div> : null}

        <section style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nº SORTEIO</th>
                <th style={styles.th}>NOME / ITEM</th>
                <th style={styles.th}>STATUS</th>
                <th style={styles.th}>VALOR</th>
                <th style={styles.th}>VENDIDOS</th>
                <th style={styles.th}>RESTANTES</th>
                <th style={styles.th}>ABERTURA</th>
                <th style={styles.th}>FECHAMENTO</th>
                <th style={styles.th}>AÇÕES</th>
              </tr>
            </thead>

            <tbody>
              {draws.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={9}>
                    Nenhum sorteio encontrado.
                  </td>
                </tr>
              ) : (
                draws.map((draw) => {
                  const currentStatus = String(draw.status || "").toLowerCase();
                  const isOpen = ["open", "active", "aberto", "ativo"].includes(
                    currentStatus
                  );

                  return (
                    <tr key={draw.id}>
                      <td style={styles.td}>
                        <strong>#{draw.id}</strong>
                      </td>

                      <td style={styles.td}>
                        <strong>
                          {draw.title || draw.prize_title || `Sorteio #${draw.id}`}
                        </strong>
                        {draw.promo_text ? (
                          <div style={{ color: "#64748b", marginTop: 4 }}>
                            {draw.promo_text}
                          </div>
                        ) : null}
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            ...(isOpen ? styles.activeBadge : styles.closedBadge),
                          }}
                        >
                          {statusLabel(draw.status)}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {formatMoney(draw.ticket_price_cents)}
                      </td>

                      <td style={styles.td}>
                        <strong>{draw.sold_numbers || 0}</strong>
                      </td>

                      <td style={styles.td}>
                        <strong>{draw.remaining_numbers || 0}</strong>
                      </td>

                      <td style={styles.td}>
                        {formatDate(draw.opened_at)}
                      </td>

                      <td style={styles.td}>
                        {formatDate(draw.closed_at)}
                      </td>

                      <td style={styles.td}>
                        {!isOpen ? (
                          <button
                            style={styles.button}
                            disabled={actionLoading === `${draw.id}-open`}
                            onClick={() => handleStatus(draw.id, "open")}
                          >
                            {actionLoading === `${draw.id}-open`
                              ? "ATIVANDO..."
                              : "ATIVAR"}
                          </button>
                        ) : null}

                        {isOpen ? (
                          <button
                            style={styles.dangerButton}
                            disabled={actionLoading === `${draw.id}-closed`}
                            onClick={() => handleStatus(draw.id, "closed")}
                          >
                            {actionLoading === `${draw.id}-closed`
                              ? "ENCERRANDO..."
                              : "ENCERRAR"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
