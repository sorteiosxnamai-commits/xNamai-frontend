const PROMOCIONAL_NUMBER_STATUSES = ["available", "reserved", "sold", "blocked", "unavailable"];

export function formatPromocionalNumber(n) {
  const value = Number.parseInt(n, 10);

  if (!Number.isFinite(value)) {
    return String(n ?? "");
  }

  return value >= 0 && value < 100 ? String(value).padStart(2, "0") : String(value);
}

/**
 * Normaliza status vindos da API para um dos quatro estados da UI.
 * Evita que reservas/pagamento pendente apareçam como "disponível".
 */
export function normalizePromocionalNumberStatus(status) {
  const raw = String(status ?? "").trim().toLowerCase();
  if (!raw) return "available";

  const availableLike = ["available", "free", "open"];
  const reservedLike = [
    "reserved",
    "reserve",
    "hold",
    "pending",
    "pending_payment",
    "payment_pending",
    "awaiting_payment",
    "processing",
  ];
  const soldLike = ["sold", "taken", "paid", "confirmed", "approved"];
  const blockedLike = ["blocked", "inactive", "disabled", "unavailable"];

  if (availableLike.includes(raw)) return "available";
  if (reservedLike.includes(raw)) return "reserved";
  if (soldLike.includes(raw)) return "sold";
  if (blockedLike.includes(raw)) return "blocked";

  return PROMOCIONAL_NUMBER_STATUSES.includes(raw) ? raw : "available";
}

export function isPromocionalNumberAvailable(item) {
  const status = typeof item === "object" && item !== null ? item.status : item;
  return normalizePromocionalNumberStatus(status) === "available";
}

export function isPromocionalNumberUnavailable(item) {
  return !isPromocionalNumberAvailable(item);
}
