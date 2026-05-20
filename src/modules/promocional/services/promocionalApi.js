import { apiJoin, authHeaders, delJSON, getJSON, getStoredToken, postJSON, putJSON } from "../../../lib/api";

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

async function parseApiResponse(response, path) {
  const rawText = await response.text();

  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = rawText ? { raw: rawText } : null;
  }

  if (!response.ok || data?.ok === false) {
    const message =
      data?.message ||
      data?.error ||
      data?.detail ||
      `Erro HTTP ${response.status} ao chamar ${path}`;

    console.error("[PROMOCIONAL_API_ERROR_BODY]", {
      path,
      status: response.status,
      statusText: response.statusText,
      data,
      rawText,
    });

    const error = new Error(message);
    error.status = response.status;
    error.statusCode = response.status;
    error.data = data;
    error.response = { data };
    error.responseBody = data;
    error.code = data?.code || data?.error || null;
    error.detail = data?.detail || null;
    error.hint = data?.hint || null;
    error.constraint = data?.constraint || null;
    error.table = data?.table || null;
    error.column = data?.column || null;
    error.schema = data?.schema || null;
    error.debug_route = data?.debug_route || null;

    throw error;
  }

  return data;
}

async function patchJSON(path, body) {
  const response = await fetch(apiJoin(path), {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "omit",
    body: JSON.stringify(body || {}),
  });

  return parseApiResponse(response, path);
}

async function apiPost(path, body) {
  const response = await fetch(apiJoin(path), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "omit",
    body: JSON.stringify(body || {}),
  });

  return parseApiResponse(response, path);
}

export function getPromocionalDraws() {
  return getJSON("/promotional");
}

export function getPromotionalDraw(drawId) {
  return getJSON(`/promotional/${encodePathValue(drawId)}`);
}

export const getPromocionalDraw = getPromotionalDraw;

export function getPromotionalNumbers(drawId) {
  return getJSON(`/promotional/${encodePathValue(drawId)}/numbers`);
}

export const getPromocionalNumbers = getPromotionalNumbers;

export function getMyPromocionalAssignment(drawId) {
  return getJSON(`/promotional/${encodePathValue(drawId)}/my-assignment`);
}

export function redeemPromocionalAssignment(drawId) {
  return apiPost(`/promotional/${encodePathValue(drawId)}/redeem`, {});
}

export function adminAssignPromocionalNumbers(drawId, payload) {
  return apiPost(
    `/promotional/admin/draws/${encodePathValue(drawId)}/assign-numbers`,
    payload
  );
}

export async function checkoutPromocionalReservation(drawId, payload) {
  if (!drawId) {
    throw new Error("Sorteio promocional não encontrado.");
  }

  const token = getStoredToken();

  if (!token) {
    const error = new Error("Faça login para reservar números promocionais.");
    error.status = 401;
    throw error;
  }

  const selectedNumbers = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.numbers)
      ? payload.numbers
      : [];

  if (!selectedNumbers.length) {
    throw new Error("Selecione pelo menos um número promocional.");
  }

  const path = `/promotional/${encodePathValue(drawId)}/checkout`;

  console.warn("[PROMOCIONAL_CHECKOUT_FRONT_CALL]", {
    path,
    drawId,
    numbers: selectedNumbers,
  });

  return apiPost(path, {
    ...(payload && !Array.isArray(payload) ? payload : {}),
    numbers: selectedNumbers,
  });
}

export const checkoutPromotionalReservation = checkoutPromocionalReservation;

// Compatibilidade: qualquer código antigo que ainda chame reservePromotionalNumbers
// também será forçado a usar o checkout promocional.
export async function reservePromotionalNumbers(drawId, payload) {
  return checkoutPromocionalReservation(drawId, payload);
}

export const reservePromocionalNumbers = checkoutPromocionalReservation;
export const reserveNumbers = checkoutPromocionalReservation;

export async function generatePromotionalPix(drawIdOrReservationId, maybeReservationId = null) {
  const hasDrawId =
    maybeReservationId !== null &&
    maybeReservationId !== undefined &&
    maybeReservationId !== "";

  const drawId = hasDrawId ? drawIdOrReservationId : null;
  const reservationId = hasDrawId ? maybeReservationId : drawIdOrReservationId;

  if (!reservationId) {
    throw new Error("Dados da reserva promocional incompletos para gerar PIX.");
  }

  const path = drawId
    ? `/promotional/${encodePathValue(drawId)}/reservations/${encodePathValue(reservationId)}/pix`
    : `/promotional/reservations/${encodePathValue(reservationId)}/pix`;

  console.warn("[PROMOCIONAL_PIX_FRONT_CALL]", {
    path,
    drawId,
    reservationId,
  });

  const data = await apiPost(path, {});

  const source =
    data?.payment ||
    data?.pix ||
    data?.data?.payment ||
    data?.data?.pix ||
    data?.data ||
    data ||
    {};

  return {
    ...data,
    type: "promotional",
    source: "promotional",

    paymentId:
      source.paymentId ||
      source.payment_id ||
      source.id ||
      data.paymentId ||
      data.payment_id ||
      data.id,

    payment_id:
      source.payment_id ||
      source.paymentId ||
      source.id ||
      data.payment_id ||
      data.paymentId ||
      data.id,

    qr_code:
      source.qr_code ||
      source.pix_qr_code ||
      source.copy_paste_code ||
      source.copy_paste ||
      source.copy ||
      data.qr_code ||
      data.pix_qr_code,

    copy_paste_code:
      source.copy_paste_code ||
      source.qr_code ||
      source.pix_qr_code ||
      source.copy_paste ||
      source.copy ||
      data.copy_paste_code ||
      data.qr_code ||
      data.pix_qr_code,

    qr_code_base64:
      source.qr_code_base64 ||
      source.pix_qr_code_base64 ||
      data.qr_code_base64 ||
      data.pix_qr_code_base64,

    ticket_url:
      source.ticket_url ||
      source.pix_ticket_url ||
      data.ticket_url ||
      data.pix_ticket_url,

    amount_cents:
      source.amount_cents ??
      source.amountCents ??
      data.amount_cents ??
      data.amountCents,

    amount:
      source.amount ??
      data.amount,

    status:
      source.status ||
      source.payment_status ||
      data.status ||
      data.payment_status ||
      "pending",
  };
}

export async function generatePromocionalPix(drawIdOrReservationId, reservationId) {
  return generatePromotionalPix(drawIdOrReservationId, reservationId);
}

export async function getMyPromocionalReservations() {
  const payload = await getJSON("/promotional/me/reservations");
  return asList(payload, ["reservations", "items", "data"]);
}

export async function getMyPromocionalParticipations() {
  return getMyPromocionalReservations();
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

  const data = await parseApiResponse(response, path);

  if (Array.isArray(data)) return data;
  return data?.numbers || data?.items || [];
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
