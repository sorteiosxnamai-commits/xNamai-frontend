import React from "react";
import {
  formatPromocionalNumber,
  isPromocionalNumberAvailable,
  normalizePromocionalNumberStatus,
} from "../utils/promocionalNumbers";

function getNumberValue(item) {
  if (typeof item === "object" && item !== null) {
    return item.number ?? item.n ?? item.value ?? item.numero;
  }
  return item;
}

function getComparableNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? String(parsed) : String(value);
}

function isNumberOccupied(item) {
  if (typeof item !== "object" || item === null) return false;
  if (item.is_occupied === true || item.occupied === true) return true;

  const status = normalizePromocionalNumberStatus(item.status);
  return ["reserved", "sold", "blocked", "unavailable"].includes(status);
}

function isNumberAvailable(item) {
  if (typeof item === "object" && item !== null) {
    if (item.is_available === false) return false;
    if (item.is_available === true) return true;
  }
  return isPromocionalNumberAvailable(item);
}

export default function PromocionalNumbersGrid({
  numbers = [],
  selectedNumbers = [],
  myNumbers = [],
  onToggleNumber,
  canChoose = false,
  remainingQuantity = 0,
  readOnly = false,
  renderActions,
}) {
  const selectedSet = new Set(selectedNumbers.map((item) => getComparableNumber(item)));
  const mySet = new Set(myNumbers.map((item) => getComparableNumber(item)));

  if (!numbers.length) {
    return <p className="promocional-empty">Nenhum numero encontrado.</p>;
  }

  return (
    <div className="promocional-grid">
      {numbers.map((item) => {
        const rawNumber = getNumberValue(item);
        const numberKey = getComparableNumber(rawNumber);
        const displayNumber = formatPromocionalNumber(rawNumber);
        const available = isNumberAvailable(item);
        const occupied = isNumberOccupied(item);
        const isMine = mySet.has(numberKey);
        const isSelected = selectedSet.has(numberKey);
        const isOccupiedByOther = occupied && !isMine;
        const isDisabled =
          readOnly ||
          !canChoose ||
          !available ||
          isOccupiedByOther ||
          (!isSelected && remainingQuantity <= 0);

        let visualClass = "promocional-number--available";
        if (isMine) visualClass = "promocional-number--mine";
        else if (isSelected) visualClass = "promocional-number--selected";
        else if (isOccupiedByOther) visualClass = "promocional-number--occupied";
        else if (!available || isDisabled) visualClass = "promocional-number--disabled";

        let title = "Disponível";
        if (isMine) title = "Meu número";
        else if (isSelected) title = "Selecionado";
        else if (isOccupiedByOther) title = "Ocupado";
        else if (!canChoose) title = "Seleção indisponível";

        return (
          <div className="promocional-number-wrap" key={numberKey}>
            <button
              type="button"
              className={[
                "promocional-number",
                visualClass,
                isDisabled ? "promocional-number--disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={isDisabled || !onToggleNumber}
              onClick={() => {
                if (!canChoose) return;
                if (!available) return;
                if (isOccupiedByOther) return;
                if (
                  !isSelected &&
                  remainingQuantity > 0 &&
                  selectedNumbers.length >= remainingQuantity
                ) {
                  return;
                }
                onToggleNumber?.(rawNumber, item);
              }}
              title={title}
            >
              {displayNumber}
            </button>
            {renderActions && (
              <div className="promocional-number-actions">
                {renderActions(item, rawNumber, visualClass)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
