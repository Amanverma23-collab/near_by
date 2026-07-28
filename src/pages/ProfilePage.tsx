import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  Star,
  ShieldCheck,
  Edit2,
  Check,
  LogOut,
  ChevronRight,
  Store,
  Bell,
  Globe,
  HelpCircle,
  Sparkles,
  Camera,
  Pencil,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { getAllUserReviews } from '../utils/reviewStorage';
import { getSavedVendorsCount } from '../utils/favoritesStorage';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { location: userLocation } = useLocation();
  const { language, toggleLanguage, t } = useLanguage();
  const currentAddress = userLocation?.city;

  // Profile Form States
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || 'Rahul Sharma'
  );
  const [email, setEmail] = useState(
    user?.email || 'rahul.sharma@example.com'
  );
  const [savedAddress, setSavedAddress] = useState(
    currentAddress || 'Indiranagar 100ft Road, Bangalore'
  );
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Profile Image State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Inline Name Edit State (hero card)
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(fullName);

  // Dynamic Rating Count & Saved Shops Count
  const [ratingCount, setRatingCount] = useState(0);
  const [savedShopsCount, setSavedShopsCount] = useState(0);

  // Quick Toggles
  const [notifications, setNotifications] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Load customer profile from Supabase / localStorage if present
  useEffect(() => {
    try {
      const storedName = localStorage.getItem('nearby_customer_name');
      const storedEmail = localStorage.getItem('nearby_customer_email');
      const storedAddress = localStorage.getItem('nearby_customer_address');
      const storedAvatar = localStorage.getItem('nearby_customer_avatar');
      if (storedName) {
        setFullName(storedName);
        setTempName(storedName);
      }
      if (storedEmail) setEmail(storedEmail);
      if (storedAddress) setSavedAddress(storedAddress);
      if (storedAvatar) setAvatarUrl(storedAvatar);
    } catch (err) {
      console.error('Error loading stored profile:', err);
    }

    // Load rating count & saved shops count
    const allReviews = getAllUserReviews();
    setRatingCount(allReviews.length);
    setSavedShopsCount(getSavedVendorsCount());

    const handleFavChange = () => {
      setSavedShopsCount(getSavedVendorsCount());
    };
    window.addEventListener('nearby_favorites_changed', handleFavChange);
    return () => window.removeEventListener('nearby_favorites_changed', handleFavChange);
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('nearby_customer_name', fullName);
      localStorage.setItem('nearby_customer_email', email);
      localStorage.setItem('nearby_customer_address', savedAddress);

      if (user) {
        supabase.auth.updateUser({
          data: { full_name: fullName },
        });
      }

      setIsEditing(false);
      setSavedSuccessMsg(t('save'));
      setTimeout(() => setSavedSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const userInitial = (fullName || 'U')[0].toUpperCase();

  // Handle avatar image upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarUrl(base64);
        try {
          localStorage.setItem('nearby_customer_avatar', base64);
        } catch (err) {
          console.error('Error saving avatar to localStorage:', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle inline name save (hero card)
  const handleInlineNameSave = () => {
    const trimmed = tempName.trim();
    if (trimmed && trimmed !== fullName) {
      setFullName(trimmed);
      try {
        localStorage.setItem('nearby_customer_name', trimmed);
        if (user) {
          supabase.auth.updateUser({ data: { full_name: trimmed } });
        }
      } catch (err) {
        console.error('Error saving name:', err);
      }
      setSavedSuccessMsg(t('name_updated'));
      setTimeout(() => setSavedSuccessMsg(null), 3000);
    }
    setIsEditingName(false);
  };

  return (
    <div className="min-h-screen bg-surface font-body pb-32 sm:pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border-light">
        <div className="max-w-md mx-auto h-16 px-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs font-display font-extrabold text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>{t('back')}</span>
          </button>

          <h1 className="text-lg font-display font-extrabold text-ink">
            {t('my_profile')}
          </h1>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-display font-extrabold text-brand hover:underline cursor-pointer"
          >
            {isEditing ? t('cancel') : t('edit')}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">

        {/* Success Toast */}
        <AnimatePresence>
          {savedSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2"
            >
              <Check size={16} className="text-emerald-600 shrink-0" />
              <span>{savedSuccessMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ────────────────── SECTION 1: PROFILE HERO CARD ────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 border border-border-light shadow-card text-center space-y-4 relative overflow-hidden"
        >
          {/* Decorative background glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand/10 rounded-full blur-2xl pointer-events-none" />

          {/* Avatar Circle with Camera Upload */}
          <div className="relative w-20 h-20 mx-auto">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="w-full h-full rounded-full bg-gradient-to-tr from-brand to-teal-400 text-white font-display font-extrabold text-3xl flex items-center justify-center shadow-lg border-4 border-white cursor-pointer group relative overflow-hidden"
              title={t('tap_to_change_photo')}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
              ) : (
                userInitial
              )}
              {/* Camera overlay on hover */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            {/* Verified badge */}
            <div
              className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 text-white rounded-full border-2 border-white shadow-xs"
              title={t('verified')}
            >
              <ShieldCheck size={14} />
            </div>
          </div>

          {/* Name & Phone — with inline edit */}
          <div className="space-y-1">
            {isEditingName ? (
              <div className="flex items-center justify-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInlineNameSave(); if (e.key === 'Escape') { setTempName(fullName); setIsEditingName(false); } }}
                  autoFocus
                  className="text-xl font-display font-extrabold text-ink leading-tight text-center bg-surface border-2 border-brand rounded-xl px-3 py-1 outline-none w-48"
                />
                <button
                  onClick={handleInlineNameSave}
                  className="p-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors cursor-pointer"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => { setTempName(fullName); setIsEditingName(false); }}
                  className="p-1.5 bg-surface text-ink-muted rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors cursor-pointer border border-border-light"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 group">
                <h2 className="text-xl font-display font-extrabold text-ink leading-tight">
                  {fullName}
                </h2>
                <button
                  onClick={() => { setTempName(fullName); setIsEditingName(true); }}
                  className="p-1 text-ink-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-all cursor-pointer opacity-60 group-hover:opacity-100"
                  title={t('edit_name')}
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            <div className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
              <Phone size={13} className="text-brand" />
              <span>{user?.phone || '+91 98765 43210'}</span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="pt-3 border-t border-border-light grid grid-cols-3 gap-2 text-center">
            <div
              onClick={() => navigate('/favorites')}
              className="p-2.5 rounded-2xl bg-surface hover:bg-brand/5 border border-border-light transition-colors cursor-pointer space-y-0.5"
            >
              <Heart size={16} className="mx-auto text-rose-500 fill-rose-500" />
              <div className="text-xs font-display font-extrabold text-ink">{savedShopsCount} {t('saved')}</div>
              <span className="text-[9px] text-ink-muted font-bold">Shops</span>
            </div>

            <div
              onClick={() => navigate('/my-ratings')}
              className="p-2.5 rounded-2xl bg-surface hover:bg-amber-50 border border-border-light transition-colors cursor-pointer space-y-0.5"
            >
              <Star size={16} className="mx-auto text-amber-500 fill-amber-400" />
              <div className="text-xs font-display font-extrabold text-ink">{ratingCount} Ratings</div>
              <span className="text-[9px] text-ink-muted font-bold">Given</span>
            </div>

            <div
              onClick={() => navigate('/location')}
              className="p-2.5 rounded-2xl bg-surface hover:bg-brand/5 border border-border-light transition-colors cursor-pointer space-y-0.5"
            >
              <MapPin size={16} className="mx-auto text-brand" />
              <div className="text-xs font-display font-extrabold text-ink truncate">GPS</div>
              <span className="text-[9px] text-ink-muted font-bold">Location</span>
            </div>
          </div>
        </motion.div>

        {/* ────────────────── SECTION 2: EDIT PROFILE DETAILS ────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 border border-border-light shadow-card space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-display font-extrabold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <User size={14} className="text-brand" />
              {t('personal_details')}
            </h3>
            {isEditing && (
              <span className="text-[10px] font-display font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                Editing Mode
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-xs font-display font-bold text-ink-light">
                {t('full_name')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-2.5 text-xs font-body rounded-xl outline-none transition-all ${
                  isEditing
                    ? 'bg-surface border-2 border-brand text-ink'
                    : 'bg-surface/50 border border-border-light text-ink-muted'
                }`}
                required
              />
            </div>

            {/* Email Address */}
            <div className="space-y-1">
              <label className="block text-xs font-display font-bold text-ink-light">
                {t('email_address')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                className={`w-full px-4 py-2.5 text-xs font-body rounded-xl outline-none transition-all ${
                  isEditing
                    ? 'bg-surface border-2 border-brand text-ink'
                    : 'bg-surface/50 border border-border-light text-ink-muted'
                }`}
              />
            </div>

            {/* Primary Delivery / Home Address */}
            <div className="space-y-1">
              <label className="block text-xs font-display font-bold text-ink-light">
                {t('saved_location')}
              </label>
              <textarea
                value={savedAddress}
                onChange={(e) => setSavedAddress(e.target.value)}
                disabled={!isEditing}
                rows={2}
                className={`w-full px-4 py-2.5 text-xs font-body rounded-xl outline-none transition-all resize-none ${
                  isEditing
                    ? 'bg-surface border-2 border-brand text-ink'
                    : 'bg-surface/50 border border-border-light text-ink-muted'
                }`}
              />
            </div>

            {isEditing && (
              <button
                type="submit"
                className="w-full py-3 bg-brand hover:bg-brand-dark text-white font-display font-extrabold text-xs rounded-xl shadow-brand transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={16} />
                <span>{t('save')}</span>
              </button>
            )}
          </form>
        </motion.div>

        {/* ────────────────── SECTION 3: QUICK APP SETTINGS ────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl border border-border-light shadow-card overflow-hidden divide-y divide-border-light/60"
        >
          {/* Change Location */}
          <div
            onClick={() => navigate('/location')}
            className="p-4 flex items-center justify-between hover:bg-surface transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand/10 text-brand rounded-xl">
                <MapPin size={18} />
              </div>
              <div>
                <h4 className="text-xs font-display font-extrabold text-ink">{t('change_gps')}</h4>
                <p className="text-[10px] text-ink-muted truncate max-w-[200px]">{savedAddress}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-ink-muted" />
          </div>

          {/* Saved Favorites */}
          <div
            onClick={() => navigate('/favorites')}
            className="p-4 flex items-center justify-between hover:bg-surface transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                <Heart size={18} className="fill-rose-500" />
              </div>
              <div>
                <h4 className="text-xs font-display font-extrabold text-ink">{t('saved_shops')}</h4>
                <p className="text-[10px] text-ink-muted">View your bookmarked favorites</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-ink-muted" />
          </div>

          {/* Notifications Toggle */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Bell size={18} />
              </div>
              <div>
                <h4 className="text-xs font-display font-extrabold text-ink">{t('nearby_alerts')}</h4>
                <p className="text-[10px] text-ink-muted">Receive local shop updates</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                notifications ? 'bg-brand justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Language Selection (DYNAMIC WORKING TOGGLE) */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Globe size={18} />
              </div>
              <div>
                <h4 className="text-xs font-display font-extrabold text-ink">{t('app_language')}</h4>
                <p className="text-[10px] font-bold text-brand">
                  {language === 'en' ? 'English (English)' : 'Hindi (हिंदी)'}
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={toggleLanguage}
              className="px-3.5 py-1.5 bg-brand text-white font-display font-extrabold text-xs rounded-xl shadow-brand cursor-pointer hover:bg-brand-dark transition-all flex items-center gap-1.5"
            >
              <Globe size={13} />
              <span>{language === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}</span>
            </motion.button>
          </div>
        </motion.div>

        {/* ────────────────── SECTION 4: VENDOR PROMO BANNER ────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-r from-teal-900 via-teal-800 to-teal-950 text-white rounded-3xl p-5 shadow-card space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-300" />
            <span className="text-[10px] font-display font-extrabold uppercase tracking-wider text-teal-200">
              {t('own_a_shop')}
            </span>
          </div>

          <h3 className="text-base font-display font-extrabold text-white leading-tight">
            {t('register_shop_promo')}
          </h3>

          <button
            onClick={() => navigate('/vendor/register')}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-teal-950 font-display font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Store size={15} />
            <span>{t('register_shop_btn')}</span>
          </button>
        </motion.div>

        {/* ────────────────── SECTION 5: LOGOUT BUTTON ────────────────── */}
        <div className="pt-2">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-display font-extrabold text-xs rounded-2xl border border-rose-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={16} />
            <span>{t('logout')}</span>
          </button>
        </div>

      </main>

      {/* ────────────────── LOGOUT CONFIRMATION MODAL ────────────────── */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl max-w-sm w-full p-6 border border-border-light shadow-xl space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <LogOut size={24} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-display font-extrabold text-ink">{t('confirm_logout')}</h3>
                <p className="text-xs text-ink-muted">
                  Are you sure you want to log out of your NearBe account?
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2.5 bg-surface text-ink font-display font-extrabold text-xs rounded-xl border border-border-light cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-display font-extrabold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  {t('logout')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
