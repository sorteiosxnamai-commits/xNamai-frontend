import { getJSON, postJSON } from "../lib/api";

export function getAdminSummary() {
  return getJSON("/admin/dashboard/summary");
}

export function updateAdminConfig(payload) {
  return fetchAdminPatch("/admin/dashboard/config", payload);
}

export function createAdminDraw(payload = {}) {
  return postJSON("/admin/dashboard/new", payload);
}

export function getDrawsHistory() {
  return getJSON("/admin/draws/history");
}

export function getAdminDraws() {
  return getJSON("/admin/draws");
}

export function setDrawStatus(id, status) {
  return fetchAdminPatch(`/admin/draws/${id}/status`, { status });
}

export function getDrawBuyers(id) {
  return getJSON(`/admin/draws/${id}/buyers`);
}

async function fetchAdminPatch(path, payload) {
  const { apiJoin, authHeaders } = await import("../lib/api");

  const response = await fetch(apiJoin(path), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "omit",
    body: JSON.stringify(payload || {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || `Erro HTTP ${response.status}`);
  }

  return data;
}
