export function isPaidStatus(status) {
  const s = String(status || "").toLowerCase();
  return ["approved", "paid", "pago"].includes(s);
}
