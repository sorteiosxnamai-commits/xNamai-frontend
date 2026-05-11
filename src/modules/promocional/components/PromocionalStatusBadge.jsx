import React from "react";

const STATUS_LABELS = {
  active: "Ativo",
  inactive: "Inativo",
  closed: "Encerrado",
  draft: "Rascunho",
  available: "Disponivel",
  reserved: "Reservado",
  sold: "Vendido",
  blocked: "Bloqueado",
};

export default function PromocionalStatusBadge({ status }) {
  const normalized = String(status || "inactive").trim().toLowerCase();
  const label = STATUS_LABELS[normalized] || normalized;

  return (
    <span className={`promocional-status promocional-status--${normalized}`}>
      {label}
    </span>
  );
}
