import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { PrivateRoute } from "@/components/PrivateRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ClientLayout } from "@/components/client/ClientLayout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Roles from "./pages/Roles";
import RoleForm from "./pages/RoleForm";
import Settings from "./pages/Settings";
import Clients from "./pages/Clients";
import Professionals from "./pages/Professionals";
import Products from "./pages/Products";
import Agenda from "./pages/Agenda";
import CashRegister from "./pages/CashRegister";
import Transactions from "./pages/Transactions";
import Campaigns from "./pages/marketing/Campaigns";
import Automations from "./pages/marketing/Automations";
import Communications from "./pages/marketing/Communications";
import Loyalty from "./pages/marketing/Loyalty";
import Commissions from "./pages/Commissions";
import Reports from "./pages/Reports";
import ReportGroups from "./pages/reports/ReportGroups";
import Establishment from "./pages/settings/Establishment";
import BusinessRules from "./pages/settings/BusinessRules";
import Integrations from "./pages/settings/Integrations";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminSettings from "./pages/admin/AdminSettings";
import ClientHome from "./pages/client/ClientHome";
import ClientServices from "./pages/client/ClientServices";
import ClientBooking from "./pages/client/ClientBooking";
import ClientAppointments from "./pages/client/ClientAppointments";
import ClientProfile from "./pages/client/ClientProfile";
import ClientSettings from "./pages/client/ClientSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PermissionsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <PrivateRoute>
                    <AdminLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Client Routes */}
              <Route
                path="/client"
                element={
                  <PrivateRoute>
                    <ClientLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<ClientHome />} />
                <Route path="services" element={<ClientServices />} />
                <Route path="book" element={<ClientBooking />} />
                <Route path="appointments" element={<ClientAppointments />} />
                <Route path="profile" element={<ClientProfile />} />
                <Route path="settings" element={<ClientSettings />} />
              </Route>

              {/* Dashboard Routes (Barber) */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <DashboardLayout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="users" element={<Users />} />
                <Route path="roles" element={<Roles />} />
                <Route path="roles/new" element={<RoleForm />} />
                <Route path="roles/:id" element={<RoleForm />} />
                <Route path="roles/:id/edit" element={<RoleForm />} />
                <Route path="clients" element={<Clients />} />
                <Route path="professionals" element={<Professionals />} />
                <Route path="products" element={<Products />} />
                <Route path="agendamentos/agenda" element={<Agenda />} />
                <Route path="financeiro/caixa" element={<CashRegister />} />
                <Route path="financeiro/lancamentos" element={<Transactions />} />
                <Route path="financeiro/comissoes" element={<Commissions />} />
                <Route path="marketing/campanhas" element={<Campaigns />} />
                <Route path="marketing/automacoes" element={<Automations />} />
                <Route path="marketing/comunicacao/whatsapp" element={<Communications filterType="whatsapp" />} />
                <Route path="marketing/comunicacao/sms" element={<Communications filterType="sms" />} />
                <Route path="marketing/comunicacao/email" element={<Communications filterType="email" />} />
                <Route path="marketing/fidelidade" element={<Loyalty />} />
                <Route path="relatorios" element={<Reports />} />
                <Route path="relatorios/grupos" element={<ReportGroups />} />
                <Route path="configuracoes/estabelecimento" element={<Establishment />} />
                <Route path="configuracoes/regras" element={<BusinessRules />} />
                <Route path="configuracoes/integracoes" element={<Integrations />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PermissionsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
