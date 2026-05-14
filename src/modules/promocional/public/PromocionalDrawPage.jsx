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
    numbers: source?.numbers || source?.selected_numbers || payload?.numbers || payload?.selected_numbers || [],
  };
}

function normalizePixPayload(payload) {
  const source =
    payload?.payment ||
    payload?.pix ||
    payload?.data?.payment ||
    payload?.data?.pix ||
    payload?.data ||
    payload ||
    {};
  return {
    ...source,
    paymentId: source.paymentId || source.payment_id || source.id || payload?.paymentId || payload?.id,
    payment_id: source.payment_id || source.paymentId || source.id || payload?.payment_id || payload?.paymentId || payload?.id,
    qr_code:
      source.qr_code ||
      source.pix_qr_code ||
      source.copy_paste_code ||
      source.copy_paste ||
      source.copy ||
      payload?.qr_code ||
      payload?.pix_qr_code,
    copy_paste_code:
      source.copy_paste_code ||
      source.qr_code ||
      source.pix_qr_code ||
      source.copy_paste ||
      source.copy ||
      payload?.copy_paste_code ||
      payload?.qr_code ||
      payload?.pix_qr_code,
    qr_code_base64: source.qr_code_base64 || source.pix_qr_code_base64 || payload?.qr_code_base64 || payload?.pix_qr_code_base64,
    ticket_url: source.ticket_url || source.pix_ticket_url || payload?.ticket_url || payload?.pix_ticket_url,
    amount_cents: source.amount_cents ?? source.amountCents ?? payload?.amount_cents ?? payload?.amountCents,
    amount: source.amount ?? payload?.amount,
    status: source.status || source.payment_status || payload?.status || payload?.payment_status || "pending",
  };
}

function getComparableNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? String(parsed) : String(value);
}

