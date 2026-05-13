import React from "react";
import { Link, useParams } from "react-router-dom";
import {
  adminGetPromocionalDraw,
  adminGetPromocionalNumbers,
  adminUpdatePromocionalNumberStatus,
} from "../services/promocionalApi";
import {
  formatPromocionalNumber,
  normalizePromocionalNumberStatus,
} from "../utils/promocionalNumbers";

function getNumberValue(item) {
  if (typeof item === "object" && item !== null) {
    return item.number ?? item.n ?? item.value ?? item.numero ?? item.label;
  }
  return item;
}

function getNumberStatusLabel(status) {
  const normalized = normalizePromocionalNumberStatus(status);
  if (normalized === "available") return "Disponível";
  if (normalized === "reserved") return "Reservado";
  if (normalized === "sold") return "Vendido";
  if (normalized === "blocked") return "Bloqueado";
  return String(status || "-");
}

function getPaymentStatusLabel(status) {
  if (!status) return "-";
  const s = String(status).toLowerCase();
  if (s === "pending") return "Pendente";
  if (s === "paid") return "Pago";
  if (s === "cancelled" || s === "canceled") return "Cancelado";
  if (s === "expired") return "Expirado";
  return String(status);
}

function isNumberUnavailable(status) {
  const normalized = normalizePromocionalNumberStatus(status);
  return ["reserved", "sold", "blocked"].includes(normalized);
}

function formatReservedAt(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR", {
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

export default function PromocionalNumbersManager() {
  const { id: drawId } = useParams();
  const [draw, setDraw] = React.useState(null);
  const [numbers, setNumbers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [updatingId, setUpdatingId] = React.useState(null);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  async function loadNumbers() {
    if (!drawId) return;
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [drawPayload, result] = await Promise.all([
        adminGetPromocionalDraw(drawId),
        adminGetPromocionalNumbers(drawId),
      ]);

      setDraw(drawPayload?.draw || drawPayload?.data || drawPayload);
      setNumbers(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("[PROMOCIONAL_ADMIN_NUMBERS_ERROR]", err);
      setError(err?.message || "Erro ao carregar números promocionais.");
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawId]);

  async function handleUpdateStatus(numberItem, nextStatus) {
    const n = numberItem?.n ?? numberItem?.number ?? numberItem?.value;
    if (n == null || String(n).trim() === "") return;

    try {
      setUpdatingId(String(n));
      setError("");
      setMessage("");

      await adminUpdatePromocionalNumberStatus(drawId, n, nextStatus);
      setMessage("Número atualizado.");
      await loadNumbers();
    } catch (err) {
      console.error("[PROMOCIONAL_UPDATE_NUMBER_ERROR]", err);
      setError(err?.message || "Erro ao atualizar número promocional.");
    } finally {
      setUpdatingId(null);
    }
  }

  const sortedNumbers = React.useMemo(() => {
    const list = [...numbers];
    list.sort((a, b) => {
      const na = Number(getNumberValue(a));
      const nb = Number(getNumberValue(b));
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(getNumberValue(a)).localeCompare(String(getNumberValue(b)));
    });
    return list;
  }, [numbers]);

  return (
    <section className="promocional-admin-section promocional-numbers-admin">
      <Link className="promocional-back-link" to="/promocional/admin">
        ← Voltar para campanhas
      </Link>

      <div className="promocional-admin-toolbar promocional-numbers-admin__toolbar">
        <div>
          <h2>Números promocionais</h2>
          <p>{draw?.title || draw?.name || "Gerencie bloqueios, reservas e vendas."}</p>
        </div>
        <button
          type="button"
          className="promocional-secondary-button"
          onClick={() => loadNumbers()}
          disabled={loading || !drawId}
        >
          {loading ? "Atualizando…" : "Atualizar tabela"}
        </button>
      </div>

      {error && <p className="promocional-error">{error}</p>}
      {message && <p className="promocional-success">{message}</p>}

      {!drawId && <p className="promocional-info">Sorteio não informado.</p>}

      {drawId && !loading && sortedNumbers.length === 0 && (
        <p className="promocional-empty">Nenhum número retornado pela API.</p>
      )}

      {drawId && (loading || sortedNumbers.length > 0) && (
        <div className="promocional-table-wrap promocional-numbers-admin__table-wrap">
          <table className="promocional-table promocional-numbers-admin__table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Status</th>
                <th>Cliente</th>
                <th>E-mail</th>
                <th>Pagamento</th>
                <th>Reservado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Carregando números…</td>
                </tr>
              ) : (
                sortedNumbers.map((item) => {
                  const raw = getNumberValue(item);
                  const displayNum = formatPromocionalNumber(raw);
                  const rawStatus =
                    typeof item === "object" && item !== null ? item.status : "available";
                  const status = normalizePromocionalNumberStatus(rawStatus);
                  const unavailable = isNumberUnavailable(status);
                  const rowClass = unavailable
                    ? `promocional-numbers-admin__row promocional-numbers-admin__row--${status}`
                    : "promocional-numbers-admin__row";

                  const buyerName =
                    item?.buyer_name || item?.user_name || item?.name || "-";
                  const buyerEmail =
                    item?.buyer_email || item?.email || item?.user_email || "-";
                  const paymentStatus = getPaymentStatusLabel(
                    item?.payment_status ?? item?.paymentStatus
                  );
                  const reservedAt = formatReservedAt(
                    item?.reserved_at ?? item?.reservedAt ?? item?.created_at
                  );
                  const busy = updatingId === String(raw);

                  return (
                    <tr key={String(raw)} className={rowClass}>
                      <td>
                        <strong>{displayNum}</strong>
                      </td>
                      <td>
                        <span
                          className={`promocional-status promocional-status--${status}`}
                        >
                          {getNumberStatusLabel(rawStatus)}
                        </span>
                      </td>
                      <td>{buyerName}</td>
                      <td>{buyerEmail}</td>
                      <td>{paymentStatus}</td>
                      <td>{reservedAt}</td>
                      <td>
                        <div className="promocional-numbers-admin__actions">
                          {status !== "available" && (
                            <button
                              type="button"
                              className="promocional-numbers-admin__action-btn"
                              disabled={busy}
                              onClick={() =>
                                handleUpdateStatus(item, "available")
                              }
                            >
                              Liberar
                            </button>
                          )}
                          {status !== "sold" && (
                            <button
                              type="button"
                              className="promocional-numbers-admin__action-btn"
                              disabled={busy}
                              onClick={() => handleUpdateStatus(item, "sold")}
                            >
                              Marcar vendido
                            </button>
                          )}
                          {status !== "blocked" && (
                            <button
                              type="button"
                              className="promocional-numbers-admin__action-btn promocional-numbers-admin__action-btn--danger"
                              disabled={busy}
                              onClick={() => handleUpdateStatus(item, "blocked")}
                            >
                              Bloquear
                            </button>
                          )}
                          {status === "available" && (
                            <button
                              type="button"
                              className="promocional-numbers-admin__action-btn"
                              disabled={busy}
                              onClick={() =>
                                handleUpdateStatus(item, "reserved")
                              }
                            >
                              Marcar reservado
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
