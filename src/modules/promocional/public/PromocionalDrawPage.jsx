import React from "react";
import { Link, useParams } from "react-router-dom";
import PromocionalNumbersGrid from "../components/PromocionalNumbersGrid";
import {
  getPromocionalDraw,
  getPromocionalNumbers,
  reservePromocionalNumbers,
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

export default function PromocionalDrawPage() {
  const { id } = useParams();
  const [draw, setDraw] = React.useState(null);
  const [numbers, setNumbers] = React.useState([]);
  const [selectedNumbers, setSelectedNumbers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const maxNumbers = Number.parseInt(draw?.max_numbers_per_user ?? draw?.maxNumbersPerUser ?? 0, 10);

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
    if (!selectedNumbers.length) {
      setError("Selecione pelo menos um numero disponivel.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      await reservePromocionalNumbers(id, { numbers: selectedNumbers.map(getNumberValue) });
      setSelectedNumbers([]);
      setMessage("Numeros reservados com sucesso.");
      await loadDraw();
    } catch (err) {
      setError(err?.message || "Nao foi possivel reservar os numeros selecionados.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="promocional-page">
      <Link className="promocional-back-link" to="/promocional">
        ← Voltar para promocionais
      </Link>

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
              disabled={saving || !selectedNumbers.length}
            >
              {saving ? "Reservando..." : "Reservar / continuar"}
            </button>
          </section>
        </>
      )}
    </main>
  );
}
