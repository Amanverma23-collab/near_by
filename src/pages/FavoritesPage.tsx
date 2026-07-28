import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, Trash2, MapPin, Star, BadgeCheck, Phone, ArrowRight, Bookmark } from 'lucide-react';
import { type Vendor } from '../data/dummyVendors';
import { getSavedVendorsList, toggleSaveVendor } from '../utils/favoritesStorage';
import SaveHeartButton from '../components/ui/SaveHeartButton';

export default function FavoritesPage() {
  const navigate = useNavigate();

  const [savedVendors, setSavedVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVendors = async () => {
    const list = await getSavedVendorsList();
    setSavedVendors(list);
    setLoading(false);
  };

  useEffect(() => {
    loadVendors();

    const handleUpdate = () => {
      loadVendors();
    };

    window.addEventListener('nearby_favorites_changed', handleUpdate);
    return () => window.removeEventListener('nearby_favorites_changed', handleUpdate);
  }, []);

  const handleRemoveFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleSaveVendor(id);
    setSavedVendors((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div className="min-h-screen bg-surface font-body pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border-light p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand/10 text-brand rounded-xl">
              <Heart size={18} className="fill-brand" />
            </div>
            <div>
              <h1 className="text-xl font-display font-extrabold text-ink leading-tight">
                Saved Listings
              </h1>
              <p className="text-xs text-ink-muted">
                Your bookmarked favorite local shops
              </p>
            </div>
          </div>

          <span className="text-xs font-display font-extrabold px-3 py-1 rounded-full bg-brand/10 text-brand">
            {savedVendors.length} Saved
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        {savedVendors.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 border border-border-light text-center space-y-4 shadow-xs mt-6"
          >
            <div className="p-4 bg-brand/10 text-brand rounded-full w-14 h-14 mx-auto flex items-center justify-center">
              <Bookmark size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-display font-extrabold text-ink">No saved listings yet</h2>
              <p className="text-xs text-ink-muted leading-relaxed max-w-xs mx-auto">
                Tap the heart icon on any vendor storefront page to save them here for quick access later.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-brand hover:bg-brand-dark text-white font-display font-extrabold text-xs rounded-xl shadow-brand transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
            >
              <span>Explore Nearby Vendors</span>
              <ArrowRight size={16} />
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {savedVendors.map((vendor) => (
                <motion.div
                  key={vendor.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/vendor/${vendor.id}`)}
                  className="bg-white rounded-2xl p-4 border border-border-light shadow-xs space-y-3 cursor-pointer transition-all relative"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-display font-extrabold text-ink truncate leading-tight">
                          {vendor.name}
                        </h3>
                        {vendor.isVerified && <BadgeCheck size={16} className="text-brand shrink-0" />}
                      </div>
                      <span className="inline-block px-2 py-0.5 bg-surface text-ink-muted border border-border-light rounded-full text-[9px] font-display font-semibold uppercase tracking-wider">
                        {vendor.subService}
                      </span>
                    </div>

                    {/* Un-save / Remove button */}
                    <button
                      onClick={(e) => handleRemoveFavorite(e, vendor.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
                      title="Remove from saved"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-ink-muted border-t border-border-light/60 pt-2.5">
                    <div className="flex items-center gap-1 text-[11px]">
                      <MapPin size={12} className="text-brand shrink-0" />
                      <span className="truncate max-w-[160px]">{vendor.address}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${vendor.phoneNumber}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 bg-brand text-white text-[11px] font-display font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Phone size={11} />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
