import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../authContext";
import PublicTopbar from "../../../components/PublicTopbar";
import PromocionalNumbersGrid from "../components/PromocionalNumbersGrid";
import {
  claimPromocionalNumbers,
  getMyPromocionalAllowance,
  getPromocionalDraw,
  getPromocionalNumbers,
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
    is_available: true,
    is_occupied: false,
  }));
}

function normalizeAllowance(payload) {
  const data =
    payload?.allowance ||
    payload?.data?.allowance ||
    (payload?.allowed_quantity != null || payload?.allowedQuantity != null
      ? payload
      : null) ||
    payload?.data ||
    null;

  if (!data) return null;

  const allowedQuantity = Number(
    data.allowed_quantity ?? data.allowedQuantity ?? 0
  );
  const claimedQuantity = Number(
    data.claimed_quantity ?? data.claimedQuantity ?? 0
  );
  const remainingQuantity = Number(
    data.remaining_quantity ??
      data.remainingQuantity ??
      Math.max(0, allowedQuantity - claimedQuantity)
  );

  const numbers = Array.isArray(data.numbers)
    ? data.numbers
    : Array.isArray(data.claimed_numbers)
      ? data.claimed_numbers
      : [];

  return {
    allowed_quantity: allowedQuantity,
    claimed_quantity: claimedQuantity,
    remaining_quantity: remainingQuantity,
    numbers,
    status: data.status || (allowedQuantity > 0 ? "active" : "inactive"),
  };
}

function mapPromocionalError(err, fallback) {
  if (err?.status >= 500) {
    return "Não foi possível carregar os dados promocionais agora. Tente novamente em instantes.";
  }

  if (err?.code === "promotional_allowance_limit_exceeded") {
    return "Você não pode escolher mais números do que a quantidade liberada pelo administrador.";
  }

  if (err?.code === "promotional_number_unavailable") {
    return "Um ou mais números selecionados já estão ocupados.";
  }

  if (
    err?.status === 404 ||
    err?.code === "promotional_allowance_not_found" ||
    err?.code === "promotional_no_allowance"
  ) {
    return "Você ainda não possui números liberados para este sorteio promocional.";
  }

  return (
    err?.response?.data?.message ||
    err?.data?.message ||
    err?.message ||
    fallback
  );
}

