import React from "react";
import { Link, useParams } from "react-router-dom";
import { getJSON } from "../../../lib/api";
import {
  adminAssignPromocionalNumbers,
  adminGetPromocionalAllowances,
  adminGetPromocionalDraw,
  adminGetPromocionalNumbers,
  adminUpdatePromocionalNumberStatus,
  adminUpsertPromocionalAllowance,
} from "../services/promocionalApi";
import {
  formatPromocionalNumber,
  isPromocionalNumberAvailable,
  normalizePromocionalNumberStatus,
} from "../utils/promocionalNumbers";

const EMPTY_ALLOWANCE_FORM = {
  user_id: "",
  allowed_quantity: "1",
  buyer_name: "",
  buyer_email: "",
  buyer_phone: "",
};

const EMPTY_ASSIGN_FORM = {
  user_id: "",
  number: "",
  buyer_name: "",
  buyer_email: "",
  buyer_phone: "",
};

function getNumberValue(item) {
  if (typeof item === "object" && item !== null) {
    return item.number ?? item.n ?? item.value ?? item.numero ?? item.label;
  }
  return item;
}

function asUsersList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.users || payload?.items || payload?.data || [];
}

function asAllowancesList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.allowances || payload?.items || payload?.data || [];
}

function getNumberStatusLabel(status, source) {
  const normalized = normalizePromocionalNumberStatus(status);
  const src = String(source || "").toLowerCase();

  if (src === "user" || src === "user_choice" || src === "claimed") {
    return normalized === "sold" ? "Ocupado" : "Escolhido pelo usuário";
  }

  if (src === "admin") {
    if (normalized === "reserved") return "Reservado";
    if (normalized === "sold") return "Ocupado";
    return "Atribuído pelo admin";
  }

  if (normalized === "available") return "Disponível";
  if (normalized === "reserved") return "Reservado";
  if (normalized === "sold") return "Ocupado";
  if (normalized === "blocked") return "Bloqueado";
  return String(status || "-");
}

function getOriginLabel(item) {
  const source = String(item?.source ?? item?.origin ?? "").toLowerCase();

  if (source === "user" || source === "user_choice" || source === "claimed") {
    return "Escolhido pelo usuário";
  }

  if (source === "allowance" || source === "promotional_allowance") {
    return "Liberação promocional";
  }

  if (source === "admin") return "Atribuído pelo admin";
  if (item?.source_label) return item.source_label;
  return source ? source : "-";
}

function getAllowanceStatusLabel(item) {
  if (item?.status_label) return item.status_label;
  const remaining = Number(item?.remaining_quantity ?? item?.remainingQuantity ?? 0);
  const allowed = Number(item?.allowed_quantity ?? item?.allowedQuantity ?? 0);
  if (allowed <= 0) return "Inativo";
  if (remaining <= 0) return "Concluído";
  return "Ativo";
}

