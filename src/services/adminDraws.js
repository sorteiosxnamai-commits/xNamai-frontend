// src/services/adminDraws.js

const API_BASE = (
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  ""
).replace(/\/+$/, "");

function makeUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${cleanPath}` : cleanPath;
}

export async function adminFetch(path, options = {}) {
  const response = await fetch(makeUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Erro HTTP ${response.status}`;

    throw new Error(message);
  }

  return data;
}

export function getAdminSummary() {
  return adminFetch("/api/admin/dashboard/summary");
}

export function updateAdminConfig(payload) {
  return adminFetch("/api/admin/dashboard/config", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createAdminDraw(payload) {
  return adminFetch("/api/admin/dashboard/new", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getDrawsHistory() {
  return adminFetch("/api/admin/draws/history");
}

export function setDrawStatus(id, status) {
  return adminFetch(`/api/admin/draws/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getDrawBuyers(id) {
  return adminFetch(`/api/admin/draws/${id}/buyers`);
}
