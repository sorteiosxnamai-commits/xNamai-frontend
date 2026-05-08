import React, { useEffect, useState } from "react";
import { API_CONFIG } from "../config/api";

const API_BASE = String(API_CONFIG?.baseUrl || "").replace(/\/+$/, "");

function makeAdminDrawsUrl() {
  const baseHasApi = /\/api\/?$/i.test(API_BASE);
  if (!API_BASE) return "/api/admin/draws";
  return baseHasApi ? `${API_BASE}/admin/draws` : `${API_BASE}/api/admin/draws`;
}

function moneyFromCents(value) {
  const cents = Number(value || 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function statusLabel(status) {
  const value = String(status || "").toLowerCase();

  if (value === "open") return "Aberto";
  if (value === "closed") return "Fechado";
  if (value === "realized") return "Realizado";
  if (value === "draft") return "Rascunho";

  return status || "Aberto";
}

function dateLabel(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export default function AdminDrawsList({ compact = false }) {
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDraws() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(makeAdminDrawsUrl(), {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Não foi possível carregar os sorteios.");
      }

      setDraws(Array.isArray(data.draws) ? data.draws : []);
    } catch (error) {
      console.error("[AdminDrawsList] erro:", error);
      setMessage(error.message || "Erro ao carregar sorteios.");
      setDraws([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDraws();
  }, []);

  return (
    <div className="admin-draws-list">
      <div className="admin-draws-list__header">
        <div>
          <h3>{compact ? "Sorteios criados" : "Todos os sorteios criados"}</h3>
          <p>
            Acompanhe os sorteios criados, quantidade vendida, restantes e status.
          </p>
        </div>

        <button type="button" onClick={loadDraws} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {message && (
        <div className="admin-draws-list__error">
          {message}
        </div>
      )}

      <div className="admin-draws-list__table-wrap">
        <table className="admin-draws-list__table">
          <thead>
            <tr>
              <th>Nº Sorteio</th>
              <th>Produto</th>
              <th>Status</th>
              <th>Valor</th>
              <th>Vendidos</th>
              <th>Restantes</th>
              <th>GMV</th>
              <th>Aberto em</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8">Carregando sorteios...</td>
              </tr>
            ) : draws.length === 0 ? (
              <tr>
                <td colSpan="8">Nenhum sorteio criado ainda.</td>
              </tr>
            ) : (
              draws.map((draw) => (
                <tr key={draw.id}>
                  <td>#{draw.id}</td>
                  <td>
                    <strong>{draw.product_name || `Sorteio #${draw.id}`}</strong>
                    {draw.banner_title ? <small>{draw.banner_title}</small> : null}
                  </td>
                  <td>
                    <span className={`admin-draws-list__status admin-draws-list__status--${draw.status || "open"}`}>
                      {statusLabel(draw.status)}
                    </span>
                  </td>
                  <td>{moneyFromCents(draw.ticket_price_cents)}</td>
                  <td>{Number(draw.sold_numbers || 0)}</td>
                  <td>{Number(draw.remaining_numbers ?? 100)}</td>
                  <td>{moneyFromCents(draw.gmv_cents)}</td>
                  <td>{dateLabel(draw.opened_at || draw.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .admin-draws-list {
          width: 100%;
        }

        .admin-draws-list__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .admin-draws-list__header h3 {
          margin: 0;
          font-size: 18px;
          color: #071833;
          font-weight: 900;
        }

        .admin-draws-list__header p {
          margin: 6px 0 0;
          color: #526179;
          font-size: 14px;
        }

        .admin-draws-list__header button {
          border: 1px solid rgba(37, 99, 235, 0.25);
          background: #ffffff;
          color: #2563eb;
          padding: 10px 18px;
          border-radius: 999px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .admin-draws-list__header button:hover {
          background: #2563eb;
          color: #ffffff;
        }

        .admin-draws-list__header button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .admin-draws-list__error {
          margin-bottom: 14px;
          padding: 12px 14px;
          border-radius: 14px;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
          font-weight: 700;
        }

        .admin-draws-list__table-wrap {
          width: 100%;
          overflow-x: auto;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
        }

        .admin-draws-list__table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        .admin-draws-list__table th {
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: #475569;
          background: #f5f8ff;
          padding: 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .admin-draws-list__table td {
          padding: 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
          color: #0f172a;
          font-size: 14px;
          vertical-align: middle;
        }

        .admin-draws-list__table td strong {
          display: block;
          font-weight: 900;
          color: #071833;
        }

        .admin-draws-list__table td small {
          display: block;
          margin-top: 4px;
          color: #64748b;
        }

        .admin-draws-list__status {
          display: inline-flex;
          align-items: center;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          background: #e0ecff;
          color: #1d4ed8;
        }

        .admin-draws-list__status--closed {
          background: #f1f5f9;
          color: #475569;
        }

        .admin-draws-list__status--realized {
          background: #dcfce7;
          color: #047857;
        }

        .admin-draws-list__status--draft {
          background: #fef3c7;
          color: #b45309;
        }

        @media (max-width: 768px) {
          .admin-draws-list__header {
            align-items: flex-start;
            flex-direction: column;
          }

          .admin-draws-list__header button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

