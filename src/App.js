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
                  <AdminErrorBoundary>
                    <AdminDashboard />
                  </AdminErrorBoundary>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/sorteios"
              element={
                <AdminRoute>
                  <AdminErrorBoundary>
                    <AdminSorteios />
                  </AdminErrorBoundary>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/clientes"
              element={
                <AdminRoute>
                  <AdminErrorBoundary>
                    <AdminUsersPage />
                  </AdminErrorBoundary>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/clientes-saldo"
              element={
                <AdminRoute>
                  <AdminErrorBoundary>
                    <AdminClientes />
                  </AdminErrorBoundary>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/vencedores"
              element={
                <AdminRoute>
                  <AdminErrorBoundary>
                    <AdminVencedores />
                  </AdminErrorBoundary>
                </AdminRoute>
              }
            />
            <Route path="/me/draw/:id" element={<DrawBoardPage />} />
            <Route
              path="/admin/compradores"
              element={
                <AdminRoute>
                  <AdminErrorBoundary>
                    <AdminOpenDrawBuyers />
                  </AdminErrorBoundary>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <AdminRoute>
                  <AdminErrorBoundary>
                    <AdminAnalytics />
                  </AdminErrorBoundary>
                </AdminRoute>
              }
            />

            {/* redirects/compat (evitar rotas com maiúsculas e antigas) */}
            <Route path="/admin/AdminClientesUser" element={<Navigate to="/admin/clientes" replace />} />
            <Route path="/admin/sorteiosAtivos" element={<Navigate to="/admin/compradores" replace />} />

            {/* fallback admin (nunca tela vazia) */}
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </SelectionContext.Provider>
    </AuthProvider>
  );
}
