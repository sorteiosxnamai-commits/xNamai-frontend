import React from "react";
import { NavLink, Outlet } from "react-router-dom";

function navClassName({ isActive }) {
  return isActive
    ? "promocional-nav-link promocional-nav-link--active"
    : "promocional-nav-link";
}

export default function PromocionalAdminLayout() {
  return (
    <main className="promocional-admin-page">
      <header className="promocional-admin-header">
        <div>
          <p className="promocional-eyebrow">Modulo isolado</p>
          <h1>Promocional xNaMai</h1>
        </div>

        <nav className="promocional-admin-nav" aria-label="Navegacao promocional">
          <NavLink className="promocional-nav-link" to="/admin">
            Painel xNaMai
          </NavLink>
          <NavLink className={navClassName} to="/promocional/admin" end>
            Campanhas
          </NavLink>
          <NavLink className={navClassName} to="/promocional/admin/novo">
            Novo sorteio
          </NavLink>
        </nav>
      </header>

      <Outlet />
    </main>
  );
}
