import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./authContext";

export default function XnamaiAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const [profileOpen, setProfileOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  const normalizedPath = String(location.pathname || "").replace(/\/+$/, "");
  const isAdminHome = normalizedPath === "/admin";

  React.useEffect(() => {
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function goAdminHome() {
    setProfileOpen(false);
    navigate("/admin");
  }

  function handleSwitchAccount() {
    setProfileOpen(false);

    try {
      logout();
    } catch (error) {
      console.warn("[XnamaiAdminLayout] logout falhou:", error);
    }

    navigate("/login", { replace: true });
  }

  return (
    <div className="xnamai-admin-page">
      <header className="xnamai-admin-site-header">
        <button
          type="button"
          className="xnamai-admin-header-link"
          onClick={() => navigate("/cadastro")}
        >
          CRIAR CONTA
        </button>

        <button
          type="button"
          className="xnamai-admin-header-logo"
          onClick={() => navigate("/admin")}
          aria-label="Ir para o painel admin"
        >
          XNAMAI
        </button>

        <div className="xnamai-admin-profile-wrap" ref={menuRef}>
          <button
            type="button"
            className="xnamai-admin-profile-icon"
            onClick={() => setProfileOpen((value) => !value)}
            aria-label="Abrir menu de perfil"
          >
            <span>●</span>
          </button>

          {profileOpen && (
            <div className="xnamai-admin-profile-menu">
              {!isAdminHome && (
                <button type="button" onClick={goAdminHome}>
                  Painel Admin
                </button>
              )}

                <button type="button" onClick={handleSwitchAccount}>
                  Trocar de conta
                </button>
            </div>
          )}
        </div>
      </header>

      <main className="xnamai-admin-content">
        <Outlet />
      </main>
    </div>
  );
}

