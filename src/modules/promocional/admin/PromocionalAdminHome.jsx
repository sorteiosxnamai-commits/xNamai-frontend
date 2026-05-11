import React from "react";
import { Link } from "react-router-dom";
import PromocionalStatusBadge from "../components/PromocionalStatusBadge";
import {
  adminGetPromocionalDraws,
  adminUpdatePromocionalStatus,
} from "../services/promocionalApi";

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.draws || payload?.items || payload?.data || [];
}

function getDrawId(draw) {
  return draw?.id ?? draw?._id ?? draw?.draw_id;
}

function getDrawRange(draw) {
  const start = draw?.number_start ?? draw?.numberStart ?? "-";
  const end = draw?.number_end ?? draw?.numberEnd ?? "-";
  return `${start} a ${end}`;
}

export default function PromocionalAdminHome() {
  const [draws, setDraws] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState("");
  const [error, setError] = React.useState("");

  async function loadDraws() {
    try {
      setLoading(true);
      setError("");
      const payload = await adminGetPromocionalDraws();
      setDraws(asList(payload));
    } catch (err) {
      setError(err?.message || "Nao foi possivel carregar os sorteios promocionais.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadDraws();
  }, []);

  async function changeStatus(draw, status) {
    const id = getDrawId(draw);
    try {
      setUpdatingId(String(id));
      setError("");
      await adminUpdatePromocionalStatus(id, status);
      await loadDraws();
    } catch (err) {
      setError(err?.message || "Nao foi possivel atualizar o status.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <section className="promocional-admin-section">
      <div className="promocional-admin-toolbar">
        <div>
          <h2>Campanhas promocionais</h2>
          <p>Gerencie sorteios promocionais separados do sorteio principal.</p>
        </div>
        <Link className="promocional-primary-button" to="/promocional/admin/novo">
          Novo sorteio
        </Link>
      </div>

      {loading && <p className="promocional-info">Carregando campanhas...</p>}
      {error && <p className="promocional-error">{error}</p>}
      {!loading && !error && draws.length === 0 && (
        <p className="promocional-empty">Nenhum sorteio promocional cadastrado.</p>
      )}

      <div className="promocional-admin-list">
        {draws.map((draw) => {
          const id = getDrawId(draw);
          const currentStatus = String(draw?.status || "inactive").toLowerCase();
          const disabled = updatingId === String(id);

          return (
            <article className="promocional-admin-card" key={String(id)}>
              <div className="promocional-admin-card-main">
                <div>
                  <p className="promocional-eyebrow">Intervalo {getDrawRange(draw)}</p>
                  <h3>{draw?.title || draw?.name || "Sorteio promocional"}</h3>
                  {draw?.description && <p>{draw.description}</p>}
                </div>
                <PromocionalStatusBadge status={currentStatus} />
              </div>

              <div className="promocional-admin-actions">
                <Link to={`/promocional/admin/${id}`}>Editar</Link>
                <Link to={`/promocional/admin/${id}/numeros`}>Numeros</Link>
                <Link to={`/promocional/admin/${id}/participantes`}>Participantes</Link>
                <button
                  type="button"
                  disabled={disabled || currentStatus === "active"}
                  onClick={() => changeStatus(draw, "active")}
                >
                  Ativar
                </button>
                <button
                  type="button"
                  disabled={disabled || currentStatus === "inactive"}
                  onClick={() => changeStatus(draw, "inactive")}
                >
                  Inativar
                </button>
                <button
                  type="button"
                  disabled={disabled || currentStatus === "closed"}
                  onClick={() => changeStatus(draw, "closed")}
                >
                  Encerrar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
