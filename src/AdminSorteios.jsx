import React from "react";
import AdminDrawsList from "./components/AdminDrawsList";

export default function AdminSorteios() {
  return (
    <main className="admin-sorteios-page">
      <section className="admin-sorteios-page__hero">
        <h1>Sorteios criados</h1>
        <p>Histórico e organização dos sorteios cadastrados no painel admin.</p>
      </section>

      <section className="admin-sorteios-page__card">
        <AdminDrawsList />
      </section>

      <style>{`
        .admin-sorteios-page {
          background:
            radial-gradient(circle at top right, rgba(0, 211, 255, 0.16), transparent 36%),
            radial-gradient(circle at bottom left, rgba(37, 99, 235, 0.12), transparent 32%),
            linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%);
        }

        .admin-sorteios-page__hero {
          width: min(1150px, 100%);
          margin: 0 auto 24px;
        }

        .admin-sorteios-page__hero h1 {
          margin: 0;
          color: #071833;
          font-size: clamp(30px, 4vw, 44px);
          font-weight: 500;
        }

        .admin-sorteios-page__hero p {
          margin: 10px 0 0;
          color: #526179;
          font-size: 16px;
        }

        .admin-sorteios-page__card {
          width: min(1150px, 100%);
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 22px;
          box-shadow: 0 22px 60px rgba(15, 23, 42, 0.08);
          padding: 22px;
          backdrop-filter: blur(14px);
        }

        @media (max-width: 768px) {
          .admin-sorteios-page__card {
            padding: 14px;
            border-radius: 18px;
          }
        }
      `}</style>
    </main>
  );
}