export default function PromocionalDrawPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
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
  const [pendingReservation, setPendingReservation] = React.useState(null);
  const localReservedNumbersRef = React.useRef(new Map());

  const maxNumbers = Number.parseInt(draw?.max_numbers_per_user ?? draw?.maxNumbersPerUser ?? 0, 10);

  const applyLocalReservedNumbers = React.useCallback((items) => {
    const now = Date.now();

    localReservedNumbersRef.current.forEach((reservation, key) => {
      if (reservation.expiresAt <= now) {
        localReservedNumbersRef.current.delete(key);
      }
    });

    if (!localReservedNumbersRef.current.size) return items;

    return items.map((item) => {
      const rawNumber = getNumberValue(item);
      const reservation = localReservedNumbersRef.current.get(getComparableNumber(rawNumber));

      if (!reservation || !isPromocionalNumberAvailable(item)) {
        return item;
      }

      return {
        ...(typeof item === "object" && item !== null ? item : { number: rawNumber }),
        status: "reserved",
        reserved: true,
        unavailable: true,
        reservation_id: reservation.reservationId,
      };
    });
  }, []);

  function saveReturnRouteAndGoLogin() {
    const currentUrl = window.location.pathname + window.location.search;
    localStorage.setItem("xnamai_after_login", currentUrl);
    navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`);
  }

  function handleClosePixModal() {
    setPixOpen(false);
    setPixLoading(false);
    setPixData(null);
    if (pendingReservation) {
      setMessage("Reserva criada. Você pode pagar depois em Minha Conta.");
    }
    loadDraw();
  }

  async function openPromotionalPix(reservation, pixPayload = null) {
    if (!reservation?.reservation_id && !reservation?.reservationId) {
      setError("Reserva promocional não encontrada para gerar PIX.");
      return;
    }

    const reservationId = reservation.reservation_id || reservation.reservationId;

    try {
      setPixOpen(true);
      setPixLoading(true);
      setPixData(null);
      setPixAmount(null);
      setPixMsg(pixPayload ? "" : "Gerando PIX promocional...");

      const payload =
        pixPayload ||
        (await generatePromocionalPix(
          reservation.draw_id || reservation.drawId || id,
          reservationId
        ));
      const normalized = normalizePixPayload(payload);

      setPixData(normalized);

      const cents =
        normalized?.amount_cents ??
        normalized?.amountCents ??
        payload?.amount_cents ??
        payload?.amountCents ??
        reservation?.amount_cents ??
        reservation?.amountCents;
      const amount = Number(normalized?.amount ?? payload?.amount);

      setPixAmount(
        Number.isFinite(Number(cents))
          ? Number(cents) / 100
          : Number.isFinite(amount)
            ? amount
            : null
      );
      setPixMsg("");
    } catch (err) {
      console.error("[PROMOCIONAL_PIX_ERROR]", err);
      const apiMessage =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        "Não foi possível gerar o PIX promocional.";

      setPixMsg(apiMessage);
      setError(apiMessage);
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
      setNumbers(applyLocalReservedNumbers(loadedNumbers.length ? loadedNumbers : buildNumbersFromRange(drawData)));
    } catch (err) {
      setError(err?.message || "Nao foi possivel carregar este sorteio promocional.");
    } finally {
      setLoading(false);
    }
  }, [applyLocalReservedNumbers, id]);

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

    if (!user) {
      setMessage("");
      setError("Entre ou crie uma conta para reservar números promocionais.");
      saveReturnRouteAndGoLogin();
      return;
    }

    if (!selectedNumbers.length) {
      setError("Selecione pelo menos um número disponível.");
      return;
    }

    const availableNumbers = new Set();
    numbers.filter((item) => isPromocionalNumberAvailable(item)).forEach((item) => {
      const value = getNumberValue(item);
      const parsed = Number.parseInt(value, 10);
      availableNumbers.add(String(value));
      if (Number.isFinite(parsed)) availableNumbers.add(String(parsed));
    });

    const numbersToReserve = selectedNumbers
      .map(getNumberValue)
      .map((number) => Number.parseInt(number, 10))
      .filter((number) => Number.isFinite(number))
      .filter((number) => availableNumbers.has(String(number)));

    if (numbersToReserve.length !== selectedNumbers.length) {
      setSelectedNumbers(numbersToReserve);
      setError("Alguns números selecionados não estão mais disponíveis.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      setPendingReservation(null);

      const payload = await reservePromocionalNumbers(id, { numbers: numbersToReserve });

      if (!payload || payload?.ok === false) {
        throw new Error(payload?.message || "Erro ao processar número promocional.");
      }

      const reservation = getReservationFromPayload(payload, id);

      if (!reservation?.reservation_id && !reservation?.reservationId) {
        throw new Error("Reserva criada, mas o backend não retornou o ID da reserva.");
      }

      setPendingReservation(reservation);
      const reservedNumbers = reservation?.numbers?.length ? reservation.numbers : numbersToReserve;
      const reservedKeys = new Set(reservedNumbers.map(getComparableNumber));
      const localReservation = {
        reservationId: reservation.reservation_id || reservation.reservationId,
        expiresAt: Date.now() + 30 * 60 * 1000,
      };

      reservedKeys.forEach((number) => {
        localReservedNumbersRef.current.set(number, localReservation);
      });

      setNumbers((currentNumbers) =>
        currentNumbers.map((item) => {
          const rawNumber = getNumberValue(item);

          if (!reservedKeys.has(getComparableNumber(rawNumber))) {
            return item;
          }

          return {
            ...(typeof item === "object" && item !== null ? item : { number: rawNumber }),
            status: "reserved",
            reserved: true,
            unavailable: true,
            reservation_id: reservation.reservation_id || reservation.reservationId,
          };
        })
      );
      setSelectedNumbers([]);

      const pixPayload = payload?.pix || payload?.data?.pix || null;
      await openPromotionalPix(reservation, pixPayload);

      await loadDraw();
    } catch (err) {
      console.error("[PROMOCIONAL_FRONT_ERROR]", err);

      if (err?.status === 401 || /(^|:)401$/.test(String(err?.message || ""))) {
        saveReturnRouteAndGoLogin();
        return;
      }

      const apiMessage =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        "Erro inesperado ao processar a solicitação.";

      setError(apiMessage);
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
