import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import POS from "./pages/POS";
import Orders from "./pages/Orders";
import { OrderDetail } from "./components/orders/OrderDetail";
import { AppLayout } from "./components/AppLayout";
import { useParams, useNavigate } from "react-router-dom";

function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  if (!orderId) return null;
  return (
    <AppLayout>
      <div className="animate-fade-in">
        <OrderDetail orderId={orderId} onBack={() => navigate("/orders")} />
      </div>
    </AppLayout>
  );
}
import Production from "./pages/Production";
import Deliveries from "./pages/Deliveries";
import Inventory from "./pages/Inventory";
import Suppliers from "./pages/Suppliers";
import PurchaseOrders from "./pages/PurchaseOrders";
import BomTemplates from "./pages/BomTemplates";
import Billing from "./pages/Billing";
import Reports from "./pages/Reports";
import Branches from "./pages/Branches";
import UserManagement from "./pages/UserManagement";
import SettingsPage from "./pages/Settings";
import MyWork from "./pages/MyWork";
import EmployeePayments from "./pages/EmployeePayments";
import Appointments from "./pages/Appointments";
import Expenses from "./pages/Expenses";
import FabricCatalogue from "./pages/FabricCatalogue";
import Ledger from "./pages/Ledger";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AuthRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRedirect />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pos" element={<ProtectedRoute allowedRoles={["admin", "manager", "pos_operator"]}><POS /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute allowedRoles={["admin", "manager", "pos_operator"]}><Orders /></ProtectedRoute>} />
            <Route path="/orders/:orderId" element={<ProtectedRoute allowedRoles={["admin", "manager", "pos_operator"]}><OrderDetailPage /></ProtectedRoute>} />
            <Route path="/production" element={<ProtectedRoute allowedRoles={["admin", "manager", "tailor"]}><Production /></ProtectedRoute>} />
            <Route path="/deliveries" element={<ProtectedRoute allowedRoles={["admin", "manager", "delivery_person"]}><Deliveries /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute allowedRoles={["admin", "manager", "inventory_manager"]}><Inventory /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute allowedRoles={["admin", "manager", "inventory_manager"]}><Suppliers /></ProtectedRoute>} />
            <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={["admin", "manager", "inventory_manager"]}><PurchaseOrders /></ProtectedRoute>} />
            <Route path="/bom-templates" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><BomTemplates /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute allowedRoles={["admin", "manager", "pos_operator"]}><Billing /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><Reports /></ProtectedRoute>} />
            <Route path="/branches" element={<ProtectedRoute allowedRoles={["admin"]}><Branches /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><UserManagement /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><SettingsPage /></ProtectedRoute>} />
            <Route path="/employee-payments" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><EmployeePayments /></ProtectedRoute>} />
            <Route path="/my-work" element={<ProtectedRoute><MyWork /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><Expenses /></ProtectedRoute>} />
            <Route path="/fabric-catalogue" element={<ProtectedRoute allowedRoles={["admin", "manager", "inventory_manager", "pos_operator"]}><FabricCatalogue /></ProtectedRoute>} />
            <Route path="/ledger" element={<ProtectedRoute allowedRoles={["admin", "manager", "pos_operator"]}><Ledger /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
