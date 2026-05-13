import React from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../../authContext";
import PublicTopbar from "../../../components/PublicTopbar";
import PixModal from "../../../PixModal";
import PromocionalNumbersGrid from "../components/PromocionalNumbersGrid";
import {
  generatePromocionalPix,
  getPromocionalDraw,
  getPromocionalNumbers,
  reservePromocionalNumbers,
} from "../services/promocionalApi";
import { isPromocionalNumberAvailable } from "../utils/promocionalNumbers";

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.numbers || payload?.items || payload?.data || [];
}

function getNumberValue(item) {
  if (typeof item === "object" && item !== null) {
    return item.number ?? item.n ?? item.value ?? item.numero;
  }

  return item;
}

function buildNumbersFromRange(draw) {
  const start = Number.parseInt(draw?.number_start ?? draw?.numberStart, 10);
  const end = Number.parseInt(draw?.number_end ?? draw?.numberEnd, 10);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [];
  }

  return Array.from({ length: end - start + 1 }, (_, index) => ({
    number: start + index,
    status: "available",
  }));
}

function getReservationFromPayload(payload, fallbackDrawId) {
  const source = payload?.reservation || payload?.data || payload || {};
  return {
    reservation_id:
      source?.reservation_id ||
      source?.reservationId ||
      source?.id ||
      payload?.reservation_id ||
      payload?.reservationId,
    draw_id: source?.draw_id || source?.drawId || payload?.draw_id || payload?.drawId || fallbackDrawId,
    payment_status:
      source?.payment_status ||
      source?.paymentStatus ||
      payload?.payment_status ||
      payload?.paymentStatus ||
      "pending",
    can_pay: source?.can_pay ?? source?.canPay ?? payload?.can_pay ?? payload?.canPay ?? true,
    amount_cents: source?.amount_cents ?? source?.amountCents ?? payload?.amount_cents ?? payload?.amountCents,
  };
}

function normalizePixPayload(payload) {
  const source = payload?.payment || payload?.pix || payload?.data || payload || {};
  return {
    ...source,
    paymentId: source.paymentId || source.payment_id || source.id || payload?.paymentId || payload?.id,
    qr_code: source.qr_code || source.copy_paste_code || payload?.qr_code,
    copy_paste_code:
      source.copy_paste_code || source.qr_code || payload?.copy_paste_code || payload?.qr_code,
    qr_code_base64: source.qr_code_base64 || payload?.qr_code_base64,
    ticket_url: source.ticket_url || payload?.ticket_url,
  };
}

