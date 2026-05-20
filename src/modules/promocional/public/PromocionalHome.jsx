import React from "react";
import { useNavigate } from "react-router-dom";
import PublicTopbar from "../../../components/PublicTopbar";
import PromocionalStatusBadge from "../components/PromocionalStatusBadge";
import { getPromocionalDraws } from "../services/promocionalApi";

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.draws || payload?.items || payload?.data || [];
}

function getDrawId(draw) {
  return draw?.id ?? draw?._id ?? draw?.draw_id;
}

function isActiveDraw(draw) {
  const status = String(draw?.status || "active").trim().toLowerCase();
  return ["active", "ativo", "open", "published"].includes(status);
}

export default function PromocionalHome() {
  const navigate = useNavigate();
  const [draws, setDraws] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;

    async function loadDraws() {
      try {
        setLoading(true);
        setError("");
        const payload = await getPromocionalDraws();
        if (active) setDraws(asList(payload).filter(isActiveDraw));
      } catch (err) {
        if (active) setError(err?.message || "Nao foi possivel carregar os sorteios promocionais.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDraws();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PublicTopbar />
      <main className="promocional-page">
        <section className="promocional-hero">
          <p className="promocional-eyebrow">xNaMai Promocional</p>
          <h1>Sorteios promocionais</h1>
          <p>
            Campanhas promocionais em que o administrador libera uma quantidade de números
            para cada participante escolher.
          </p>
        </section>

        {loading && <p className="promocional-info">Carregando sorteios promocionais...</p>}
        {error && <p className="promocional-error">{error}</p>}

        {!loading && !error && draws.length === 0 && (
          <p className="promocional-empty">Nenhum sorteio promocional ativo no momento.</p>
        )}

        <section className="promocional-list">
          {draws.map((draw) => {
            const id = getDrawId(draw);
            const title = draw?.title || draw?.name || "Sorteio promocional";
            const description = draw?.description || "";
            const prize = draw?.prize || draw?.award || "";

            return (
              <article key={String(id)} className="promocional-card">
                <div className="promocional-card-top">
                  <div>
                    <p className="promocional-eyebrow">Campanha promocional</p>
                    <h3 className="promocional-card-title">{title}</h3>
                  </div>
                  <PromocionalStatusBadge status={draw?.status || "active"} />
                </div>

                {description && <p className="promocional-card-description">{description}</p>}
                {prize && <p className="promocional-card-prize">Prêmio: {prize}</p>}

                <button
                  type="button"
                  className="promocional-primary-button"
                  onClick={() => navigate(`/promocional/${id}`)}
                >
                  Ver campanha
                </button>
              </article>
            );
          })}
        </section>
      </main>
    </>
  );
}
