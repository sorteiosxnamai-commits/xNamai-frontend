import { API_CONFIG } from "../config/api";

const API_BASE = String(API_CONFIG.baseUrl || "/api").replace(/\/+$/, "");

/**
 * Limite por usuário no sorteio atual (fonte: draw / config pública).
 * Não usa hardcode 20 nem max_numbers_per_selection legado da New Store.
 */
export function resolveMaxNumbersPerUser(configPayload = null, drawOverride = null) {
  const config = configPayload || {};
  const draw =
    drawOverride ||
    config.current_draw ||
    config.currentDraw ||
    config.current ||
    {};

  const value = Number(
    draw.max_numbers_per_user ??
      draw.maxNumbersPerUser ??
      config.max_numbers_per_user ??
      config.maxNumbersPerUser
  );

  if (Number.isFinite(value) && value > 0) return value;
  return 5;
}

export function resolveCurrentDrawId(configPayload = null) {
  const config = configPayload || {};
  const draw = config.current_draw || config.currentDraw || config.current || {};
  const id =
    config.current_draw_id ??
    config.draw_id ??
    draw.id ??
    draw.draw_id;

  return id != null && Number.isFinite(Number(id)) ? Number(id) : null;
}

export async function fetchPublicConfig() {
  const res = await fetch(`${API_BASE}/api/config`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json().catch(() => null);
}
