import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./App.css";
import "./styles/xnamai-admin.css";

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
import AdminAnalytics from "./AdminAnalytics";
import AdminPurchaseHistory from "./AdminPurchaseHistory";

import AdminErrorBoundary from "./components/admin/AdminErrorBoundary";
import XnamaiAdminLayout from "./XnamaiAdminLayout";
import {
  PromocionalHome,
  PromocionalDrawPage,
  PromocionalAdminLayout,
  PromocionalAdminHome,
  PromocionalDrawForm,
  PromocionalNumbersManager,
  PromocionalParticipants,
} from "./modules/promocional";

export default function App() {
  const [selecionados, setSelecionados] = React.useState([]);
  const limparSelecao = React.useCallback(() => setSelecionados([]), []);

  return (
    <AuthProvider>
      <SelectionContext.Provider value={{ selecionados, setSelecionados, limparSelecao }}>
        <BrowserRouter>
          <Routes>
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
            <Route path="/promocional" element={<PromocionalHome />} />
            <Route path="/promocional/:id" element={<PromocionalDrawPage />} />
            <Route path="/promocional/draw/:id" element={<PromocionalDrawPage />} />

            <Route
              path="/promocional/admin"
              element={
                <AdminRoute>
                  <AdminErrorBoundary>
                    <PromocionalAdminLayout />
                  </AdminErrorBoundary>
                </AdminRoute>
              }
            >
              <Route index element={<PromocionalAdminHome />} />
              <Route path="novo" element={<PromocionalDrawForm />} />
              <Route path=":id" element={<PromocionalDrawForm />} />
              <Route path=":id/numeros" element={<PromocionalNumbersManager />} />
              <Route path=":id/participantes" element={<PromocionalParticipants />} />
            </Route>

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
                path="AdminClientesUser"
                element={
                  <AdminErrorBoundary>
                    <AdminUsersPage />
                  </AdminErrorBoundary>
                }
              />

              <Route
                path="clientes"
                element={
                  <AdminErrorBoundary>
                    <AdminClientes />
                  </AdminErrorBoundary>
                }
              />

              <Route
                path="clientes-saldo"
                element={<Navigate to="/admin/clientes" replace />}
              />

              <Route
                path="sorteiosAtivos"
                element={
                  <AdminErrorBoundary>
                    <AdminOpenDrawBuyers />
                  </AdminErrorBoundary>
                }
              />

              <Route
                path="compradores"
                element={<Navigate to="/admin/sorteiosAtivos" replace />}
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

              <Route
                path="historico-compras"
                element={
                  <AdminErrorBoundary>
                    <AdminPurchaseHistory />
                  </AdminErrorBoundary>
                }
              />

              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>

            <Route
              path="/me/draw/:id"
              element={
                <ProtectedRoute>
                  <DrawBoardPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SelectionContext.Provider>
    </AuthProvider>
  );
}
