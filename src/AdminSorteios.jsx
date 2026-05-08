import React from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import AdminDrawsList from "./components/AdminDrawsList";

export default function AdminSorteios() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const profileRef = React.useRef(null);

  React.useEffect(() => {
    function onDocMouseDown(e) {
      if (!profileOpen) return;
      if (!profileRef.current) return;
      if (profileRef.current.contains(e.target)) return;
      setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [profileOpen]);

  const handleAdminLogout = React.useCallback(() => {
    try {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("adminUser");
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("xnamaiUser");
      localStorage.removeItem("xnamaiAdmin");

      sessionStorage.clear();

      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0].trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Erro ao limpar sessão admin:", error);
    }

    window.location.href = "/";
  }, []);

  const goToMainMenu = React.useCallback(() => {
    navigate("/");
  }, [navigate]);

  return (
    <main className="admin-sorteios-page">
      <header className="admin-topbar">
        <button className="admin-back-icon" onClick={goToMainMenu} type="button" aria-label="Voltar">
          <ArrowBackIosNewRoundedIcon fontSize="small" />
        </button>

        <div className="admin-profile-area" ref={profileRef}>
          <button
            className="admin-profile-btn"
            onClick={() => setProfileOpen((prev) => !prev)}
            type="button"
            aria-label="Abrir menu de perfil"
          >
            <span className="admin-profile-avatar">A</span>
            <span className="admin-profile-label">Admin</span>
            <span className="admin-profile-arrow">⌄</span>
          </button>

          {profileOpen && (
            <div className="admin-profile-menu">
              <button type="button" onClick={handleAdminLogout}>
                Sair do admin
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="admin-sorteios-page__hero">
        <h1>Sorteios criados</h1>
        <p>Histórico e organização dos sorteios cadastrados no painel admin.</p>
      </section>

      <section className="admin-sorteios-page__card">
        <AdminDrawsList />
      </section>

      <style>{`
        .admin-sorteios-page {
          min-height: 100vh;
          padding: 64px 20px;
          background:
            radial-gradient(circle at top right, rgba(0, 211, 255, 0.16), transparent 36%),
            radial-gradient(circle at bottom left, rgba(37, 99, 235, 0.12), transparent 32%),
            linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%);
        }

        .admin-topbar {
          width: min(1150px, 100%);
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 0 4px;
          position: relative;
          z-index: 20;
        }

        .admin-back-icon {
          width: 44px;
          height: 44px;
          display: inline-grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(37, 99, 235, 0.18);
          background: rgba(255, 255, 255, 0.72);
          color: #001f4f;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
          transition: all 0.22s ease;
          backdrop-filter: blur(12px);
        }

        .admin-back-icon:hover {
          transform: translateY(-1px);
          background: #ffffff;
          border-color: rgba(37, 99, 235, 0.35);
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
        }

        .admin-profile-area {
          position: relative;
          display: flex;
          align-items: center;
        }

        .admin-profile-btn {
          border: 1px solid rgba(37, 99, 235, 0.18);
          background: rgba(255, 255, 255, 0.78);
          color: #001f4f;
          border-radius: 999px;
          padding: 8px 12px 8px 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
          transition: all 0.22s ease;
          backdrop-filter: blur(12px);
        }

        .admin-profile-btn:hover {
          background: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.12);
        }

        .admin-profile-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0f5bff, #6ea8ff);
          color: #ffffff;
          display: grid;
          place-items: center;
          font-size: 14px;
          font-weight: 900;
        }

        .admin-profile-label {
          font-size: 14px;
          font-weight: 900;
        }

        .admin-profile-arrow {
          font-size: 16px;
          line-height: 1;
          opacity: 0.75;
        }

        .admin-profile-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 210px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          box-shadow: 0 22px 60px rgba(15, 23, 42, 0.16);
          padding: 8px;
          z-index: 50;
        }

        .admin-profile-menu button {
          width: 100%;
          border: none;
          background: transparent;
          color: #001f4f;
          text-align: left;
          padding: 12px 14px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 800;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .admin-profile-menu button:hover {
          background: rgba(15, 91, 255, 0.08);
          color: #0f5bff;
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
          .admin-sorteios-page {
            padding: 40px 14px;
          }

          .admin-topbar {
            margin-bottom: 18px;
          }

          .admin-profile-label {
            display: none;
          }

          .admin-profile-btn {
            padding: 7px;
          }

          .admin-profile-menu {
            width: 190px;
          }

          .admin-sorteios-page__card {
            padding: 14px;
            border-radius: 18px;
          }
        }
      `}</style>
    </main>
  );
}
