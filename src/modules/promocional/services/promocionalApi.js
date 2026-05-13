import { apiJoin, authHeaders, delJSON, getJSON, postJSON, putJSON } from "../../../lib/api";

function encodePathValue(value) {
  return encodeURIComponent(String(value));
}

function asList(payload, keys = []) {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }

  return [];
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

export async function reservePromocionalNumbers(id, payload) {
  const response = await fetch(apiJoin(`/promotional/${encodePathValue(id)}/reserve`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "omit",
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || data?.message || "Erro ao reservar números promocionais.");
  }

  return data;
}

export async function generatePromocionalPix(drawId, reservationId) {
  if (!drawId || !reservationId) {
    throw new Error("Dados da reserva promocional incompletos para gerar PIX.");
  }

  const response = await fetch(
    apiJoin(
      `/promotional/${encodePathValue(drawId)}/reservations/${encodePathValue(reservationId)}/pix`
    ),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      credentials: "omit",
    }
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.ok === false) {
    console.error("[PROMOTIONAL_PIX_RESPONSE_ERROR]", {
      status: response.status,
      data,
    });

    throw new Error(data?.error || data?.message || "Erro ao gerar PIX promocional.");
  }

  return {
    ...data,
    paymentId: data.paymentId || data.payment_id || data.id,
    payment_id: data.payment_id || data.paymentId || data.id,
    qr_code: data.qr_code || data.copy_paste_code,
    copy_paste_code: data.copy_paste_code || data.qr_code,
    qr_code_base64: data.qr_code_base64,
    amount_cents: data.amount_cents ?? data.amountCents,
    amount: data.amount,
    status: data.status || data.payment_status || "pending",
  };
}

export async function getMyPromocionalParticipations() {
  const payload = await getJSON("/promotional/me/participations");
  return asList(payload, ["participations", "items", "data"]);
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

/**
 * GET /api/promotional/admin/draws/:id/numbers
 * Retorna sempre array de números (campo `numbers` do JSON ou array direto).
 */
export async function adminGetPromocionalNumbers(drawId) {
  const path = `/promotional/admin/draws/${encodePathValue(drawId)}/numbers`;
  const response = await fetch(apiJoin(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "omit",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(
      data?.error || data?.message || "Erro ao carregar números promocionais."
    );
  }

  if (Array.isArray(data)) return data;
  return data.numbers || data.items || [];
}

/**
 * PATCH /api/promotional/admin/draws/:id/numbers/:number
 * body: { status: "available" | "reserved" | "sold" | "blocked" }
 */
export async function adminUpdatePromocionalNumberStatus(drawId, number, status) {
  return patchJSON(
    `/promotional/admin/draws/${encodePathValue(drawId)}/numbers/${encodePathValue(number)}`,
    { status }
  );
}

export function adminGetPromocionalParticipants(id) {
  return getJSON(`/promotional/admin/draws/${encodePathValue(id)}/participants`);
}
