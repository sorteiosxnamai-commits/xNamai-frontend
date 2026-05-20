import React from "react";
import {
  formatPromocionalNumber,
  normalizePromocionalNumberStatus,
} from "../utils/promocionalNumbers";

function getNumberValue(item) {
  if (typeof item === "object" && item !== null) {
    return item.number ?? item.n ?? item.value ?? item.numero;
  }

  return item;
}

function getNumberStatus(item) {
  const rawStatus =
    typeof item === "object" && item !== null
      ? item.reserved
        ? "reserved"
        : item.unavailable
          ? "unavailable"
          : item.status
      : "available";
  const normalized = normalizePromocionalNumberStatus(rawStatus);

  if (normalized === "sold" || normalized === "blocked" || normalized === "unavailable") {
    return "unavailable";
  }

  if (normalized === "reserved") {
    return "reserved";
  }

  return "available";
}

export default function PromocionalNumbersGrid({
  numbers = [],
  selectedNumbers = [],
  onToggleNumber,
  readOnly = false,
  renderActions,
}) {
  const selectedSet = new Set(selectedNumbers.map((item) => String(item)));

  if (!numbers.length) {
    return <p className="promocional-empty">Nenhum numero encontrado.</p>;
  }

  return (
    <div className="promocional-grid">
      {numbers.map((item) => {
        const rawNumber = getNumberValue(item);
        const displayNumber = formatPromocionalNumber(rawNumber);
        const status = getNumberStatus(item);
        const isAvailable = status === "available";
        const isSelected = selectedSet.has(String(rawNumber));
        const isMine = readOnly && isSelected;
        const buttonDisabled = readOnly || !isAvailable || !onToggleNumber;

        return (
          <div className="promocional-number-wrap" key={String(rawNumber)}>
            <button
              type="button"
              className={[
                "promocional-number",
                `promocional-number--${status}`,
                status,
                isMine ? "promocional-number--mine" : "",
                isSelected && !isMine ? "promocional-number--selected selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={buttonDisabled}
              onClick={() => onToggleNumber?.(rawNumber, item)}
              title={isMine ? "Meu número" : status}
            >
              {displayNumber}
            </button>
            {renderActions && (
              <div className="promocional-number-actions">
                {renderActions(item, rawNumber, status)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
