import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import Navbar from '../components/dashboard/Navbar';
import HeroSection from '../components/dashboard/HeroSection';
import CategoryGrid from '../components/dashboard/CategoryGrid';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import BrandLoader from '../components/ui/BrandLoader';

export default function DashboardPage() {
  const { session, loading: authLoading } = useAuth();
  const { locationSet, loading: locLoading } = useLocation();

  if (authLoading || locLoading) return <BrandLoader />;
  if (!session) return <Navigate to="/" replace />;
  if (!locationSet) return <Navigate to="/location" replace />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-surface pb-32 sm:pb-16"
    >
      <Navbar />
      <HeroSection />
      <CategoryGrid />
    </motion.div>
  );
}

