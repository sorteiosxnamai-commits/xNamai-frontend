import { apiJoin, authHeaders, delJSON, getJSON, postJSON, putJSON } from "../../../lib/api";

function encodePathValue(value) {
  return encodeURIComponent(String(value));
}

async function patchJSON(path, body) {
  const response = await fetch(apiJoin(path), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "omit",
    body: JSON.stringify(body || {}),
  });

  if (!response.ok) {
    let message = `${response.status}`;
    try {
      const payload = await response.json();
      message = payload?.error || payload?.message || message;
    } catch {}
    throw new Error(message);
  }

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response.text();
}

export function getPromocionalDraws() {
  return getJSON("/promotional");
}

export function getPromocionalDraw(id) {
  return getJSON(`/promotional/${encodePathValue(id)}`);
}

export function getPromocionalNumbers(id) {
  return getJSON(`/promotional/${encodePathValue(id)}/numbers`);
}

export function reservePromocionalNumbers(id, payload) {
  return postJSON(`/promotional/${encodePathValue(id)}/reserve`, payload);
}

export function adminGetPromocionalDraws() {
  return getJSON("/promotional/admin/draws");
}

export function adminCreatePromocionalDraw(payload) {
  return postJSON("/promotional/admin/draws", payload);
}

export function adminGetPromocionalDraw(id) {
  return getJSON(`/promotional/admin/draws/${encodePathValue(id)}`);
}

export function adminUpdatePromocionalDraw(id, payload) {
  return putJSON(`/promotional/admin/draws/${encodePathValue(id)}`, payload);
}

export function adminUpdatePromocionalStatus(id, status) {
  return patchJSON(`/promotional/admin/draws/${encodePathValue(id)}/status`, { status });
}

export function adminDeletePromocionalDraw(id) {
  return delJSON(`/promotional/admin/draws/${encodePathValue(id)}`);
}

export function adminGetPromocionalNumbers(id) {
  return getJSON(`/promotional/admin/draws/${encodePathValue(id)}/numbers`);
}

export function adminUpdatePromocionalNumberStatus(id, number, status) {
  return patchJSON(
    `/promotional/admin/draws/${encodePathValue(id)}/numbers/${encodePathValue(number)}`,
    { status }
  );
}

export function adminGetPromocionalParticipants(id) {
  return getJSON(`/promotional/admin/draws/${encodePathValue(id)}/participants`);
}
