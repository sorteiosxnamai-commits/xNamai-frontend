// src/AdminDashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  createAdminDraw,
  getAdminSummary,
  updateAdminConfig,
} from "./services/adminDraws";

function moneyFromCents(cents) {
  const value = Number(cents || 0) / 100;

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyNumbers(value) {
  return String(value || "").replace(/\D/g, "");
}

function clampPercent(value, fallback = 100) {
  if (value === undefined || value === null || value === "") return fallback;

  const parsed = Number.parseInt(String(value).replace(/\D/g, ""), 10);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(0, Math.min(100, parsed));
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "48px 20px 80px",
    background:
      "radial-gradient(circle at 10% 15%, rgba(37, 99, 235, 0.13), transparent 30%), radial-gradient(circle at 90% 20%, rgba(34, 211, 238, 0.17), transparent 32%), linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
    color: "#0f1f3a",
  },
  shell: {
    width: "100%",
    maxWidth: "1150px",
    margin: "0 auto",
  },
  title: {
    fontSize: "36px",
    lineHeight: 1.1,
    margin: "0 0 10px",
    fontWeight: 500,
  },
  subtitle: {
    margin: "0 0 22px",
    color: "#53617a",
    fontSize: "16px",
  },
  card: {
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(15, 31, 58, 0.08)",
    borderRadius: "16px",
    boxShadow: "0 20px 45px rgba(15, 31, 58, 0.10)",
    padding: "24px",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  stats: {
    display: "flex",
    gap: "28px",
    flexWrap: "wrap",
  },
  statLabel: {
    fontSize: "15px",
    color: "#526078",
    fontWeight: 800,
  },
  statValue: {
    fontSize: "34px",
    color: "#0b1933",
    fontWeight: 900,
    marginTop: "6px",
  },
  outlineButton: {
    border: "1px solid #cfe0ff",
    background: "#fff",
    color: "#0b1933",
    borderRadius: "999px",
    padding: "12px 22px",
    fontWeight: 900,
    cursor: "pointer",
    letterSpacing: ".02em",
    boxShadow: "0 10px 28px rgba(37, 99, 235, 0.09)",
  },
  primaryButton: {
    border: "none",
    background: "linear-gradient(135deg, #1e63ff, #0b58ff)",
    color: "#fff",
    borderRadius: "999px",
    padding: "13px 24px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(37, 99, 235, 0.24)",
  },
  secondaryButton: {
    border: "1px solid #dbe6fb",
    background: "#fff",
    color: "#1e63ff",
    borderRadius: "999px",
    padding: "12px 20px",
    fontWeight: 900,
    cursor: "pointer",
  },
  divider: {
    height: "1px",
    background: "rgba(15, 31, 58, 0.10)",
    margin: "22px 0",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
  },
  full: {
    gridColumn: "1 / -1",
  },
  label: {
    display: "block",
    color: "#526078",
    fontSize: "14px",
    fontWeight: 900,
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    height: "56px",
    border: "1px solid #d5ddeb",
    borderRadius: "12px",
    padding: "0 14px",
    outline: "none",
    fontSize: "15px",
    color: "#0f1f3a",
    background: "#fff",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    minHeight: "86px",
    border: "1px solid #d5ddeb",
    borderRadius: "12px",
    padding: "14px",
    outline: "none",
    fontSize: "15px",
    color: "#0f1f3a",
    background: "#fff",
    boxSizing: "border-box",
    resize: "vertical",
  },
  hint: {
    marginTop: "8px",
    fontSize: "13px",
    color: "#64748b",
  },
  quickTitle: {
    margin: "28px 0 12px",
    fontWeight: 900,
  },
  quickGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },
  quickCard: {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(15, 31, 58, 0.08)",
    borderRadius: "14px",
    padding: "20px",
    cursor: "pointer",
    boxShadow: "0 10px 26px rgba(15, 31, 58, 0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
  },
  quickName: {
    fontWeight: 900,
    color: "#0b1933",
    marginBottom: "6px",
  },
  quickDesc: {
    color: "#53617a",
    fontSize: "14px",
  },
  error: {
    marginTop: "14px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    color: "#be123c",
    fontWeight: 800,
  },
  success: {
    marginTop: "14px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    color: "#047857",
    fontWeight: 800,
  },
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = React.useState(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [savingConfig, setSavingConfig] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const [configForm, setConfigForm] = React.useState({
    ticket_price_cents: "5500",
    max_numbers_per_selection: "5",
    promo_text: "",
    cashback_percent: "100",
  });

  const [createForm, setCreateForm] = React.useState({
    title: "",
    prize_title: "",
    promo_text: "",
    ticket_price_cents: "5500",
    max_numbers_per_selection: "5",
    cashback_percent: "100",
  });

  async function loadSummary() {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminSummary();
      setSummary(data);

      const draw = data?.draw || data?.current_draw || data?.currentDraw;
      const config = data?.config || {};

      setConfigForm({
        ticket_price_cents: String(
          draw?.ticket_price_cents ||
            config.ticket_price_cents ||
            config.price_cents ||
            5500
        ),
        max_numbers_per_selection: String(
          draw?.max_numbers_per_user ||
            config.max_numbers_per_selection ||
            config.max_numbers_per_user ||
            5
        ),
        promo_text: draw?.promo_text || config.promo_text || config.banner_title || "",
        cashback_percent: String(
          draw?.cashback_percent ??
            data?.currentDraw?.cashback_percent ??
            config.cashback_percent ??
            100
        ),
      });

      setCreateForm((old) => ({
        ...old,
        ticket_price_cents: String(
          draw?.ticket_price_cents ||
            config.ticket_price_cents ||
            config.price_cents ||
            5500
        ),
        max_numbers_per_selection: String(
          draw?.max_numbers_per_user ||
            config.max_numbers_per_selection ||
            config.max_numbers_per_user ||
            5
        ),
        cashback_percent: String(
          draw?.cashback_percent ??
            data?.currentDraw?.cashback_percent ??
            config.cashback_percent ??
            old.cashback_percent ??
            100
        ),
      }));
    } catch (err) {
      setError(err.message || "Erro ao carregar painel admin.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadSummary();

    function handleNumbersUpdated() {
      loadSummary();
    }

    window.addEventListener("xnamai:numbers-updated", handleNumbersUpdated);

    return () => {
      window.removeEventListener("xnamai:numbers-updated", handleNumbersUpdated);
    };
  }, []);

  const draw = summary?.draw || summary?.current_draw || summary?.currentDraw;

  const sold = Number(draw?.sold_numbers || summary?.sold_numbers || 0);
  const remaining = Number(draw?.remaining_numbers || summary?.remaining_numbers || 0);

  async function handleSaveConfig(event) {
    event.preventDefault();

    try {
      setSavingConfig(true);
      setError("");
      setMessage("");

      await updateAdminConfig({
        ticket_price_cents: Number(onlyNumbers(configForm.ticket_price_cents) || 5500),
        max_numbers_per_selection: Number(
          onlyNumbers(configForm.max_numbers_per_selection) || 5
        ),
        promo_text: configForm.promo_text,
        cashback_percent: clampPercent(configForm.cashback_percent),
      });

      setMessage("Configurações atualizadas com sucesso.");
      await loadSummary();
    } catch (err) {
      setError(err.message || "Erro ao atualizar configurações.");
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleCreateDraw(event) {
    event.preventDefault();

    const title = createForm.title.trim();
    const prizeTitle = createForm.prize_title.trim();

    if (!title && !prizeTitle) {
      setError("Informe pelo menos o nome ou o prêmio do sorteio.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setMessage("");

      const payload = {
        title,
        prize_title: prizeTitle,
        promo_text: createForm.promo_text.trim(),
        ticket_price_cents: Number(onlyNumbers(createForm.ticket_price_cents) || 5500),
        max_numbers_per_selection: Number(
          onlyNumbers(createForm.max_numbers_per_selection) || 5
        ),
        cashback_percent: clampPercent(createForm.cashback_percent),
        numbers_count: 100,
        numbers_start: 0,
        numbers_end: 99,
      };

      const data = await createAdminDraw(payload);

      setMessage(`Sorteio #${data?.draw?.id || ""} criado com sucesso com números de 00 a 99.`);
      setShowCreate(false);
      setCreateForm({
        title: "",
        prize_title: "",
        promo_text: "",
        ticket_price_cents: String(payload.ticket_price_cents),
        max_numbers_per_selection: String(payload.max_numbers_per_selection),
        cashback_percent: String(payload.cashback_percent),
      });

      await loadSummary();
    } catch (err) {
      setError(err.message || "Erro ao criar sorteio.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main style={{ ...styles.page, padding: 0, background: "transparent" }}>
      <div style={{ ...styles.shell, margin: 0, maxWidth: "100%" }}>
        <h1 style={styles.title}>Painel Admin</h1>
        <p style={styles.subtitle}>
          Configure o sorteio atual e acesse rapidamente as áreas principais.
        </p>

        <section style={styles.card}>
          <div style={styles.topRow}>
            <div style={styles.stats}>
              <div>
                <div style={styles.statLabel}>Nº Sorteio atual</div>
                <div style={styles.statValue}>{loading ? "..." : draw?.id || "-"}</div>
              </div>

              <div>
                <div style={styles.statLabel}>Números vendidos</div>
                <div style={styles.statValue}>{loading ? "..." : sold}</div>
              </div>

              <div>
                <div style={styles.statLabel}>Números restantes</div>
                <div style={styles.statValue}>{loading ? "..." : remaining}</div>
              </div>

              <div>
                <div style={styles.statLabel}>Valor atual</div>
                <div style={{ ...styles.statValue, fontSize: 24 }}>
                  {moneyFromCents(draw?.ticket_price_cents || configForm.ticket_price_cents)}
                </div>
              </div>
            </div>

            <button
              type="button"
              style={styles.outlineButton}
              onClick={() => {
                setShowCreate((value) => !value);
                setError("");
                setMessage("");
              }}
            >
              NOVO SORTEIO
            </button>
          </div>

          {error ? <div style={styles.error}>{error}</div> : null}
          {message ? <div style={styles.success}>{message}</div> : null}

          {showCreate ? (
            <>
              <div style={styles.divider} />

              <form onSubmit={handleCreateDraw}>
                <h2 style={{ margin: "0 0 18px", fontSize: 24 }}>
                  Criar novo sorteio
                </h2>

                <div style={styles.formGrid}>
                  <label>
                    <span style={styles.label}>Nome do sorteio</span>
                    <input
                      style={styles.input}
                      value={createForm.title}
                      onChange={(e) =>
                        setCreateForm((old) => ({ ...old, title: e.target.value }))
                      }
                      placeholder="Ex.: Sorteio Watch Winder"
                    />
                  </label>

                  <label>
                    <span style={styles.label}>Prêmio / item</span>
                    <input
                      style={styles.input}
                      value={createForm.prize_title}
                      onChange={(e) =>
                        setCreateForm((old) => ({
                          ...old,
                          prize_title: e.target.value,
                        }))
                      }
                      placeholder="Ex.: Watch Winder Premium"
                    />
                  </label>

                  <label>
                    <span style={styles.label}>Valor por ticket em centavos</span>
                    <input
                      style={styles.input}
                      value={createForm.ticket_price_cents}
                      onChange={(e) =>
                        setCreateForm((old) => ({
                          ...old,
                          ticket_price_cents: onlyNumbers(e.target.value),
                        }))
                      }
                      placeholder="5500"
                    />
                    <div style={styles.hint}>
                      5500 = R$ 55,00
                    </div>
                  </label>

                  <label>
                    <span style={styles.label}>Cashback / saldo (%)</span>
                    <input
                      style={styles.input}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={createForm.cashback_percent}
                      onChange={(e) =>
                        setCreateForm((old) => ({
                          ...old,
                          cashback_percent: e.target.value,
                        }))
                      }
                      placeholder="100"
                    />
                    <div style={styles.hint}>
                      Ex.: se o número custa R$ 100,00 e o cashback for 50%, o cliente recebe
                      R$ 50,00 de saldo.
                    </div>
                  </label>

                  <label>
                    <span style={styles.label}>Máximo de tickets por compra</span>
                    <input
                      style={styles.input}
                      value={createForm.max_numbers_per_selection}
                      onChange={(e) =>
                        setCreateForm((old) => ({
                          ...old,
                          max_numbers_per_selection: onlyNumbers(e.target.value),
                        }))
                      }
                      placeholder="5"
                    />
                  </label>

                  <label style={styles.full}>
                    <span style={styles.label}>Frase promocional</span>
                    <textarea
                      style={styles.textarea}
                      value={createForm.promo_text}
                      onChange={(e) =>
                        setCreateForm((old) => ({
                          ...old,
                          promo_text: e.target.value,
                        }))
                      }
                      placeholder="Ex.: Participe e concorra..."
                    />
                  </label>

                  <div style={styles.full}>
                    <span style={styles.label}>Grade de números</span>
                    <input
                      style={{
                        ...styles.input,
                        background: "#f8fbff",
                        color: "#53617a",
                        fontWeight: 800,
                      }}
                      value="00 até 99 — 100 números fixos"
                      readOnly
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
                  <button type="submit" style={styles.primaryButton} disabled={creating}>
                    {creating ? "CRIANDO..." : "CRIAR SORTEIO"}
                  </button>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => setShowCreate(false)}
                    disabled={creating}
                  >
                    CANCELAR
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div style={styles.divider} />

              <form onSubmit={handleSaveConfig}>
                <div style={styles.formGrid}>
                  <label>
                    <span style={styles.label}>Valor por ticket</span>
                    <input
                      style={styles.input}
                      value={configForm.ticket_price_cents}
                      onChange={(e) =>
                        setConfigForm((old) => ({
                          ...old,
                          ticket_price_cents: onlyNumbers(e.target.value),
                        }))
                      }
                      placeholder="em centavos (ex.: 5500)"
                    />
                  </label>

                  <label>
                    <span style={styles.label}>Cashback / saldo (%)</span>
                    <input
                      style={styles.input}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={configForm.cashback_percent}
                      onChange={(e) =>
                        setConfigForm((old) => ({
                          ...old,
                          cashback_percent: e.target.value,
                        }))
                      }
                      placeholder="100"
                    />
                    <div style={styles.hint}>
                      Define quanto do valor pago vira saldo/cartão presente. Ex.: 50% de R$
                      100,00 gera R$ 50,00 de saldo.
                    </div>
                  </label>

                  <label>
                    <span style={styles.label}>Máximo de Tickets permitidos</span>
                    <input
                      style={styles.input}
                      value={configForm.max_numbers_per_selection}
                      onChange={(e) =>
                        setConfigForm((old) => ({
                          ...old,
                          max_numbers_per_selection: onlyNumbers(e.target.value),
                        }))
                      }
                      placeholder="5"
                    />
                  </label>

                  <label style={styles.full}>
                    <span style={styles.label}>Frase promocional</span>
                    <input
                      style={styles.input}
                      value={configForm.promo_text}
                      onChange={(e) =>
                        setConfigForm((old) => ({
                          ...old,
                          promo_text: e.target.value,
                        }))
                      }
                      placeholder="Ex.: Sorteio de um Watch Winder..."
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  style={{ ...styles.primaryButton, marginTop: 20 }}
                  disabled={savingConfig}
                >
                  {savingConfig ? "ATUALIZANDO..." : "ATUALIZAR"}
                </button>
              </form>
            </>
          )}
        </section>

        <h3 style={styles.quickTitle}>Acessos rápidos</h3>

        <section style={styles.quickGrid}>
          <div
            style={styles.quickCard}
            onClick={() => navigate("/admin/AdminClientesUser")}
          >
            <div>
              <div style={styles.quickName}>Cadastro e manutenção de clientes</div>
              <div style={styles.quickDesc}>
                Criar/editar clientes, saldo de cupom e permissões.
              </div>
            </div>
            <strong>→</strong>
          </div>

          <div
            style={styles.quickCard}
            onClick={() => navigate("/admin/sorteiosAtivos")}
          >
            <div>
              <div style={styles.quickName}>Sorteio ativo — compradores</div>
              <div style={styles.quickDesc}>
                Ver compradores e exportar CSV/PNG do sorteio aberto.
              </div>
            </div>
            <strong>→</strong>
          </div>

          <div
            style={styles.quickCard}
            onClick={() => navigate("/admin/analytics")}
          >
            <div>
              <div style={styles.quickName}>Dashboard — análise</div>
              <div style={styles.quickDesc}>
                KPIs, gráficos e tabelas de performance.
              </div>
            </div>
            <strong>→</strong>
          </div>

          <div
            style={styles.quickCard}
            onClick={() => navigate("/admin/sorteios")}
          >
            <div>
              <div style={styles.quickName}>Lista de sorteios realizados</div>
              <div style={styles.quickDesc}>
                Histórico, status e organização dos sorteios.
              </div>
            </div>
            <strong>→</strong>
          </div>

          <div
            style={styles.quickCard}
            onClick={() => navigate("/admin/clientes")}
          >
            <div>
              <div style={styles.quickName}>Lista de clientes com saldo ativo</div>
              <div style={styles.quickDesc}>
                Clientes com saldo, cupom e dados ativos.
              </div>
            </div>
            <strong>→</strong>
          </div>

          <div
            style={styles.quickCard}
            onClick={() => navigate("/admin/historico-compras")}
          >
            <div>
              <div style={styles.quickName}>Histórico de compras dos clientes</div>
              <div style={styles.quickDesc}>
                Veja todos os clientes, sorteios comprados, números, valores e datas.
              </div>
            </div>
            <strong>→</strong>
          </div>

          <div
            style={styles.quickCard}
            onClick={() => navigate("/admin/vencedores")}
          >
            <div>
              <div style={styles.quickName}>Lista de vencedores dos sorteios</div>
              <div style={styles.quickDesc}>
                Vencedores, prêmios e links dos produtos.
              </div>
            </div>
            <strong>→</strong>
          </div>

          <div
            style={styles.quickCard}
            onClick={() => navigate("/promocional/admin")}
          >
            <div>
              <div style={styles.quickName}>Sorteios Promocionais</div>
              <div style={styles.quickDesc}>
                Gerencie campanhas promocionais separadas do sorteio principal.
              </div>
            </div>
            <strong>→</strong>
          </div>
        </section>
      </div>
    </main>
  );
}
