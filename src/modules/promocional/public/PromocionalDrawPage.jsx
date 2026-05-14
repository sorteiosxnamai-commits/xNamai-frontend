import React from "react";
import { useNavigate, useParams } from "react-router-dom";
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

function getStoredPromocionalToken() {
  try {
    return (
      localStorage.getItem("ns_auth_token") ||
      sessionStorage.getItem("ns_auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      ""
    ).replace(/^Bearer\s+/i, "");
  } catch {
    return "";
  }
}

function getReservationFromPayload(payload, fallbackDrawId) {
  const source = payload?.reservation || payload?.data?.reservation || payload?.data || payload || {};
  const id =
    source?.id ||
    source?.reservation_id ||
    source?.reservationId ||
    payload?.reservation_id ||
    payload?.reservationId;
  const drawId =
    source?.draw_id ||
    source?.drawId ||
    payload?.draw_id ||
    payload?.drawId ||
    fallbackDrawId;

  return {
    id,
    reservation_id: id,
    reservationId: id,
    draw_id: drawId,
    drawId,
    amount_cents:
      source?.amount_cents ??
      source?.amountCents ??
      payload?.amount_cents ??
      payload?.amountCents,
  };
}

function normalizePixPayload(payload) {
  const source = payload?.payment || payload?.pix || payload?.data || payload || {};
  return {
    ...source,
    paymentId: source.paymentId || source.payment_id || source.id || payload?.paymentId || payload?.id,
    payment_id: source.payment_id || source.paymentId || source.id || payload?.payment_id || payload?.paymentId || payload?.id,
    qr_code: source.qr_code || source.copy_paste_code || source.copy_paste || source.copy || payload?.qr_code,
    copy_paste_code:
      source.copy_paste_code ||
      source.qr_code ||
      source.copy_paste ||
      source.copy ||
      payload?.copy_paste_code ||
      payload?.qr_code,
    qr_code_base64: source.qr_code_base64 || payload?.qr_code_base64,
    ticket_url: source.ticket_url || payload?.ticket_url,
    amount_cents: source.amount_cents ?? source.amountCents ?? payload?.amount_cents ?? payload?.amountCents,
    amount: source.amount ?? payload?.amount,
    status: source.status || source.payment_status || payload?.status || payload?.payment_status || "pending",
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

  if (Number.isFinite(cents) && cents > 0) return cents / 100;

  const amount = Number(source?.amount ?? payload?.amount);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export default function PromocionalDrawPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();
  const [draw, setDraw] = React.useState(null);
  const [numbers, setNumbers] = React.useState([]);
  const [selectedNumbers, setSelectedNumbers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [pixOpen, setPixOpen] = React.useState(false);
  const [pixLoading, setPixLoading] = React.useState(false);
  const [pixData, setPixData] = React.useState(null);
  const [pixAmount, setPixAmount] = React.useState(null);
  const [pixMsg, setPixMsg] = React.useState("");
  const [, setPendingReservation] = React.useState(null);

  const maxNumbers = Number.parseInt(draw?.max_numbers_per_user ?? draw?.maxNumbersPerUser ?? 0, 10);

  function saveReturnRouteAndGoLogin() {
    localStorage.setItem("xnamai_after_login", window.location.pathname + window.location.search);
    navigate("/login");
  }

  function handleClosePixModal() {
    setPixOpen(false);
    setPixLoading(false);
    setPixData(null);
    setMessage("Reserva mantida por 30 minutos. Você pode concluir o pagamento pela área do cliente.");
    loadDraw();
  }

  async function openPromotionalPixFromReservation(reservationPayload) {
    const reservationId =
      reservationPayload?.reservation_id ||
      reservationPayload?.reservation?.id ||
      reservationPayload?.id ||
      reservationPayload?.reservationId;
    const drawId =
      reservationPayload?.draw_id ||
      reservationPayload?.drawId ||
      draw?.id ||
      draw?.draw_id ||
      draw?._id ||
      id;

    if (!reservationId) {
      throw new Error("Reserva promocional criada, mas o ID da reserva não foi retornado.");
    }

    try {
      setPixOpen(true);
      setPixLoading(true);
      setPixData(null);
      setPixMsg("Gerando PIX promocional...");

      const pixPayload = await generatePromocionalPix(drawId, reservationId);
      const normalizedPix = normalizePixPayload({
        ...pixPayload,
        reservation_id: reservationId,
        draw_id: drawId,
        numbers: selectedNumbers,
        amount_cents:
          pixPayload?.amount_cents ||
          reservationPayload?.amount_cents ||
          reservationPayload?.reservation?.amount_cents,
      });

      setPixData({
        ...normalizedPix,
        drawId,
        reservationId,
        type: "promotional",
      });
      setPixAmount(getPixAmount(pixPayload, reservationPayload));
      setPixMsg("");
      return normalizedPix;
    } catch (error) {
      console.error("[PROMOCIONAL_PIX_OPEN_ERROR]", error);
      setPixOpen(false);
      setPixData(null);
      setPixMsg("");
      throw error;
    } finally {
      setPixLoading(false);
    }
  }

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
    const drawId = draw?.id || draw?.draw_id || draw?._id || id;

    if (!user && !token && !getStoredPromocionalToken()) {
      setMessage("");
      saveReturnRouteAndGoLogin();
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
      const reservationPayload = await reservePromocionalNumbers(drawId, {
        numbers: numbersToReserve,
        selectedNumbers: numbersToReserve,
      });
      const reservation = getReservationFromPayload(reservationPayload, drawId);

      if (!reservation?.id) {
        throw new Error("Reserva criada sem ID de pagamento.");
      }

      setPendingReservation(reservation);
      setSelectedNumbers([]);
      setMessage("Número reservado por 30 minutos. Conclua o pagamento via PIX ou gere novamente na área do cliente.");
      await loadDraw();

      try {
        await openPromotionalPixFromReservation(reservation);
        setMessage("Reserva criada. O PIX foi gerado e seus números ficam reservados por 30 minutos.");
      } catch (pixError) {
        console.error("[PROMOCIONAL_PIX_ERROR]", pixError);
        setMessage("Reserva criada. Não foi possível abrir o PIX agora, mas seus números ficam reservados por 30 minutos e podem ser pagos na área Minha Conta.");
        await loadDraw();
      }
    } catch (error) {
      console.error("[PROMOCIONAL_FRONT_ERROR]", {
        message: error?.message,
        drawId,
        selectedNumbers: numbersToReserve,
        status: error?.status,
        responseBody: error?.responseBody || error?.data,
      });
      if (error?.status === 401 || /(^|:)401$/.test(String(error?.message || ""))) {
        saveReturnRouteAndGoLogin();
        return;
      }
      setError(error?.message || "Não foi possível reservar os números promocionais.");
    } finally {
      setSaving(false);
    }
  }

  function copyPix() {
    const code = pixData?.copy_paste_code || pixData?.qr_code || pixData?.copy_paste || pixData?.copy || "";
    if (code) navigator.clipboard.writeText(code).catch(() => {});
  }

  return (
    <>
      <PublicTopbar />
      <main className="promocional-page">
        {!authLoading && !user && (
          <p className="promocional-error promocional-login-hint" role="status">
            Para reservar números promocionais, entre ou crie uma conta.
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

              <PromocionalNumbersGrid
                numbers={numbers}
                selectedNumbers={selectedNumbers}
                onToggleNumber={toggleNumber}
              />

              <button
                type="button"
                className="promocional-primary-button promocional-primary-button--wide"
                onClick={handleReserve}
                disabled={saving || authLoading || !selectedNumbers.length}
              >
                {saving ? "Processando..." : "Reservar / continuar"}
              </button>
            </section>
          </>
        )}
      </main>

      <PixModal
        open={pixOpen}
        onClose={handleClosePixModal}
        loading={pixLoading}
        data={pixData}
        amount={pixAmount}
        inlineMessage={pixMsg}
        onCopy={copyPix}
      />
    </>
  );
}
