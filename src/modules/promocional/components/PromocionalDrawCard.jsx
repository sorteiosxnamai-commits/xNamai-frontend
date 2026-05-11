import React from "react";
import PromocionalStatusBadge from "./PromocionalStatusBadge";

function formatMoney(cents) {
  const value = Number(cents || 0) / 100;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PromocionalDrawCard({ draw, onParticipate, children }) {
  const title = draw?.title || draw?.name || "Sorteio promocional";
  const description = draw?.description || "";
  const prize = draw?.prize || draw?.award || "";
  const start = draw?.number_start ?? draw?.numberStart;
  const end = draw?.number_end ?? draw?.numberEnd;
  const price = draw?.price_cents ?? draw?.priceCents;
  const hasRange = start !== undefined && end !== undefined;

  return (
    <article className="promocional-card">
      <div className="promocional-card-top">
        <div>
          <p className="promocional-eyebrow">Campanha promocional</p>
          <h3 className="promocional-card-title">{title}</h3>
        </div>
        <PromocionalStatusBadge status={draw?.status || "active"} />
      </div>

      {description && <p className="promocional-card-description">{description}</p>}
      {prize && <p className="promocional-card-prize">Premio: {prize}</p>}

      <div className="promocional-card-meta">
        {hasRange && (
          <span>
            Numeros {start} a {end}
          </span>
        )}
        {price !== undefined && <span>{formatMoney(price)} por numero</span>}
      </div>

      {onParticipate && (
        <button type="button" className="promocional-primary-button" onClick={onParticipate}>
          Participar
        </button>
      )}

      {children}
    </article>
  );
}
