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
  const res = await fetch(`${API_BASE}/api/reservations/${encodeURIComponent(String(reservationId))}/pix`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || json?.message || "Erro ao gerar PIX.");
  }

  return {
    ...json,
    paymentId: json.paymentId || json.payment_id || json.id,
    qr_code: json.qr_code || json.copy_paste_code,
    copy_paste_code: json.copy_paste_code || json.qr_code,
    qr_code_base64: json.qr_code_base64,
  };
}

export async function checkPixStatus(paymentId) {
  if (!paymentId) {
    throw new Error("paymentId obrigatório");
  }

  const res = await fetch(`${API_BASE}/api/mercadopago/payment/${paymentId}`, {
    method: "GET",
    credentials: "include",
    headers: authHeaders(),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      json?.message ||
        json?.error ||
        "Não foi possível consultar o status do PIX."
    );
  }

  return json;
}
