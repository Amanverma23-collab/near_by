import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import AuthPage from './pages/AuthPage';
import LocationPage from './pages/LocationPage';
import DashboardPage from './pages/DashboardPage';
import CategoryPage from './pages/CategoryPage';
import VendorDetailPage from './pages/VendorDetailPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import VendorRegisterPage from './pages/vendor/VendorRegisterPage';
import VendorPendingPage from './pages/vendor/VendorPendingPage';

function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/location" element={<LocationPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/vendor/:vendorId" element={<VendorDetailPage />} />
        <Route path="/vendor/register" element={<VendorRegisterPage />} />
        <Route path="/vendor/pending" element={<VendorPendingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LocationProvider>
          <AppRoutes />
        </LocationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
