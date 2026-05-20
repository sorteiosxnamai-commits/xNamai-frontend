import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  adminCreatePromocionalDraw,
  adminGetPromocionalDraw,
  adminUpdatePromocionalDraw,
} from "../services/promocionalApi";

const EMPTY_FORM = {
  title: "",
  description: "",
  prize: "",
  price_cents: "5500",
  number_start: "0",
  number_end: "99",
  max_numbers_per_user: "1",
  status: "inactive",
  starts_at: "",
  ends_at: "",
  banner_url: "",
};

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getDrawFromPayload(payload) {
  return payload?.draw || payload?.data || payload || {};
}

function mapDrawToForm(draw) {
  return {
    title: draw?.title || "",
    description: draw?.description || "",
    prize: draw?.prize || draw?.award || "",
    price_cents: String(draw?.price_cents ?? draw?.priceCents ?? 0),
    number_start: String(draw?.number_start ?? draw?.numberStart ?? 0),
    number_end: String(draw?.number_end ?? draw?.numberEnd ?? 99),
    max_numbers_per_user: String(draw?.max_numbers_per_user ?? draw?.maxNumbersPerUser ?? 1),
    status: draw?.status || "inactive",
    starts_at: toDateTimeLocal(draw?.starts_at ?? draw?.startsAt),
    ends_at: toDateTimeLocal(draw?.ends_at ?? draw?.endsAt),
    banner_url: draw?.banner_url || draw?.bannerUrl || draw?.banner || "",
  };
}

function validateForm(form) {
  const numberStart = Number.parseInt(form.number_start, 10);
  const numberEnd = Number.parseInt(form.number_end, 10);
  const priceCents = Number.parseInt(form.price_cents, 10);
  const maxNumbers = Number.parseInt(form.max_numbers_per_user, 10);

  if (!form.title.trim()) return "Titulo obrigatorio.";
  if (!Number.isFinite(numberStart) || numberStart < 0) return "Numero inicial deve ser maior ou igual a 0.";
  if (!Number.isFinite(numberEnd) || numberEnd > 1000) return "Numero final deve ser menor ou igual a 1000.";
  if (numberEnd <= numberStart) return "Numero final deve ser maior que o numero inicial.";
  if (!Number.isFinite(priceCents) || priceCents < 0) return "Valor de referencia deve ser zero ou maior.";
  if (!Number.isFinite(maxNumbers) || maxNumbers <= 0) return "Maximo por usuario deve ser maior que 0.";
  return "";
}

function buildPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    prize: form.prize.trim(),
    price_cents: Number.parseInt(form.price_cents, 10),
    number_start: Number.parseInt(form.number_start, 10),
    number_end: Number.parseInt(form.number_end, 10),
    max_numbers_per_user: Number.parseInt(form.max_numbers_per_user, 10),
    status: form.status,
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
    banner_url: form.banner_url.trim() || null,
  };
}

export default function PromocionalDrawForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [loading, setLoading] = React.useState(isEditing);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    let active = true;

    async function loadDraw() {
      if (!isEditing) return;

      try {
        setLoading(true);
        setError("");
        const payload = await adminGetPromocionalDraw(id);
        if (active) setForm(mapDrawToForm(getDrawFromPayload(payload)));
      } catch (err) {
        if (active) setError(err?.message || "Nao foi possivel carregar o sorteio promocional.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDraw();
    return () => {
      active = false;
    };
  }, [id, isEditing]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateForm(form);

    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = buildPayload(form);
      if (isEditing) {
        await adminUpdatePromocionalDraw(id, payload);
        setMessage("Sorteio promocional atualizado com sucesso.");
      } else {
        await adminCreatePromocionalDraw(payload);
        navigate("/promocional/admin");
      }
    } catch (err) {
      setError(err?.message || "Nao foi possivel salvar o sorteio promocional.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="promocional-admin-section">
      <Link className="promocional-back-link" to="/promocional/admin">
        ← Voltar para campanhas
      </Link>

      <div className="promocional-admin-toolbar">
        <div>
          <h2>{isEditing ? "Editar sorteio promocional" : "Novo sorteio promocional"}</h2>
          <p>Configure uma campanha promocional isolada do sorteio principal.</p>
        </div>
      </div>

      {loading ? (
        <p className="promocional-info">Carregando formulario...</p>
      ) : (
        <form className="promocional-form" onSubmit={handleSubmit}>
          {error && <p className="promocional-error">{error}</p>}
          {message && <p className="promocional-success">{message}</p>}

          <label className="promocional-field">
            <span>Titulo *</span>
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Ex.: Promocao relogio premium"
            />
          </label>

          <label className="promocional-field promocional-field--full">
            <span>Descricao</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              rows={4}
            />
          </label>

          <label className="promocional-field">
            <span>Premio</span>
            <input
              value={form.prize}
              onChange={(event) => updateField("prize", event.target.value)}
            />
          </label>

          <label className="promocional-field">
            <span>Valor de referência em centavos, opcional</span>
            <input
              type="number"
              min="0"
              value={form.price_cents}
              onChange={(event) => updateField("price_cents", event.target.value)}
            />
            <small className="promocional-field-hint">
              Este valor é apenas informativo. O sorteio promocional não gera compra nem PIX pelo site.
            </small>
          </label>

          <label className="promocional-field">
            <span>Numero inicial</span>
            <input
              type="number"
              min="0"
              max="1000"
              value={form.number_start}
              onChange={(event) => updateField("number_start", event.target.value)}
            />
          </label>

          <label className="promocional-field">
            <span>Numero final</span>
            <input
              type="number"
              min="1"
              max="1000"
              value={form.number_end}
              onChange={(event) => updateField("number_end", event.target.value)}
            />
          </label>

          <label className="promocional-field">
            <span>Maximo por usuario</span>
            <input
              type="number"
              min="1"
              value={form.max_numbers_per_user}
              onChange={(event) => updateField("max_numbers_per_user", event.target.value)}
            />
          </label>

          <label className="promocional-field">
            <span>Status</span>
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
              <option value="inactive">Inativo</option>
              <option value="active">Ativo</option>
              <option value="closed">Encerrado</option>
            </select>
          </label>

          <label className="promocional-field">
            <span>Data inicial opcional</span>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(event) => updateField("starts_at", event.target.value)}
            />
          </label>

          <label className="promocional-field">
            <span>Data final opcional</span>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(event) => updateField("ends_at", event.target.value)}
            />
          </label>

          <label className="promocional-field promocional-field--full">
            <span>Banner opcional</span>
            <input
              value={form.banner_url}
              onChange={(event) => updateField("banner_url", event.target.value)}
              placeholder="https://..."
            />
          </label>

          <div className="promocional-form-actions">
            <button type="submit" className="promocional-primary-button" disabled={saving}>
              {saving ? "Salvando..." : "Salvar sorteio"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