export default function PromocionalDrawPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [draw, setDraw] = React.useState(null);
  const [numbers, setNumbers] = React.useState([]);
  const [allowance, setAllowance] = React.useState(null);
  const [allowanceLoaded, setAllowanceLoaded] = React.useState(false);
  const [selectedNumbers, setSelectedNumbers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [claiming, setClaiming] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const remainingQuantity = Number(allowance?.remaining_quantity ?? 0);
  const effectiveRemaining = Math.max(0, remainingQuantity - selectedNumbers.length);
  const myNumbers = React.useMemo(
    () => (Array.isArray(allowance?.numbers) ? allowance.numbers : []),
    [allowance]
  );
  const hasAllowance = Number(allowance?.allowed_quantity ?? 0) > 0;
  const canChoose =
    Boolean(user) &&
    hasAllowance &&
    (effectiveRemaining > 0 || selectedNumbers.length > 0) &&
    !claiming &&
    !loading;

  function saveReturnRouteAndGoLogin() {
    const currentUrl = window.location.pathname + window.location.search;
    localStorage.setItem("xnamai_after_login", currentUrl);
    navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`);
  }

  const loadNumbers = React.useCallback(async () => {
    const numbersPayload = await getPromocionalNumbers(id);
    const loadedNumbers = asList(numbersPayload);
    setNumbers(loadedNumbers.length ? loadedNumbers : buildNumbersFromRange(draw));
  }, [draw, id]);

  const loadAllowance = React.useCallback(async () => {
    if (!user || !id) {
      setAllowance(null);
      setAllowanceLoaded(true);
      return;
    }

    try {
      const payload = await getMyPromocionalAllowance(id);
      setAllowance(normalizeAllowance(payload));
    } catch (err) {
      if (
        err?.status === 404 ||
        err?.code === "promotional_allowance_not_found" ||
        err?.code === "promotional_no_allowance"
      ) {
        setAllowance(null);
      } else if (err?.status !== 401) {
        setError(mapPromocionalError(err, "Não foi possível carregar sua cota promocional."));
      }
    } finally {
      setAllowanceLoaded(true);
    }
  }, [id, user]);

  const loadPage = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const drawPayload = await getPromocionalDraw(id);
      const drawData = drawPayload?.draw || drawPayload?.data || drawPayload;
      setDraw(drawData);

      const numbersPayload = await getPromocionalNumbers(id);
      const loadedNumbers = asList(numbersPayload);
      setNumbers(loadedNumbers.length ? loadedNumbers : buildNumbersFromRange(drawData));

      if (user) {
        setAllowanceLoaded(false);
        try {
          const allowancePayload = await getMyPromocionalAllowance(id);
          setAllowance(normalizeAllowance(allowancePayload));
        } catch (err) {
          if (
            err?.status === 404 ||
            err?.code === "promotional_allowance_not_found" ||
            err?.code === "promotional_no_allowance"
          ) {
            setAllowance(null);
          } else if (err?.status !== 401) {
            setError(mapPromocionalError(err, "Não foi possível carregar sua cota promocional."));
          }
        } finally {
          setAllowanceLoaded(true);
        }
      } else {
        setAllowance(null);
        setAllowanceLoaded(true);
      }
    } catch (err) {
      setError(mapPromocionalError(err, "Não foi possível carregar este sorteio promocional."));
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  React.useEffect(() => {
    if (authLoading) return;
    loadPage();
  }, [authLoading, loadPage]);

  React.useEffect(() => {
    if (authLoading || !user) return;
    loadAllowance();
  }, [authLoading, loadAllowance, user]);

  function handleToggleNumber(rawNumber) {
    if (!canChoose) return;

    const key = String(Number.parseInt(rawNumber, 10));
    if (!Number.isFinite(Number(key))) return;

    setSelectedNumbers((current) => {
      const exists = current.some((n) => String(n) === key);
      if (exists) {
        setError("");
        return current.filter((n) => String(n) !== key);
      }

      const slotsLeft = Math.max(0, remainingQuantity - current.length);
      if (slotsLeft <= 0) {
        setError(
          `Você só pode escolher mais ${Math.max(0, remainingQuantity - current.length)} número(s).`
        );
        return current;
      }

      setError("");
      return [...current, Number(key)];
    });
  }

  async function handleConfirmSelection() {
    if (!user) {
      saveReturnRouteAndGoLogin();
      return;
    }

    if (!selectedNumbers.length) return;

    try {
      setClaiming(true);
      setError("");
      setMessage("");

      await claimPromocionalNumbers(id, selectedNumbers);

      setSelectedNumbers([]);
      setMessage("Números promocionais escolhidos com sucesso.");

      await Promise.all([loadNumbers(), loadAllowance()]);
    } catch (err) {
      if (err?.status === 401) {
        saveReturnRouteAndGoLogin();
        return;
      }
      setError(mapPromocionalError(err, "Não foi possível confirmar os números selecionados."));
    } finally {
      setClaiming(false);
    }
  }

  const myNumbersLabel =
    myNumbers.length > 0
      ? myNumbers.map((n) => formatPromocionalNumber(n)).join(", ")
      : "Nenhum ainda";

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
              <h1>{draw.title || draw.name || "Sorteio promocional"}</h1>
              <p>
                Esta é uma campanha promocional. Os números só podem ser escolhidos por
                usuários que receberam liberação do administrador.
              </p>
              {draw.description && <p>{draw.description}</p>}
              {(draw.prize || draw.award) && (
                <strong className="promocional-prize">
                  Prêmio: {draw.prize || draw.award}
                </strong>
              )}
            </section>

            <section className="promocional-panel promocional-allowance-card">
              {!authLoading && !user && (
                <div className="promocional-assignment-panel__content">
                  <p className="promocional-info">
                    Entre ou crie uma conta para verificar se você possui números liberados.
                  </p>
                  <button
                    type="button"
                    className="promocional-primary-button"
                    onClick={saveReturnRouteAndGoLogin}
                  >
                    Entrar para escolher meus números
                  </button>
                </div>
              )}

              {!authLoading && user && allowanceLoaded && !hasAllowance && (
                <div className="promocional-assignment-panel__content">
                  <p className="promocional-info">
                    Você ainda não possui números liberados para este sorteio promocional. Caso
                    tenha participado da promoção, aguarde a liberação pelo administrador.
                  </p>
                </div>
              )}

              {!authLoading && user && hasAllowance && (
                <div className="promocional-allowance-card__body">
                  <div className="promocional-quota-pills">
                    <span className="promocional-quota-pill">
                      Números liberados: <strong>{allowance.allowed_quantity}</strong>
                    </span>
                    <span className="promocional-quota-pill">
                      Números já escolhidos: <strong>{allowance.claimed_quantity}</strong>
                    </span>
                    <span className="promocional-quota-pill promocional-quota-pill--highlight">
                      Restantes para escolher: <strong>{allowance.remaining_quantity}</strong>
                    </span>
                  </div>

                  <p className="promocional-info">
                    Meus números: <strong>{myNumbersLabel}</strong>
                  </p>

                  {remainingQuantity > 0 ? (
                    <p className="promocional-success">
                      Você pode escolher mais {effectiveRemaining} número(s).
                    </p>
                  ) : (
                    <p className="promocional-info">
                      Você já escolheu todos os números liberados para esta campanha.
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="promocional-panel">
              <div className="promocional-panel-heading">
                <div>
                  <h2>Escolha seus números promocionais</h2>
                  <p>
                    Selecione na grade abaixo e confirme. Não há compra, reserva com PIX ou
                    checkout nesta campanha.
                  </p>
                </div>
                {selectedNumbers.length > 0 && (
                  <span className="promocional-selected-count">
                    {selectedNumbers.length} selecionado(s)
                  </span>
                )}
              </div>

              {error && <p className="promocional-error">{error}</p>}
              {message && <p className="promocional-success">{message}</p>}

              <PromocionalNumbersGrid
                numbers={numbers}
                selectedNumbers={selectedNumbers}
                myNumbers={myNumbers}
                onToggleNumber={handleToggleNumber}
                canChoose={canChoose}
                remainingQuantity={effectiveRemaining}
              />

              <p className="promocional-grid-legend">
                <span className="promocional-grid-legend__item promocional-grid-legend__item--mine">
                  Meu número
                </span>
                <span className="promocional-grid-legend__item promocional-grid-legend__item--selected">
                  Selecionado agora
                </span>
                <span className="promocional-grid-legend__item promocional-grid-legend__item--reserved">
                  Ocupado
                </span>
                <span className="promocional-grid-legend__item promocional-grid-legend__item--available">
                  Disponível
                </span>
              </p>

              <button
                type="button"
                className="promocional-primary-button promocional-primary-button--wide"
                onClick={handleConfirmSelection}
                disabled={claiming || !selectedNumbers.length || !user}
              >
                {claiming ? "Confirmando..." : "Confirmar números selecionados"}
              </button>
            </section>
          </>
        )}
      </main>
    </>
  );
}
