import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, X, MapPin, Star, BadgeCheck, Phone, ArrowRight, Sparkles, Filter } from 'lucide-react';
import { dummyVendors, type Vendor } from '../data/dummyVendors';
import { fetchCombinedVendors } from '../utils/vendorSync';
import SaveHeartButton from '../components/ui/SaveHeartButton';
import { useLanguage } from '../context/LanguageContext';

const POPULAR_SEARCHES = [
  'Puncture Repair',
  'AC Service',
  'Doctor',
  'Haircut & Saloon',
  'Plumber',
  'Tiffin Service',
];

export default function SearchPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [allVendors, setAllVendors] = useState<Vendor[]>(dummyVendors);

  useEffect(() => {
    fetchCombinedVendors().then((vendors) => {
      setAllVendors(vendors);
    });
  }, []);

  // Filter vendors based on search query & category
  const filteredVendors = allVendors.filter((vendor) => {
    const matchesCategory = selectedCategory ? vendor.category === selectedCategory : true;
    const q = query.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesName = vendor.name.toLowerCase().includes(q);
    const matchesSubService = vendor.subService.toLowerCase().includes(q);
    const matchesAddress = vendor.address.toLowerCase().includes(q);
    const matchesCat = vendor.category.toLowerCase().includes(q);
    const matchesServices = vendor.servicesOffered.some((s) => s.name.toLowerCase().includes(q));

    return matchesCategory && (matchesName || matchesSubService || matchesAddress || matchesCat || matchesServices);
  });

  return (
    <div className="min-h-screen bg-surface font-body pb-24">
      {/* Search Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border-light p-4">
        <div className="max-w-md mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-display font-extrabold text-ink">
              {t('search_nearby')}
            </h1>
            <span className="text-xs font-display font-bold px-2.5 py-0.5 rounded-full bg-brand/10 text-brand">
              {filteredVendors.length} {t('results_found')}
            </span>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search_placeholder')}
              className="w-full pl-10 pr-10 py-3 text-sm font-body bg-surface border-2 border-border-light rounded-2xl outline-none hover:border-ink-muted focus:border-brand transition-all shadow-xs"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink rounded-full"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-5 space-y-6">

        {/* Popular Search Suggestions */}
        {!query && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-display font-extrabold text-ink-muted uppercase tracking-wider">
              <Sparkles size={13} className="text-brand" />
              {t('popular_searches')}
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="px-3.5 py-1.5 bg-white border border-border-light rounded-full text-xs font-display font-bold text-ink hover:border-brand hover:text-brand transition-colors cursor-pointer shadow-xs"
                >
                  {t(term)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-display font-extrabold text-ink-muted uppercase tracking-wider">
            <span>{query ? `Results for "${query}"` : 'Recommended Nearby Listings'}</span>
          </div>

          {filteredVendors.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-border-light text-center space-y-3">
              <div className="p-3 bg-surface rounded-full w-12 h-12 mx-auto flex items-center justify-center text-ink-muted">
                <Search size={20} />
              </div>
              <h3 className="text-base font-display font-bold text-ink">No matching listings found</h3>
              <p className="text-xs text-ink-muted max-w-xs mx-auto">
                Try searching for broader keywords like "repair", "doctor", "salon", or clear your search term.
              </p>
              <button
                onClick={() => {
                  setQuery('');
                  setSelectedCategory(null);
                }}
                className="px-4 py-2 bg-brand/10 text-brand font-display font-extrabold text-xs rounded-xl"
              >
                Clear Search Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVendors.map((vendor) => (
                <motion.div
                  key={vendor.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/vendor/${vendor.id}`)}
                  className="bg-white rounded-2xl p-4 border border-border-light shadow-xs space-y-3 cursor-pointer transition-all"
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

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5 px-2 py-0.5 bg-[#FFFBEB] border border-[#FEF3C7] rounded-md">
                        <Star size={11} className="text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-display font-bold text-amber-800">
                          {vendor.rating.toFixed(1)}
                        </span>
                      </div>
                      <SaveHeartButton vendorId={vendor.id} size={15} className="p-1" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-ink-muted border-t border-border-light/60 pt-2.5">
                    <div className="flex items-center gap-1 text-[11px]">
                      <MapPin size={12} className="text-brand shrink-0" />
                      <span className="truncate max-w-[180px]">{vendor.address}</span>
                    </div>
                    <span className="font-bold text-brand text-[11px] shrink-0">
                      {vendor.distanceKm.toFixed(1)} km &rarr;
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
