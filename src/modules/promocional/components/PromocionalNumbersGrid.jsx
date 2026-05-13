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
  const rawStatus = typeof item === "object" && item !== null ? item.status : "available";
  const normalized = normalizePromocionalNumberStatus(rawStatus);

  if (normalized === "sold" || normalized === "blocked") {
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
        const buttonDisabled = readOnly || !isAvailable || !onToggleNumber;

        return (
          <div className="promocional-number-wrap" key={String(rawNumber)}>
            <button
              type="button"
              className={[
                "promocional-number",
                `promocional-number--${status}`,
                status,
                isSelected ? "promocional-number--selected selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={buttonDisabled}
              onClick={() => onToggleNumber?.(rawNumber, item)}
              title={status}
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
