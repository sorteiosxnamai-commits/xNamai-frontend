const UNAVAILABLE_STATUSES = new Set([
  "unavailable",
  "sold",
  "paid",
  "approved",
  "blocked",
  "indisponivel",
  "indisponível",
  "vendido",
  "pago",
  "aprovado",
  "taken",
]);

const RESERVED_STATUSES = new Set([
  "reserved",
  "pending",
  "reservado",
  "pendente",
]);

const PAID_PAYMENT_STATUSES = new Set(["paid", "approved", "pago"]);

export function normalizeStatusToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isUnavailableStatus(status, paymentStatus) {
  const st = normalizeStatusToken(status);
  const pay = normalizeStatusToken(paymentStatus);

  if (UNAVAILABLE_STATUSES.has(st) || PAID_PAYMENT_STATUSES.has(pay)) {
    return true;
  }

  return st.includes("indispon") || st === "unavailable";
}

export function isReservedStatus(status, paymentStatus) {
  if (isUnavailableStatus(status, paymentStatus)) return false;
  return RESERVED_STATUSES.has(normalizeStatusToken(status));
}

/**
 * @param {object} params
 * @param {number} params.number
 * @param {Set<number>|number[]} params.unavailableNumbers
 * @param {Set<number>|number[]} params.reservedNumbers
 */
export function getNumberVisualState({
  number,
  unavailableNumbers = [],
  reservedNumbers = [],
}) {
  const n = Number(number);
  const unavailable = new Set(unavailableNumbers);
  const reserved = new Set(reservedNumbers);

  if (unavailable.has(n)) return "unavailable";
  if (reserved.has(n)) return "reserved";
  return "available";
}

export const NUMBER_CELL_PALETTE = {
  unavailable: {
    border: "1px solid #9CA3AF",
    bgcolor: "#D1D5DB",
    color: "#1F2937",
    cursor: "not-allowed",
    pointerEvents: "none",
    boxShadow: "inset 0 0 0 1px rgba(75, 85, 99, 0.22)",
    opacity: 1,
    "&:hover": {
      bgcolor: "#D1D5DB",
      borderColor: "#9CA3AF",
      color: "#1F2937",
      transform: "none",
      boxShadow: "inset 0 0 0 1px rgba(75, 85, 99, 0.22)",
    },
    initialsBg: "#6B7280",
    initialsBorder: "1px solid #4B5563",
    initialsColor: "#FFFFFF",
  },
  reserved: {
    border: "1px solid #F2C94C",
    bgcolor: "#FFE9A8",
    color: "#8A5A00",
    cursor: "not-allowed",
    boxShadow: "inset 0 0 0 1px rgba(242, 201, 76, 0.35)",
    "&:hover": {
      bgcolor: "#FFE08A",
      borderColor: "#E0B93E",
      color: "#7A4F00",
    },
  },
  selected: {
    border: "1px solid rgba(30, 102, 255, 0.85)",
    bgcolor: "#1E66FF",
    color: "#FFFFFF",
    boxShadow: "0 10px 20px rgba(30, 102, 255, 0.28)",
  },
  available: {
    border: "1px solid rgba(30,102,255,0.24)",
    bgcolor: "#FFFFFF",
    color: "#1E66FF",
    "&:hover": {
      borderColor: "rgba(30, 102, 255, 0.52)",
      boxShadow: "0 10px 16px rgba(30, 102, 255, 0.18)",
      transform: "translateY(-1px)",
    },
    transition: "border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease",
    "&:active": { transform: "scale(0.98)" },
  },
};

export function getNumberCellSx(visualState, isSelected = false) {
  if (visualState === "unavailable") {
    return NUMBER_CELL_PALETTE.unavailable;
  }
  if (visualState === "reserved") {
    return NUMBER_CELL_PALETTE.reserved;
  }
  if (isSelected) {
    return NUMBER_CELL_PALETTE.selected;
  }
  return NUMBER_CELL_PALETTE.available;
}

export function getUnavailableInitialsSx() {
  const p = NUMBER_CELL_PALETTE.unavailable;
  return {
    mt: 0.25,
    px: 0.8,
    py: 0.15,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.6,
    bgcolor: p.initialsBg,
    border: p.initialsBorder,
    color: p.initialsColor,
  };
}
