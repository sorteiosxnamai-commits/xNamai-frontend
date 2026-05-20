import React from "react";
import { Link, useParams } from "react-router-dom";
import { adminGetPromocionalParticipants } from "../services/promocionalApi";
import { formatPromocionalNumber } from "../utils/promocionalNumbers";

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.participants || payload?.items || payload?.data || [];
}

function formatNumbers(value) {
  const numbers = Array.isArray(value) ? value : value ? String(value).split(",") : [];
  return numbers.map((item) => formatPromocionalNumber(item)).join(", ");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

export default function PromocionalParticipants() {
  const { id } = useParams();
  const [participants, setParticipants] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;

    async function loadParticipants() {
      try {
        setLoading(true);
        setError("");
        const payload = await adminGetPromocionalParticipants(id);
        if (active) setParticipants(asList(payload));
      } catch (err) {
        if (active) setError(err?.message || "Nao foi possivel carregar os participantes.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadParticipants();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <section className="promocional-admin-section">
      <Link className="promocional-back-link" to="/promocional/admin">
        ← Voltar para campanhas
      </Link>

      <div className="promocional-admin-toolbar">
        <div>
          <h2>Participantes</h2>
          <p>Participantes, liberações e números escolhidos neste sorteio promocional.</p>
        </div>
      </div>

      {loading && <p className="promocional-info">Carregando participantes...</p>}
      {error && <p className="promocional-error">{error}</p>}
      {!loading && !error && participants.length === 0 && (
        <p className="promocional-empty">Nenhum participante encontrado.</p>
      )}

      {!loading && participants.length > 0 && (
        <div className="promocional-table-wrap">
          <table className="promocional-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Liberados</th>
                <th>Escolhidos</th>
                <th>Restantes</th>
                <th>Números</th>
                <th>Origem</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant, index) => (
                <tr key={participant?.id || participant?._id || index}>
                  <td>
                    {participant?.name ||
                      participant?.buyer_name ||
                      participant?.nome ||
                      "-"}
                  </td>
                  <td>{participant?.email || participant?.buyer_email || "-"}</td>
                  <td>
                    {participant?.phone ||
                      participant?.buyer_phone ||
                      participant?.telefone ||
                      "-"}
                  </td>
                  <td>
                    {participant?.allowed_quantity ??
                      participant?.allowedQuantity ??
                      "-"}
                  </td>
                  <td>
                    {participant?.claimed_quantity ??
                      participant?.claimedQuantity ??
                      "-"}
                  </td>
                  <td>
                    {participant?.remaining_quantity ??
                      participant?.remainingQuantity ??
                      "-"}
                  </td>
                  <td>
                    {formatNumbers(
                      participant?.numbers ||
                        participant?.selected_numbers ||
                        participant?.claimed_numbers ||
                        participant?.numeros
                    ) || "-"}
                  </td>
                  <td>
                    {participant?.source_label || "Liberação promocional"}
                  </td>
                  <td>
                    {participant?.status_label ||
                      (Number(participant?.remaining_quantity ?? participant?.remainingQuantity ?? 0) > 0
                        ? "Ativo"
                        : "Concluído")}
                  </td>
                  <td>
                    {formatDate(
                      participant?.created_at ||
                        participant?.createdAt ||
                        participant?.date
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