function formatNumbersList(value) {
  const numbers = Array.isArray(value) ? value : value ? String(value).split(",") : [];
  return numbers.map((item) => formatPromocionalNumber(item)).join(", ") || "-";
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
  const [allowances, setAllowances] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [allowanceForm, setAllowanceForm] = React.useState(EMPTY_ALLOWANCE_FORM);
  const [assignForm, setAssignForm] = React.useState(EMPTY_ASSIGN_FORM);
  const [savingAllowance, setSavingAllowance] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);
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

      const [drawPayload, numbersResult, allowancesPayload] = await Promise.all([
        adminGetPromocionalDraw(drawId),
        adminGetPromocionalNumbers(drawId),
        adminGetPromocionalAllowances(drawId).catch(() => []),
      ]);

      setDraw(drawPayload?.draw || drawPayload?.data || drawPayload);
      setNumbers(Array.isArray(numbersResult) ? numbersResult : []);
      setAllowances(asAllowancesList(allowancesPayload));
    } catch (err) {
      console.error("[PROMOCIONAL_ADMIN_NUMBERS_ERROR]", err);
      setError(err?.message || "Erro ao carregar números promocionais.");
      setNumbers([]);
      setAllowances([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const payload = await getJSON("/admin/users");
      setUsers(asUsersList(payload));
    } catch (err) {
      console.error("[PROMOCIONAL_ADMIN_USERS_ERROR]", err);
    }
  }

  React.useEffect(() => {
    loadNumbers();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawId]);

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

  const availableNumbers = React.useMemo(
    () =>
      sortedNumbers.filter((item) => {
        const rawStatus =
          typeof item === "object" && item !== null ? item.status : "available";
        return isPromocionalNumberAvailable({ ...item, status: rawStatus });
      }),
    [sortedNumbers]
  );

  function updateAllowanceField(field, value) {
    setAllowanceForm((current) => ({ ...current, [field]: value }));
  }

  function updateAssignField(field, value) {
    setAssignForm((current) => ({ ...current, [field]: value }));
  }

  function handleAllowanceUserSelect(userId) {
    const selected = users.find(
      (item) => String(item.id ?? item.user_id ?? item._id) === String(userId)
    );

    if (!selected) {
      updateAllowanceField("user_id", userId);
      return;
    }

    setAllowanceForm((current) => ({
      ...current,
      user_id: String(selected.id ?? selected.user_id ?? selected._id ?? userId),
      buyer_name: selected.name || selected.nome || selected.full_name || current.buyer_name,
      buyer_email: selected.email || current.buyer_email,
      buyer_phone:
        selected.phone ||
        selected.telefone ||
        selected.whatsapp ||
        current.buyer_phone,
    }));
  }

  function handleAssignUserSelect(userId) {
    const selected = users.find(
      (item) => String(item.id ?? item.user_id ?? item._id) === String(userId)
    );

    if (!selected) {
      updateAssignField("user_id", userId);
      return;
    }

    setAssignForm((current) => ({
      ...current,
      user_id: String(selected.id ?? selected.user_id ?? selected._id ?? userId),
      buyer_name: selected.name || selected.nome || selected.full_name || current.buyer_name,
      buyer_email: selected.email || current.buyer_email,
      buyer_phone:
        selected.phone ||
        selected.telefone ||
        selected.whatsapp ||
        current.buyer_phone,
    }));
  }

  async function handleUpsertAllowance(event) {
    event.preventDefault();

    const userId = Number.parseInt(allowanceForm.user_id, 10);
    const allowedQuantity = Number.parseInt(allowanceForm.allowed_quantity, 10);

    if (!Number.isFinite(userId)) {
      setError("Selecione um usuário válido.");
      return;
    }

    if (!Number.isFinite(allowedQuantity) || allowedQuantity <= 0) {
      setError("Informe uma quantidade liberada maior que zero.");
      return;
    }

    try {
      setSavingAllowance(true);
      setError("");
      setMessage("");

      await adminUpsertPromocionalAllowance(drawId, {
        user_id: userId,
        allowed_quantity: allowedQuantity,
        buyer_name: allowanceForm.buyer_name.trim(),
        buyer_email: allowanceForm.buyer_email.trim(),
        buyer_phone: allowanceForm.buyer_phone.trim(),
      });

      setMessage("Quantidade liberada com sucesso.");
      setAllowanceForm(EMPTY_ALLOWANCE_FORM);
      await loadNumbers();
    } catch (err) {
      console.error("[PROMOCIONAL_ALLOWANCE_ERROR]", err);
      setError(err?.message || "Erro ao liberar quantidade promocional.");
    } finally {
      setSavingAllowance(false);
    }
  }

  async function handleAssignNumber(event) {
    event.preventDefault();

    const userId = Number.parseInt(assignForm.user_id, 10);
    const number = Number.parseInt(assignForm.number, 10);

    if (!Number.isFinite(userId)) {
      setError("Selecione um usuário válido.");
      return;
    }

    if (!Number.isFinite(number)) {
      setError("Selecione um número disponível.");
      return;
    }

    try {
      setAssigning(true);
      setError("");
      setMessage("");

      await adminAssignPromocionalNumbers(drawId, {
        user_id: userId,
        numbers: [number],
        buyer_name: assignForm.buyer_name.trim(),
        buyer_email: assignForm.buyer_email.trim(),
        buyer_phone: assignForm.buyer_phone.trim(),
        status: "reserved",
      });

      setMessage("Número promocional atribuído com sucesso.");
      setAssignForm(EMPTY_ASSIGN_FORM);
      await loadNumbers();
    } catch (err) {
      console.error("[PROMOCIONAL_ASSIGN_ERROR]", err);

      if (err?.code === "promotional_user_already_has_number") {
        setError("Este usuário já possui número atribuído neste sorteio promocional.");
        return;
      }

      const apiMessage = String(err?.message || "").toLowerCase();
      if (
        err?.code === "promotional_number_unavailable" ||
        apiMessage.includes("ocupad") ||
        apiMessage.includes("unavailable") ||
        apiMessage.includes("indispon")
      ) {
        setError("Este número já está ocupado.");
        return;
      }

      setError(err?.message || "Erro ao atribuir número promocional.");
    } finally {
      setAssigning(false);
    }
  }

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

  return (
    <section className="promocional-admin-section promocional-numbers-admin">
      <Link className="promocional-back-link" to="/promocional/admin">
        ← Voltar para campanhas
      </Link>

      <div className="promocional-admin-toolbar promocional-numbers-admin__toolbar">
        <div>
          <h2>Números promocionais</h2>
          <p>
            {draw?.title || draw?.name || "Libere cotas e acompanhe os números escolhidos."}
          </p>
        </div>
        <button
          type="button"
          className="promocional-secondary-button"
          onClick={() => loadNumbers()}
          disabled={loading || !drawId}
        >
          {loading ? "Atualizando…" : "Atualizar dados"}
        </button>
      </div>

      <form className="promocional-assign-panel" onSubmit={handleUpsertAllowance}>
        <h3>Liberar números para usuário</h3>
        <p className="promocional-assign-panel__hint">
          O participante escolherá os números na campanha, até a quantidade liberada.
        </p>

        <div className="promocional-assign-panel__grid">
          <label className="promocional-field">
            <span>Usuário</span>
            <select
              value={allowanceForm.user_id}
              onChange={(event) => handleAllowanceUserSelect(event.target.value)}
              required
            >
              <option value="">Selecione um usuário</option>
              {users.map((item) => {
                const userId = item.id ?? item.user_id ?? item._id;
                const label = `${item.name || item.nome || item.email || "Usuário"} (${item.email || userId})`;
                return (
                  <option key={String(userId)} value={String(userId)}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="promocional-field">
            <span>Quantidade de números liberados</span>
            <input
              type="number"
              min="1"
              value={allowanceForm.allowed_quantity}
              onChange={(event) => updateAllowanceField("allowed_quantity", event.target.value)}
              required
            />
          </label>

          <label className="promocional-field">
            <span>Nome</span>
            <input
              value={allowanceForm.buyer_name}
              onChange={(event) => updateAllowanceField("buyer_name", event.target.value)}
              placeholder="Nome do participante"
            />
          </label>

          <label className="promocional-field">
            <span>E-mail</span>
            <input
              type="email"
              value={allowanceForm.buyer_email}
              onChange={(event) => updateAllowanceField("buyer_email", event.target.value)}
              placeholder="email@exemplo.com"
            />
          </label>

          <label className="promocional-field">
            <span>Telefone</span>
            <input
              value={allowanceForm.buyer_phone}
              onChange={(event) => updateAllowanceField("buyer_phone", event.target.value)}
              placeholder="(11) 99999-9999"
            />
          </label>
        </div>

        <button
          type="submit"
          className="promocional-primary-button"
          disabled={savingAllowance || !drawId}
        >
          {savingAllowance ? "Liberando..." : "Liberar quantidade"}
        </button>
      </form>

      {error && <p className="promocional-error">{error}</p>}
      {message && <p className="promocional-success">{message}</p>}

      <div className="promocional-table-wrap promocional-allowances-table">
        <h3>Liberações promocionais</h3>
        <table className="promocional-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Liberados</th>
              <th>Escolhidos</th>
              <th>Restantes</th>
              <th>Números escolhidos</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>Carregando liberações…</td>
              </tr>
            ) : allowances.length === 0 ? (
              <tr>
                <td colSpan={7}>Nenhuma liberação registrada.</td>
              </tr>
            ) : (
              allowances.map((item, index) => (
                <tr key={item?.id || item?.user_id || index}>
                  <td>{item?.buyer_name || item?.name || item?.user_name || "-"}</td>
                  <td>{item?.buyer_email || item?.email || "-"}</td>
                  <td>{item?.allowed_quantity ?? item?.allowedQuantity ?? 0}</td>
                  <td>{item?.claimed_quantity ?? item?.claimedQuantity ?? 0}</td>
                  <td>{item?.remaining_quantity ?? item?.remainingQuantity ?? 0}</td>
                  <td>
                    {formatNumbersList(
                      item?.numbers || item?.claimed_numbers || item?.selected_numbers
                    )}
                  </td>
                  <td>{getAllowanceStatusLabel(item)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* BLOCO ANTIGO DE ATRIBUIÇÃO DIRETA OCULTO — regra atual é liberação de quantidade */}
      <div className="xnamai-hidden-legacy">
        <form className="promocional-assign-panel" onSubmit={handleAssignNumber}>
          <h3>Atribuir número promocional</h3>
          <p className="promocional-assign-panel__hint">
            Cada usuário pode receber no máximo 1 número por sorteio promocional.
          </p>

          <div className="promocional-assign-panel__grid">
            <label className="promocional-field">
              <span>Usuário</span>
              <select
                value={assignForm.user_id}
                onChange={(event) => handleAssignUserSelect(event.target.value)}
                required
              >
                <option value="">Selecione um usuário</option>
                {users.map((item) => {
                  const userId = item.id ?? item.user_id ?? item._id;
                  const label = `${item.name || item.nome || item.email || "Usuário"} (${item.email || userId})`;
                  return (
                    <option key={String(userId)} value={String(userId)}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="promocional-field">
              <span>Número</span>
              <select
                value={assignForm.number}
                onChange={(event) => updateAssignField("number", event.target.value)}
                required
              >
                <option value="">Selecione um número disponível</option>
                {availableNumbers.map((item) => {
                  const raw = getNumberValue(item);
                  return (
                    <option key={String(raw)} value={String(raw)}>
                      {formatPromocionalNumber(raw)}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="promocional-field">
              <span>Nome</span>
              <input
                value={assignForm.buyer_name}
                onChange={(event) => updateAssignField("buyer_name", event.target.value)}
              />
            </label>

            <label className="promocional-field">
              <span>E-mail</span>
              <input
                type="email"
                value={assignForm.buyer_email}
                onChange={(event) => updateAssignField("buyer_email", event.target.value)}
              />
            </label>

            <label className="promocional-field">
              <span>Telefone</span>
              <input
                value={assignForm.buyer_phone}
                onChange={(event) => updateAssignField("buyer_phone", event.target.value)}
              />
            </label>
          </div>

          <button type="submit" className="promocional-primary-button" disabled={assigning}>
            {assigning ? "Atribuindo..." : "Atribuir número"}
          </button>
        </form>
      </div>

      {!drawId && <p className="promocional-info">Sorteio não informado.</p>}

      {drawId && !loading && sortedNumbers.length === 0 && (
        <p className="promocional-empty">Nenhum número retornado pela API.</p>
      )}

      {drawId && (loading || sortedNumbers.length > 0) && (
        <div className="promocional-table-wrap promocional-numbers-admin__table-wrap">
          <h3>Grade de números</h3>
          <table className="promocional-table promocional-numbers-admin__table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Status</th>
                <th>Cliente</th>
                <th>E-mail</th>
                <th>Origem</th>
                <th>Data</th>
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
                  const source = String(item?.source ?? "").toLowerCase();
                  const unavailable = isNumberUnavailable(status);
                  const rowClass = unavailable
                    ? `promocional-numbers-admin__row promocional-numbers-admin__row--${status}`
                    : "promocional-numbers-admin__row";

                  const buyerName =
                    item?.buyer_name || item?.user_name || item?.name || "-";
                  const buyerEmail =
                    item?.buyer_email || item?.email || item?.user_email || "-";
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
                          {getNumberStatusLabel(rawStatus, source)}
                        </span>
                      </td>
                      <td>{buyerName}</td>
                      <td>{buyerEmail}</td>
                      <td>{getOriginLabel(item)}</td>
                      <td>{reservedAt}</td>
                      <td>
                        <div className="promocional-numbers-admin__actions">
                          {status !== "available" && (
                            <button
                              type="button"
                              className="promocional-numbers-admin__action-btn"
                              disabled={busy}
                              onClick={() => handleUpdateStatus(item, "available")}
                            >
                              Liberar
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
