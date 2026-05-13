const API_BASE = (
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:4000"
).replace(/\/+$/, "");

function getToken() {
  try {
    return (
      localStorage.getItem("ns_auth_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("ns_auth_token") ||
      sessionStorage.getItem("authToken") ||
      sessionStorage.getItem("token") ||
      ""
    ).replace(/^Bearer\s+/i, "");
  } catch {
    return "";
  }
}

function authHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  const res = await fetch(`${API_BASE}/api/mercadopago/pix`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
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
      url: `${API_BASE}/api/reservations/${cleanId}/pix`,
      body: null,
    },
    {
      url: `${API_BASE}/api/payments/pix`,
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
        headers: authHeaders(),
        body: attempt.body ? JSON.stringify(attempt.body) : undefined,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        lastError = new Error(json?.error || json?.message || `Erro HTTP ${res.status}`);
        continue;
      }

      return {
        ...json,
        paymentId: json.paymentId || json.payment_id || json.id,
        payment_id: json.payment_id || json.paymentId || json.id,
        qr_code: json.qr_code || json.copy_paste_code,
        copy_paste_code: json.copy_paste_code || json.qr_code,
        qr_code_base64: json.qr_code_base64,
        amount_cents: json.amount_cents ?? json.amountCents,
        amount: json.amount,
        status: json.status || json.payment_status || "pending",
      };
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

  const attempts = [
    `${API_BASE}/api/payments/${cleanId}/status`,
    `${API_BASE}/api/mercadopago/payment/${cleanId}`,
  ];

  let lastError = null;

  for (const url of attempts) {
    try {
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: authHeaders(),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        lastError = new Error(json?.message || json?.error || `Erro HTTP ${res.status}`);
        continue;
      }

      return json;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Não foi possível consultar o status do PIX.");
}
