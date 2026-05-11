import React from "react";
import { Link, useParams } from "react-router-dom";
import PromocionalNumbersGrid from "../components/PromocionalNumbersGrid";
import {
  adminGetPromocionalDraw,
  adminGetPromocionalNumbers,
  adminUpdatePromocionalNumberStatus,
} from "../services/promocionalApi";

const NUMBER_STATUS_OPTIONS = [
  { value: "available", label: "Disponivel" },
  { value: "reserved", label: "Reservado" },
  { value: "sold", label: "Vendido" },
  { value: "blocked", label: "Bloqueado" },
];

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

export default function PromocionalNumbersManager() {
  const { id } = useParams();
  const [draw, setDraw] = React.useState(null);
  const [numbers, setNumbers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingNumber, setUpdatingNumber] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  async function loadNumbers() {
    try {
      setLoading(true);
      setError("");
      const [drawPayload, numbersPayload] = await Promise.all([
        adminGetPromocionalDraw(id),
        adminGetPromocionalNumbers(id),
      ]);
      setDraw(drawPayload?.draw || drawPayload?.data || drawPayload);
      setNumbers(asList(numbersPayload));
    } catch (err) {
      setError(err?.message || "Nao foi possivel carregar os numeros promocionais.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeNumberStatus(number, status) {
    try {
      setUpdatingNumber(String(number));
      setError("");
      setMessage("");
      await adminUpdatePromocionalNumberStatus(id, number, status);
      setNumbers((current) =>
        current.map((item) => {
          if (String(getNumberValue(item)) !== String(number)) return item;
          return typeof item === "object" && item !== null
            ? { ...item, status }
            : { number: item, status };
        })
      );
      setMessage("Status do numero atualizado.");
    } catch (err) {
      setError(err?.message || "Nao foi possivel atualizar o numero.");
    } finally {
      setUpdatingNumber("");
    }
  }

  return (
    <section className="promocional-admin-section">
      <Link className="promocional-back-link" to="/promocional/admin">
        ← Voltar para campanhas
      </Link>

      <div className="promocional-admin-toolbar">
        <div>
          <h2>Numeros promocionais</h2>
          <p>{draw?.title || draw?.name || "Gerencie bloqueios, reservas e vendas."}</p>
        </div>
      </div>

      {loading && <p className="promocional-info">Carregando numeros...</p>}
      {error && <p className="promocional-error">{error}</p>}
      {message && <p className="promocional-success">{message}</p>}

      {!loading && (
        <PromocionalNumbersGrid
          numbers={numbers}
          readOnly
          renderActions={(item, number, status) => (
            <select
              value={status}
              disabled={updatingNumber === String(number)}
              onChange={(event) => changeNumberStatus(number, event.target.value)}
              aria-label={`Alterar status do numero ${number}`}
            >
              {NUMBER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        />
      )}
    </section>
  );
}
