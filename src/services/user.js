// src/services/user.js
import { API_CONFIG } from "../config/api";

const API = String(API_CONFIG.baseUrl || "").replace(/\/+$/, "");

function getToken() {
  return (
    localStorage.getItem("ns_auth_token") ||
    sessionStorage.getItem("ns_auth_token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    ""
  )
    .toString()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "");
}

function authHeaders() {
  const t = getToken();
  const h = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function fetchWithAuth(url, options = {}) {
  let res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });

  if (res.status === 401) {
    const token = getToken();
    res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  return res;
}

// GET /api/users/me
export async function getMe() {
  const res = await fetch(`${API}/api/users/me`, {
    method: "GET",
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erro ${res.status} ao carregar usuário`);
  }
  return res.json();
}

/**
 * GET /api/purchase-limit/check?draw_id=&add=
 * Fonte de verdade do limite por usuário no sorteio atual.
 */
export async function fetchPurchaseLimitCheck({ drawId, addCount = 0 } = {}) {
  const qs = new URLSearchParams();
  qs.set("add", String(addCount));
  if (drawId != null && Number.isFinite(Number(drawId))) {
    qs.set("draw_id", String(drawId));
  }

  const url = `${API}/api/purchase-limit/check?${qs.toString()}`;
  const res = await fetchWithAuth(url, { method: "GET", cache: "no-store" });

  if (res.status === 401) {
    const err = new Error("unauthorized");
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(`limit_check_${res.status}`);
    err.status = res.status;
    throw err;
  }

  const j = await res.json().catch(() => ({}));
  const max =
    Number(j?.max_numbers_per_user ?? j?.max ?? j?.limit ?? j?.MAX) || 0;
  const paidCount = Number(j?.paid_count ?? 0) || 0;
  const reservedCount = Number(j?.reserved_count ?? 0) || 0;
  const usedFromApi = Number(j?.used_count ?? j?.current ?? j?.cnt ?? j?.count);
  const usedCount = Number.isFinite(usedFromApi) && usedFromApi >= 0
    ? usedFromApi
    : paidCount + reservedCount;
  const remainingRaw = Number(j?.remaining);
  const remaining = Number.isFinite(remainingRaw)
    ? Math.max(0, remainingRaw)
    : Math.max(0, (max > 0 ? max : 0) - usedCount);

  return {
    max_numbers_per_user: max > 0 ? max : null,
    paid_count: paidCount,
    reserved_count: reservedCount,
    used_count: usedCount,
    remaining,
    blocked: !!(
      j?.blocked ??
      j?.limitReached ??
      j?.reached ??
      j?.exceeded
    ),
    raw: j,
  };
}
