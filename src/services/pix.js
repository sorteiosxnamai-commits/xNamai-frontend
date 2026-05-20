import { apiJoin, authHeaders as apiAuthHeaders } from "../lib/api";

function requestHeaders() {
  return {
    "Content-Type": "application/json",
    ...apiAuthHeaders(),
  };
}

function normalizePixPaymentResponse(json, reservationId) {
  const status = json.status || json.payment_status || "pending";

  return {
    ...json,
    paymentId: json.paymentId || json.payment_id || json.id,
    payment_id: json.payment_id || json.paymentId || json.id,
    reservation_id: json.reservation_id || reservationId,
    status,
    payment_status: json.payment_status || json.status || status,
    qr_code: json.qr_code || json.copy_paste_code,
    copy_paste_code: json.copy_paste_code || json.qr_code,
    qr_code_base64: json.qr_code_base64,
    ticket_url: json.ticket_url,
    amount: json.amount,
    amount_cents: json.amount_cents ?? json.amountCents,
  };
}

export async function createPixPayment(payload = {}) {
  const amount =
    Number(payload.amount) ||
    Number(payload.total) ||
    Number(payload.value) ||
    0;

  const amountCents =
    Number(payload.amountCents) ||
    Number(payload.amount_cents) ||
    Math.round(amount * 100);

  const res = await fetch(apiJoin("/mercadopago/pix"), {
    method: "POST",
    credentials: "include",
    headers: requestHeaders(),
    body: JSON.stringify({
      ...payload,
      amount,
      amountCents,
      payerEmail: payload.payerEmail || payload.email,
      payerName: payload.payerName || payload.name,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      json?.message ||
        json?.error ||
        "Não foi possível gerar o PIX pelo Mercado Pago."
    );
  }

  return {
    ...json,
    paymentId: json.paymentId || json.id,
    qr_code: json.qr_code || json.copy_paste_code,
    copy_paste_code: json.copy_paste_code || json.qr_code,
    qr_code_base64: json.qr_code_base64,
  };
}

export async function generateMainReservationPix(reservationId) {
  if (!reservationId) {
    throw new Error("Reserva não encontrada para gerar PIX.");
  }

  const cleanId = encodeURIComponent(String(reservationId));

  const attempts = [
    {
      url: apiJoin(`/reservations/${cleanId}/pix`),
      body: null,
    },
    {
      url: apiJoin("/payments/pix"),
      body: {
        reservationId,
        reservation_id: reservationId,
      },
    },
  ];

  let lastError = null;

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: "POST",
        credentials: "include",
        headers: requestHeaders(),
        body: attempt.body ? JSON.stringify(attempt.body) : undefined,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        lastError = new Error(json?.error || json?.message || `Erro HTTP ${res.status}`);
        continue;
      }

      return normalizePixPaymentResponse(json, reservationId);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Erro ao gerar PIX da reserva.");
}

export async function checkPixStatus(paymentId) {
  if (!paymentId) {
    throw new Error("paymentId obrigatório");
  }

  const cleanId = encodeURIComponent(String(paymentId));

  // Principal: /api/payments/:id/status. Mercado Pago só como fallback visual.
  const attempts = [
    apiJoin(`/payments/${cleanId}/status`),
    apiJoin(`/mercadopago/payment/${cleanId}`),
  ];

  let lastError = null;

  for (const url of attempts) {
    try {
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: requestHeaders(),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        lastError = new Error(json?.message || json?.error || `Erro HTTP ${res.status}`);
        continue;
      }

      const status = json.status || json.payment_status || json.state;

      return {
        ...json,
        status,
        payment_status: json.payment_status || json.status || status,
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Não foi possível consultar o status do PIX.");
}
