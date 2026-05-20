import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../authContext";
import PublicTopbar from "../../../components/PublicTopbar";
import PromocionalNumbersGrid from "../components/PromocionalNumbersGrid";
import {
  getMyPromocionalAssignment,
  getPromocionalDraw,
  getPromocionalNumbers,
  redeemPromocionalAssignment,
} from "../services/promocionalApi";
import { formatPromocionalNumber } from "../utils/promocionalNumbers";

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.numbers || payload?.items || payload?.data || [];
}

function buildNumbersFromRange(draw) {
  const start = Number.parseInt(draw?.number_start ?? draw?.numberStart, 10);
  const end = Number.parseInt(draw?.number_end ?? draw?.numberEnd, 10);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [];
  }

  return Array.from({ length: end - start + 1 }, (_, index) => ({
    number: start + index,
    status: "available",
  }));
}

function normalizeAssignment(payload) {
  const data =
    payload?.assignment ||
    payload?.data?.assignment ||
    (payload?.number != null || payload?.n != null ? payload : null) ||
    payload?.data ||
    null;

  if (!data) return null;

  const rawNumber =
    data.number ??
    data.n ??
    (Array.isArray(data.numbers) && data.numbers.length ? data.numbers[0] : null);

  const parsed = Number.parseInt(rawNumber, 10);
  if (!Number.isFinite(parsed)) return null;

  return {
    number: parsed,
    status_label: data.status_label || data.source_label || "Atribuído pelo admin",
    source_label: data.source_label || "Atribuído pelo admin",
    assigned_at:
      data.assigned_at ||
      data.assignedAt ||
      data.created_at ||
      data.createdAt ||
      data.redeemed_at ||
      data.redeemedAt ||
      null,
  };
}