function getPixAmount(payload, fallbackReservation = null) {
  const source = payload?.payment || payload?.pix || payload?.data || payload || {};

  const cents = Number(
    source?.amount_cents ??
      source?.amountCents ??
      payload?.amount_cents ??
      payload?.amountCents ??
      fallbackReservation?.amount_cents ??
      fallbackReservation?.amountCents
  );

  if (Number.isFinite(cents) && cents > 0) {
    return cents / 100;
  }

  const amount = Number(source?.amount ?? payload?.amount);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export default function PromocionalDrawPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [draw, setDraw] = React.useState(null);
  const [numbers, setNumbers] = React.useState([]);
  const [selectedNumbers, setSelectedNumbers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [pendingReservation, setPendingReservation] = React.useState(null);
  const [pixOpen, setPixOpen] = React.useState(false);
  const [pixLoading, setPixLoading] = React.useState(false);
  const [pixData, setPixData] = React.useState(null);
  const [pixAmount, setPixAmount] = React.useState(null);
  const [pixMsg, setPixMsg] = React.useState("");

  const maxNumbers = Number.parseInt(draw?.max_numbers_per_user ?? draw?.maxNumbersPerUser ?? 0, 10);

  const loadDraw = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [drawPayload, numbersPayload] = await Promise.all([
        getPromocionalDraw(id),
        getPromocionalNumbers(id),
      ]);
      const drawData = drawPayload?.draw || drawPayload?.data || drawPayload;
      const loadedNumbers = asList(numbersPayload);
      setDraw(drawData);
      setNumbers(loadedNumbers.length ? loadedNumbers : buildNumbersFromRange(drawData));
    } catch (err) {
      setError(err?.message || "Nao foi possivel carregar este sorteio promocional.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    loadDraw();
  }, [loadDraw]);

  React.useEffect(() => {
    if (!selectedNumbers.length || !numbers.length) return;

    const availableNumbers = new Set(
      numbers
        .filter((item) => isPromocionalNumberAvailable(item))
        .map((item) => String(getNumberValue(item)))
    );

    setSelectedNumbers((current) =>
      current.filter((number) => availableNumbers.has(String(number)))
    );
  }, [numbers, selectedNumbers.length]);

  function toggleNumber(rawNumber, item) {
    if (!isPromocionalNumberAvailable(item)) return;

    setMessage("");
    setPendingReservation(null);
    setSelectedNumbers((current) => {
      const key = String(rawNumber);
      if (current.some((value) => String(value) === key)) {
        return current.filter((value) => String(value) !== key);
      }

      if (maxNumbers > 0 && current.length >= maxNumbers) {
        setError(`Voce pode escolher no maximo ${maxNumbers} numero(s).`);
        return current;
      }

      setError("");
      return [...current, rawNumber];
    });
  }

  async function handleReserve() {
    if (authLoading) return;

    if (!user) {
      setMessage("");
      setError("Entre ou crie uma conta para reservar números promocionais.");
      return;
    }

    if (!selectedNumbers.length) {
      setError("Selecione pelo menos um numero disponivel.");
      return;
    }

    const availableNumbers = new Set(
      numbers
        .filter((item) => isPromocionalNumberAvailable(item))
        .map((item) => String(getNumberValue(item)))
    );
    const numbersToReserve = selectedNumbers
      .map(getNumberValue)
      .filter((number) => availableNumbers.has(String(number)));

    if (numbersToReserve.length !== selectedNumbers.length) {
      setSelectedNumbers(numbersToReserve);
      setError("Alguns numeros selecionados nao estao mais disponiveis.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = await reservePromocionalNumbers(id, {
        numbers: numbersToReserve,
        buyer_name: user.name || user.fullName || user.nome || user.displayName || "",
        buyer_email: user.email || "",
        buyer_phone: user.phone || user.telefone || user.whatsapp || "",
      });
      const reservation = getReservationFromPayload(payload, id);
      setSelectedNumbers([]);
      setMessage("Números promocionais reservados com sucesso.");
      setPendingReservation(reservation?.reservation_id ? reservation : null);
      await loadDraw();
    } catch (err) {
      console.error("[PROMOCIONAL_FRONT_ERROR]", err);
      setError(err?.message || "Não foi possível reservar os números promocionais.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePayNow() {
    if (!pendingReservation?.reservation_id || !pendingReservation?.draw_id) {
      setError("Reserva promocional não encontrada para gerar o PIX.");
      return;
    }

    try {
      setPixOpen(true);
      setPixLoading(true);
      setPixData(null);
      setPixMsg("Gerando PIX promocional...");
      const payload = await generatePromocionalPix(
        pendingReservation.draw_id,
        pendingReservation.reservation_id
      );
      const normalized = normalizePixPayload(payload);
      setPixData(normalized);
      setPixAmount(getPixAmount(payload, pendingReservation));
      setPixMsg("");
    } catch (err) {
      console.error("[PROMOCIONAL_FRONT_ERROR]", err);
      setPixMsg("Não foi possível gerar o PIX promocional.");
      setError("Não foi possível gerar o PIX promocional.");
    } finally {
      setPixLoading(false);
    }
  }

  function handlePayLater() {
    setPendingReservation(null);
    setMessage("Reserva criada. Você pode pagar depois em Minha Conta.");
  }

  function copyPix() {
    const code = pixData?.copy_paste_code || pixData?.qr_code || "";
    if (code) navigator.clipboard.writeText(code).catch(() => {});
  }

  return (
    <>
      <PublicTopbar />
      <main className="promocional-page">
        {!authLoading && !user && (
          <p className="promocional-error promocional-login-hint" role="status">
            Para reservar ou comprar números promocionais,{" "}
            <Link to="/login" className="promocional-login-hint__link">
              faça login
            </Link>{" "}
            ou crie uma conta.
          </p>
        )}
        {loading && <p className="promocional-info">Carregando sorteio promocional...</p>}
        {!loading && error && !draw && <p className="promocional-error">{error}</p>}

        {!loading && draw && (
          <>
            <section className="promocional-hero promocional-hero--compact">
              <p className="promocional-eyebrow">xNaMai Promocional</p>
              <h1>{draw.title || draw.name || "Sorteio promocional"}</h1>
              {draw.description && <p>{draw.description}</p>}
              {(draw.prize || draw.award) && (
                <strong className="promocional-prize">Premio: {draw.prize || draw.award}</strong>
              )}
            </section>

            <section className="promocional-panel">
              <div className="promocional-panel-heading">
                <div>
                  <h2>Escolha seus numeros</h2>
                  <p>Numeros reservados, vendidos ou bloqueados nao podem ser selecionados.</p>
                </div>
                <span className="promocional-selected-count">
                  {selectedNumbers.length} selecionado(s)
                </span>
              </div>

              {error && <p className="promocional-error">{error}</p>}
              {message && <p className="promocional-success">{message}</p>}
              {pendingReservation?.reservation_id && (
                <div className="promocional-payment-actions">
                  <button
                    type="button"
                    className="promocional-primary-button"
                    onClick={handlePayNow}
                    disabled={pixLoading}
                  >
                    {pixLoading ? "Gerando..." : "Pagar agora"}
                  </button>
                  <button
                    type="button"
                    className="promocional-secondary-button"
                    onClick={handlePayLater}
                    disabled={pixLoading}
                  >
                    Pagar depois
                  </button>
                </div>
              )}

              <PromocionalNumbersGrid
                numbers={numbers}
                selectedNumbers={selectedNumbers}
                onToggleNumber={toggleNumber}
              />

              <button
                type="button"
                className="promocional-primary-button promocional-primary-button--wide"
                onClick={handleReserve}
                disabled={saving || !selectedNumbers.length || !user}
              >
                {saving ? "Reservando..." : "Reservar / continuar"}
              </button>
            </section>
          </>
        )}
      </main>

      <PixModal
        open={pixOpen}
        onClose={() => setPixOpen(false)}
        loading={pixLoading}
        data={pixData}
        amount={pixAmount}
        inlineMessage={pixMsg}
        onCopy={copyPix}
      />
    </>
  );
}
