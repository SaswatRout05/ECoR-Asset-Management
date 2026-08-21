/**
 * ECoR-AMP · App Root
 * React Router configuration with DashboardLayout wrapping all authenticated routes.
 * The sidebar sits OUTSIDE <Routes> (in DashboardLayout) so it persists across navigation.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QRScanner from './pages/QRScanner';
import InvoiceOCR from './pages/InvoiceOCR';
import AIAssistant from './pages/AIAssistant';
import AssetsRegistry from './pages/AssetsRegistry';
import MyAssets from './pages/MyAssets';
import WorkOrders from './pages/WorkOrders';
import AssetAllocation from './pages/AssetAllocation';
import ReturnAssets from './pages/ReturnAssets';
import UserAdmin from './pages/UserAdmin';
import VendorManagement from './pages/VendorManagement';
import AuditLogs from './pages/AuditLogs';
import SystemSettings from './pages/SystemSettings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route — Login */}
        <Route path="/" element={<Login />} />

        {/* Protected routes — DashboardLayout wraps all, sidebar persists */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/qr-scanner" element={<QRScanner />} />
          <Route path="/invoice-ocr" element={<InvoiceOCR />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/assets/registry" element={<AssetsRegistry />} />
          <Route path="/assets/my-assets" element={<MyAssets />} />
          <Route path="/maintenance/work-orders" element={<WorkOrders />} />
          <Route path="/inventory/allocation" element={<AssetAllocation />} />
          <Route path="/inventory/return" element={<ReturnAssets />} />
          <Route path="/admin/users" element={<UserAdmin />} />
          <Route path="/admin/vendors" element={<VendorManagement />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/settings" element={<SystemSettings />} />
        </Route>

        {/* Catch-all — redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