function formatAssignmentDate(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export default function PromocionalDrawPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [draw, setDraw] = React.useState(null);
  const [numbers, setNumbers] = React.useState([]);
  const [assignment, setAssignment] = React.useState(null);
  const [assignmentLoaded, setAssignmentLoaded] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [redeeming, setRedeeming] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const myNumber = assignment?.number ?? null;
  const highlightedNumbers = myNumber != null ? [myNumber] : [];

  function saveReturnRouteAndGoLogin() {
    const currentUrl = window.location.pathname + window.location.search;
    localStorage.setItem("xnamai_after_login", currentUrl);
    navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`);
  }

  const loadDraw = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [drawPayload, numbersPayload] = await Promise.all([
        getPromocionalDraw(id),
        getPromocionalNumbers(id),
      ]);

      const drawData = drawPayload?.draw || drawPayload?.data || drawPayload;
      const loadedNumbers = asList(numbersPayload);

      setDraw(drawData);
      setNumbers(loadedNumbers.length ? loadedNumbers : buildNumbersFromRange(drawData));
    } catch (err) {
      setError(err?.message || "Não foi possível carregar este sorteio promocional.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadAssignment = React.useCallback(async () => {
    if (!user || !id) {
      setAssignment(null);
      setAssignmentLoaded(true);
      return;
    }

    try {
      setError("");
      const payload = await getMyPromocionalAssignment(id);
      setAssignment(normalizeAssignment(payload));
    } catch (err) {
      if (err?.status === 404 || err?.code === "promotional_assignment_not_found") {
        setAssignment(null);
      } else if (err?.status !== 401) {
        setError(err?.message || "Não foi possível carregar seu número promocional.");
      }
    } finally {
      setAssignmentLoaded(true);
    }
  }, [id, user]);

  React.useEffect(() => {
    loadDraw();
  }, [loadDraw]);

  React.useEffect(() => {
    if (authLoading) return;
    setAssignmentLoaded(false);
    loadAssignment();
  }, [authLoading, loadAssignment]);

  async function handleRefreshAssignment() {
    if (authLoading) return;

    if (!user) {
      setMessage("");
      setError("Entre ou crie uma conta para visualizar seu número promocional.");
      saveReturnRouteAndGoLogin();
      return;
    }

    try {
      setRedeeming(true);
      setError("");
      setMessage("");

      const payload = await redeemPromocionalAssignment(id);
      const next = normalizeAssignment(payload);

      if (next) {
        setAssignment(next);
        setMessage("Seu número promocional foi atualizado.");
      } else {
        await loadAssignment();
        setMessage("Consulta realizada. Nenhum número atribuído ainda.");
      }

      await loadDraw();
    } catch (err) {
      if (err?.status === 401) {
        saveReturnRouteAndGoLogin();
        return;
      }

      const apiMessage =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        "Não foi possível atualizar seu número promocional.";

      setError(apiMessage);
    } finally {
      setRedeeming(false);
    }
  }

  const assignedDateLabel = formatAssignmentDate(assignment?.assigned_at);

  return (
    <>
      <PublicTopbar />
      <main className="promocional-page">
        {loading && <p className="promocional-info">Carregando sorteio promocional...</p>}
        {!loading && error && !draw && <p className="promocional-error">{error}</p>}

        {!loading && draw && (
          <>
            <section className="promocional-hero promocional-hero--compact">
              <p className="promocional-eyebrow">xNaMai Promocional</p>
              <h1>Sorteio promocional</h1>
              <p>
                Este sorteio é uma campanha de resgate. Os números são atribuídos pelo
                administrador após a participação fora do site.
              </p>
              {draw.title && draw.title !== "Sorteio promocional" && (
                <strong className="promocional-prize">{draw.title}</strong>
              )}
              {draw.description && <p>{draw.description}</p>}
              {(draw.prize || draw.award) && (
                <strong className="promocional-prize">
                  Prêmio: {draw.prize || draw.award}
                </strong>
              )}
            </section>

            <section className="promocional-panel promocional-assignment-panel">
              {!authLoading && !user && (
                <div className="promocional-assignment-panel__content">
                  <p className="promocional-info">
                    Entre ou crie uma conta para visualizar seu número promocional.
                  </p>
                  <button
                    type="button"
                    className="promocional-primary-button"
                    onClick={saveReturnRouteAndGoLogin}
                  >
                    Entrar para ver meu número
                  </button>
                </div>
              )}

              {!authLoading && user && assignmentLoaded && !myNumber && (
                <div className="promocional-assignment-panel__content">
                  <p className="promocional-info">
                    Você ainda não possui número atribuído neste sorteio promocional. Caso já
                    tenha participado da promoção, aguarde a atribuição pelo administrador.
                  </p>
                  <button
                    type="button"
                    className="promocional-secondary-button"
                    onClick={handleRefreshAssignment}
                    disabled={redeeming}
                  >
                    {redeeming ? "Atualizando..." : "Atualizar meu número"}
                  </button>
                </div>
              )}

              {!authLoading && user && myNumber != null && (
                <div className="promocional-my-number-card">
                  <p className="promocional-my-number-card__eyebrow">Seu número promocional</p>
                  <div className="promocional-my-number-card__value">
                    {formatPromocionalNumber(myNumber)}
                  </div>
                  <span className="promocional-badge promocional-badge--admin">
                    {assignment?.status_label || "Atribuído pelo admin"}
                  </span>
                  {assignedDateLabel && (
                    <p className="promocional-my-number-card__date">
                      Atribuído em {assignedDateLabel}
                    </p>
                  )}
                  <button
                    type="button"
                    className="promocional-primary-button promocional-primary-button--wide"
                    onClick={handleRefreshAssignment}
                    disabled={redeeming}
                  >
                    {redeeming ? "Atualizando..." : "Atualizar meu número"}
                  </button>
                </div>
              )}
            </section>

            <section className="promocional-panel">
              <div className="promocional-panel-heading">
                <div>
                  <h2>Visualize sua participação</h2>
                  <p>
                    Os números promocionais são definidos pelo administrador. Você só pode
                    visualizar o número atribuído à sua conta.
                  </p>
                </div>
                {myNumber != null && (
                  <span className="promocional-selected-count promocional-selected-count--mine">
                    Meu número: {formatPromocionalNumber(myNumber)}
                  </span>
                )}
              </div>

              {error && <p className="promocional-error">{error}</p>}
              {message && <p className="promocional-success">{message}</p>}

              <PromocionalNumbersGrid
                numbers={numbers}
                selectedNumbers={highlightedNumbers}
                readOnly
              />

              <p className="promocional-grid-legend">
                <span className="promocional-grid-legend__item promocional-grid-legend__item--mine">
                  Meu número
                </span>
                <span className="promocional-grid-legend__item promocional-grid-legend__item--reserved">
                  Ocupado
                </span>
                <span className="promocional-grid-legend__item promocional-grid-legend__item--available">
                  Disponível
                </span>
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}
