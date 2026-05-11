const PROMOCIONAL_NUMBER_STATUSES = ["available", "reserved", "sold", "blocked"];

export function formatPromocionalNumber(n) {
  const value = Number.parseInt(n, 10);

  if (!Number.isFinite(value)) {
    return String(n ?? "");
  }

  return value >= 0 && value < 100 ? String(value).padStart(2, "0") : String(value);
}

export function normalizePromocionalNumberStatus(status) {
  const normalized = String(status || "available").trim().toLowerCase();
  return PROMOCIONAL_NUMBER_STATUSES.includes(normalized) ? normalized : "available";
}

export function isPromocionalNumberAvailable(item) {
  const status = typeof item === "object" && item !== null ? item.status : item;
  return normalizePromocionalNumberStatus(status) === "available";
}

export function isPromocionalNumberUnavailable(item) {
  return !isPromocionalNumberAvailable(item);
}
