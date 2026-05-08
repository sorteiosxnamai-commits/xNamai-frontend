import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function XnamaiAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const currentPath = useMemo(() => {
    const normalized = (location.pathname || "").replace(/\/+$/, "");
    return normalized || "/";
  }, [location.pathname]);

  const isAdminHome = currentPath === "/admin";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearAdminSession = () => {
    try {
      const exactKeys = [
        "adminToken",
        "token",
        "authToken",
        "accessToken",
        "refreshToken",
        "user",
        "adminUser",
        "isAdmin",
        "xnamaiUser",
        "xnamaiAdmin",
        "newstoreUser",
        "newstoreAdmin",
      ];

      exactKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      Object.keys(localStorage).forEach((key) => {
        const lower = key.toLowerCase();
        if (
          lower.includes("token") ||
          lower.includes("auth") ||
          lower.includes("admin") ||
          lower.includes("user") ||
          lower.includes("xnamai") ||
          lower.includes("newstore")
        ) {
          localStorage.removeItem(key);
        }
      });

      Object.keys(sessionStorage).forEach((key) => {
        const lower = key.toLowerCase();
        if (
          lower.includes("token") ||
          lower.includes("auth") ||
          lower.includes("admin") ||
          lower.includes("user") ||
          lower.includes("xnamai") ||
          lower.includes("newstore")
        ) {
          sessionStorage.removeItem(key);
        }
      });

      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0]?.trim();
        if (!name) return;

        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/admin`;
      });
    } catch (error) {
      console.warn("Erro ao limpar sessão admin:", error);
    }
  };

  const handleBackToAdmin = () => {
    navigate("/admin");
  };

  const handleSwitchAccount = () => {
    setProfileOpen(false);
    clearAdminSession();

    setTimeout(() => {
      window.location.replace("/");
    }, 80);
  };

  return (
    <main className="xnamai-admin-layout">
      <div className="xnamai-admin-container">
        <header className="xnamai-admin-topbar">
          <div className="xnamai-admin-topbar-left">
            {!isAdminHome ? (
              <button
                type="button"
                className="xnamai-admin-back-button"
                onClick={handleBackToAdmin}
                aria-label="Voltar ao painel"
                title="Voltar ao painel"
              >
                ←
              </button>
            ) : (
              <div className="xnamai-admin-back-placeholder" />
            )}
          </div>

          <div className="xnamai-admin-topbar-right" ref={profileRef}>
            <button
              type="button"
              className="xnamai-admin-profile-button"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="Abrir menu do perfil"
              title="Perfil"
            >
              👤
            </button>

            {profileOpen && (
              <div className="xnamai-admin-profile-menu">
                <button type="button" onClick={handleSwitchAccount}>
                  Trocar de conta
                </button>
              </div>
            )}
          </div>
        </header>

        <Outlet />
      </div>
    </main>
  );
}

