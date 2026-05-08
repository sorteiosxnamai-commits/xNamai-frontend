// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { SelectionContext } from "./selectionContext";
import NewStorePage from "./NewStorePage";
import AccountPage from "./AccountPage";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

import { AuthProvider } from "./authContext";
import ProtectedRoute from "./ProtectedRoute";
import NonAdminRoute from "./NonAdminRoute";
import AdminRoute from "./AdminRoute";

import AdminDashboard from "./AdminDashboard";
import AdminSorteios from "./AdminSorteios";
import AdminClientes from "./AdminClientes";
import AdminVencedores from "./AdminVencedores";
import AdminUsersPage from "./AdminUsersPage";
import DrawBoardPage from "./DrawBoardPage";
import AdminOpenDrawBuyers from "./AdminOpenDrawBuyers";
import AdminAnalytics from './AdminAnalytics';
import AdminErrorBoundary from "./components/admin/AdminErrorBoundary";
import XnamaiAdminLayout from "./XnamaiAdminLayout";

export default function App() {
  const [selecionados, setSelecionados] = React.useState([]);
  const limparSelecao = React.useCallback(() => setSelecionados([]), []);

  return (
    <AuthProvider>
      <SelectionContext.Provider value={{ selecionados, setSelecionados, limparSelecao }}>
        <BrowserRouter>
          <Routes>
            {/* HOME só para não-admin */}
            <Route
              path="/"
              element={
                <NonAdminRoute>
                  <NewStorePage />
                </NonAdminRoute>
              }
            />

            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* CONTA: autenticado e não-admin */}
            <Route
              path="/conta"
              element={
                <ProtectedRoute>
                  <NonAdminRoute>
                    <AccountPage />
                  </NonAdminRoute>
                </ProtectedRoute>
              }
            />

            {/* ADMIN (somente admin) */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <XnamaiAdminLayout />
                </AdminRoute>
              }
            >
              <Route
                index
                element={
                  <AdminErrorBoundary>
                    <AdminDashboard />
                  </AdminErrorBoundary>
                }
              />
              <Route
                path="clientes"
                element={
                  <AdminErrorBoundary>
                    <AdminUsersPage />
                  </AdminErrorBoundary>
                }
              />
              <Route
                path="clientes-saldo"
                element={
                  <AdminErrorBoundary>
                    <AdminClientes />
                  </AdminErrorBoundary>
                }
              />
              <Route
                path="compradores"
                element={
                  <AdminErrorBoundary>
                    <AdminOpenDrawBuyers />
                  </AdminErrorBoundary>
                }
              />
              <Route
                path="analytics"
                element={
                  <AdminErrorBoundary>
                    <AdminAnalytics />
                  </AdminErrorBoundary>
                }
              />
              <Route
                path="sorteios"
                element={
                  <AdminErrorBoundary>
                    <AdminSorteios />
                  </AdminErrorBoundary>
                }
              />
              <Route
                path="vencedores"
                element={
                  <AdminErrorBoundary>
                    <AdminVencedores />
                  </AdminErrorBoundary>
                }
              />

              {/* fallback admin (nunca tela vazia) */}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>

            <Route path="/me/draw/:id" element={<DrawBoardPage />} />

            {/* redirects/compat (evitar rotas com maiúsculas e antigas) */}
            <Route path="/admin/AdminClientesUser" element={<Navigate to="/admin/clientes" replace />} />
            <Route path="/admin/sorteiosAtivos" element={<Navigate to="/admin/compradores" replace />} />
          </Routes>
        </BrowserRouter>
      </SelectionContext.Provider>
    </AuthProvider>
  );
}
