import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../authContext";
import PublicTopbar from "../../../components/PublicTopbar";
import PromocionalNumbersGrid from "../components/PromocionalNumbersGrid";
import {
  getPromocionalDraw,
  getPromocionalNumbers,
  reservePromotionalNumbers,
} from "../services/promocionalApi";
import { isPromocionalNumberAvailable } from "../utils/promocionalNumbers";

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.numbers || payload?.items || payload?.data || [];
}

function getNumberValue(item) {
  if (typeof item === "object" && item !== null) {
    return item.number ?? item.n ?? item.value ?? item.numero;
  }

  return item;
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

function getStoredPromocionalToken() {
  try {
    return (
      localStorage.getItem("ns_auth_token") ||
      sessionStorage.getItem("ns_auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      ""
    ).replace(/^Bearer\s+/i, "");
  } catch {
    return "";
  }
}

export default function PromocionalDrawPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();
  const [draw, setDraw] = React.useState(null);
  const [numbers, setNumbers] = React.useState([]);
  const [selectedNumbers, setSelectedNumbers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const maxNumbers = Number.parseInt(draw?.max_numbers_per_user ?? draw?.maxNumbersPerUser ?? 0, 10);

  function saveReturnRouteAndGoLogin() {
    localStorage.setItem("xnamai_after_login", window.location.pathname + window.location.search);
    navigate("/login");
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
      setError(err?.message || "Nao foi possivel carregar este sorteio promocional.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadDraw();
  }, [loadDraw]);

  React.useEffect(() => {
    if (!selectedNumbers.length || !numbers.length) return;

    const availableNumbers = new Set(
      numbers
        .filter((item) => isPromocionalNumberAvailable(item))
        .map((item) => String(getNumberValue(item)))
    );

    setSelectedNumbers((current) =>
      current.filter((number) => availableNumbers.has(String(number)))
    );
  }, [numbers, selectedNumbers.length]);

  function toggleNumber(rawNumber, item) {
    if (!isPromocionalNumberAvailable(item)) return;

    setMessage("");
    setSelectedNumbers((current) => {
      const key = String(rawNumber);
      if (current.some((value) => String(value) === key)) {
        return current.filter((value) => String(value) !== key);
      }

      if (maxNumbers > 0 && current.length >= maxNumbers) {
        setError(`Voce pode escolher no maximo ${maxNumbers} numero(s).`);
        return current;
      }

      setError("");
      return [...current, rawNumber];
    });
  }

  async function handleReserve() {
    if (authLoading) return;
    const drawId = id;

    if (!user && !token && !getStoredPromocionalToken()) {
      setMessage("");
      saveReturnRouteAndGoLogin();
      return;
    }

    if (!selectedNumbers.length) {
      setError("Selecione pelo menos um numero disponivel.");
      return;
    }

    const availableNumbers = new Set(
      numbers
        .filter((item) => isPromocionalNumberAvailable(item))
        .map((item) => String(getNumberValue(item)))
    );
    const numbersToReserve = selectedNumbers
      .map(getNumberValue)
      .filter((number) => availableNumbers.has(String(number)));

    if (numbersToReserve.length !== selectedNumbers.length) {
      setSelectedNumbers(numbersToReserve);
      setError("Alguns numeros selecionados nao estao mais disponiveis.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      await reservePromotionalNumbers(drawId, numbersToReserve);
      setSelectedNumbers([]);
      setMessage("Reserva criada. Você pode gerar o PIX agora ou pagar depois em Minha Conta.");
      await loadDraw();
    } catch (error) {
      console.error("[PROMOCIONAL_FRONT_ERROR]", {
        message: error?.message,
        drawId,
        selectedNumbers: numbersToReserve,
      });
      if (error?.status === 401 || /(^|:)401$/.test(String(error?.message || ""))) {
        saveReturnRouteAndGoLogin();
        return;
      }
      setError(error?.message || "Não foi possível reservar os números promocionais.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PublicTopbar />
      <main className="promocional-page">
        {!authLoading && !user && (
          <p className="promocional-error promocional-login-hint" role="status">
            Para reservar números promocionais, entre ou crie uma conta.
          </p>
        )}
        {loading && <p className="promocional-info">Carregando sorteio promocional...</p>}
        {!loading && error && !draw && <p className="promocional-error">{error}</p>}

        {!loading && draw && (
          <>
            <section className="promocional-hero promocional-hero--compact">
              <p className="promocional-eyebrow">xNaMai Promocional</p>
              <h1>{draw.title || draw.name || "Sorteio promocional"}</h1>
              {draw.description && <p>{draw.description}</p>}
              {(draw.prize || draw.award) && (
                <strong className="promocional-prize">Premio: {draw.prize || draw.award}</strong>
              )}
            </section>

            <section className="promocional-panel">
              <div className="promocional-panel-heading">
                <div>
                  <h2>Escolha seus numeros</h2>
                  <p>Numeros reservados, vendidos ou bloqueados nao podem ser selecionados.</p>
                </div>
                <span className="promocional-selected-count">
                  {selectedNumbers.length} selecionado(s)
                </span>
              </div>

              {error && <p className="promocional-error">{error}</p>}
              {message && <p className="promocional-success">{message}</p>}

              <PromocionalNumbersGrid
                numbers={numbers}
                selectedNumbers={selectedNumbers}
                onToggleNumber={toggleNumber}
              />

              <button
                type="button"
                className="promocional-primary-button promocional-primary-button--wide"
                onClick={handleReserve}
                disabled={saving || authLoading || !selectedNumbers.length}
              >
                {saving ? "Reservando..." : "Reservar / continuar"}
              </button>
            </section>
          </>
        )}
      </main>

    </>
  );
}
