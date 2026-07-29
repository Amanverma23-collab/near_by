import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
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
import SubscriptionPlaceholder from './pages/vendor/SubscriptionPlaceholder';
import PlanDetailPage from './pages/vendor/PlanDetailPage';
import VendorServicesPage from './pages/vendor/VendorServicesPage';
import SearchPage from './pages/SearchPage';
import FavoritesPage from './pages/FavoritesPage';
import MyRatingsPage from './pages/MyRatingsPage';
import ChatsPage from './pages/ChatsPage';
import CustomerBottomNav from './components/navigation/CustomerBottomNav';

import { LanguageProvider } from './context/LanguageContext';

function HardwareBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Root paths where back button SHOULD exit the app
    const rootPaths = ['/', '/dashboard', '/vendor/pending'];

    const backButtonListener = CapacitorApp.addListener('backButton', () => {
      // 1. Dispatch custom event so any open modal/overlay can intercept and close itself
      const event = new CustomEvent('hardwareBackButton', { cancelable: true });
      const wasPrevented = !window.dispatchEvent(event);

      // If an open modal or overlay handled the back button press, do not navigate away
      if (wasPrevented) {
        return;
      }

      // 2. If on root path, exit the app
      if (rootPaths.includes(location.pathname)) {
        CapacitorApp.exitApp();
      } else {
        // 3. Otherwise navigate back in history
        navigate(-1);
      }
    });

    return () => {
      backButtonListener.then((listener) => listener.remove());
    };
  }, [location, navigate]);

  return null;
}

function AppRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/location" element={<LocationPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/vendor/:vendorId" element={<VendorDetailPage />} />
        <Route path="/vendor/register" element={<VendorRegisterPage />} />
        <Route path="/vendor/pending" element={<VendorPendingPage />} />
        <Route path="/vendor/subscriptions" element={<SubscriptionPlaceholder />} />
        <Route path="/vendor/plan/:planId" element={<PlanDetailPage />} />
        <Route path="/vendor/services" element={<VendorServicesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/my-ratings" element={<MyRatingsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <LocationProvider>
            <HardwareBackButtonHandler />
            <AppRoutes />
            <CustomerBottomNav />
          </LocationProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
