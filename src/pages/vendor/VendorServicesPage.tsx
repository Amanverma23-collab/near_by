import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ListPlus,
  Sparkles,
  Tag,
  Save,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import BrandLoader from '../../components/ui/BrandLoader';

export interface ServiceItem {
  id: string;
  name: string;
  price: string;
  description?: string;
}

// Category-based quick suggestions
const QUICK_SUGGESTIONS: Record<string, Array<{ name: string; price: string }>> = {
  'vehicle-emergency': [
    { name: 'Tubeless Puncture Repair', price: '150' },
    { name: 'Normal Tube Puncture', price: '100' },
    { name: 'Nitrogen Air Filling', price: '40' },
    { name: 'Battery Jumpstart', price: '300' },
    { name: 'Emergency Towing', price: '800' },
  ],
  'home-maintenance': [
    { name: 'AC Service & Cleaning', price: '500' },
    { name: 'Plumbing Inspection & Fix', price: '250' },
    { name: 'Electrical Wiring Repair', price: '300' },
    { name: 'Washing Machine Repair', price: '450' },
  ],
  'healthcare-wellness': [
    { name: 'General Doctor Consultation', price: '300' },
    { name: 'Blood Pressure & Sugar Check', price: '50' },
    { name: 'Full Haircut & Styling', price: '200' },
    { name: 'Beard Trim & Shape', price: '100' },
  ],
  'daily-needs': [
    { name: 'Milk & Dairy Supply', price: '60' },
    { name: 'Fresh Vegetable Combo', price: '150' },
    { name: 'Drinking Water Can (20L)', price: '40' },
    { name: 'Laundry per Kg', price: '70' },
  ],
  'education-student': [
    { name: 'Single Occupancy Room', price: '6000' },
    { name: 'Double Sharing Bed', price: '4000' },
    { name: 'Home Cooked Tiffin Service', price: '3000' },
    { name: 'Math & Science Tuition', price: '2000' },
  ],
};

export default function VendorServicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Form states
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch vendor services from Supabase or default
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchServices = async () => {
      try {
        const { data } = await supabase
          .from('vendors')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (data) {
          setVendor(data);
          if (data.services_offered && Array.isArray(data.services_offered)) {
            const formatted = data.services_offered.map((s: any, idx: number) => ({
              id: s.id || `srv-${idx}-${Date.now()}`,
              name: s.name || 'Service',
              price: s.price ? String(s.price).replace('₹', '') : '0',
              description: s.description || '',
            }));
            setServices(formatted);
          } else {
            // Default sample services if empty
            setServices([
              { id: '1', name: 'Primary Service / Consultation', price: '200', description: 'Standard service fee' },
              { id: '2', name: 'Emergency Express Service', price: '350', description: 'Priority quick turnaround' },
            ]);
          }
        }
      } catch (err) {
        console.error('Error loading services:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [user]);

  // Save all services to Supabase
  const handleSaveAll = async (updatedServices: ServiceItem[] = services) => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      if (user && vendor?.id) {
        await supabase
          .from('vendors')
          .update({
            services_offered: updatedServices.map((s) => ({
              id: s.id,
              name: s.name,
              price: `₹${s.price}`,
              description: s.description,
            })),
          })
          .eq('id', vendor.id);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving services:', err);
    } finally {
      setSaving(false);
    }
  };

  // Add New Service
  const handleAddService = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim() || !newPrice.trim()) return;

    const newService: ServiceItem = {
      id: `srv-${Date.now()}`,
      name: newName.trim(),
      price: newPrice.trim().replace('₹', ''),
      description: newDesc.trim(),
    };

    const updated = [...services, newService];
    setServices(updated);
    setNewName('');
    setNewPrice('');
    setNewDesc('');
    handleSaveAll(updated);
  };

  // Quick Suggestion Add
  const handleAddSuggestion = (item: { name: string; price: string }) => {
    if (services.some((s) => s.name.toLowerCase() === item.name.toLowerCase())) return;

    const newService: ServiceItem = {
      id: `srv-${Date.now()}`,
      name: item.name,
      price: item.price,
      description: 'Quick added service',
    };

    const updated = [...services, newService];
    setServices(updated);
    handleSaveAll(updated);
  };

  // Delete Service
  const handleDelete = (id: string) => {
    const updated = services.filter((s) => s.id !== id);
    setServices(updated);
    handleSaveAll(updated);
  };

  // Start Editing
  const startEditing = (item: ServiceItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(item.price);
    setEditDesc(item.description || '');
  };

  // Save Edit
  const handleSaveEdit = (id: string) => {
    if (!editName.trim() || !editPrice.trim()) return;
    const updated = services.map((s) =>
      s.id === id
        ? {
            ...s,
            name: editName.trim(),
            price: editPrice.trim().replace('₹', ''),
            description: editDesc.trim(),
          }
        : s
    );

    setServices(updated);
    setEditingId(null);
    handleSaveAll(updated);
  };

  if (loading) return <BrandLoader />;

  const categorySuggestions =
    QUICK_SUGGESTIONS[vendor?.category || 'vehicle-emergency'] || QUICK_SUGGESTIONS['vehicle-emergency'];

  return (
    <div className="vendor-mode min-h-screen bg-surface flex flex-col font-body pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-border-light">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs font-display font-extrabold text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold font-display">
              <span className="text-ink">Near</span>
              <span className="text-brand">By</span>
            </span>
            <span className="text-[10px] font-display font-extrabold px-2 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
              Services
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">

        {/* Title Banner */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 font-display font-extrabold text-[11px] uppercase tracking-wider border border-teal-100">
              <ListPlus size={13} />
              Catalog Manager
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink">
              Manage Services & Pricing
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted">
              Add, edit, or adjust prices for your service offerings visible to nearby customers.
            </p>
          </div>

          <span className="px-3.5 py-1.5 bg-brand/10 text-brand font-display font-extrabold text-xs rounded-full">
            {services.length} {services.length === 1 ? 'Service' : 'Services'} Listed
          </span>
        </div>

        {/* Save Success Toast */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>Service catalog updated & saved to your storefront page!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ────────────────── SECTION 1: ADD NEW SERVICE FORM ────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 border border-border-light shadow-card space-y-4"
        >
          <h2 className="text-xs font-display font-extrabold text-ink uppercase tracking-wider flex items-center gap-1.5">
            <Plus size={15} className="text-brand" />
            Add New Service
          </h2>

          <form onSubmit={handleAddService} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Service Name Input */}
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-display font-bold text-ink-light">
                  Service Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Tubeless Puncture Repair"
                  className="w-full px-4 py-2.5 text-sm font-body bg-surface border-2 border-border-light rounded-xl outline-none hover:border-ink-muted focus:border-brand transition-all"
                  required
                />
              </div>

              {/* Price Input */}
              <div className="space-y-1">
                <label className="block text-xs font-display font-bold text-ink-light">
                  Price (₹) <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-muted">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="150"
                    className="w-full pl-8 pr-4 py-2.5 text-sm font-mono font-bold bg-surface border-2 border-border-light rounded-xl outline-none hover:border-ink-muted focus:border-brand transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Optional Description */}
            <div className="space-y-1">
              <label className="block text-xs font-display font-bold text-ink-light">
                Brief Note / Duration (Optional)
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Takes ~15 minutes, includes wheel check"
                className="w-full px-4 py-2.5 text-xs font-body bg-surface border-2 border-border-light rounded-xl outline-none hover:border-ink-muted focus:border-brand transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={!newName.trim() || !newPrice.trim() || saving}
              className="px-6 py-3 bg-brand hover:bg-brand-dark text-white font-display font-extrabold text-xs rounded-xl shadow-brand transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              <span>Add to Service Catalog</span>
            </button>
          </form>
        </motion.div>

        {/* ────────────────── SECTION 2: QUICK SUGGESTIONS ────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100/60 space-y-2.5"
        >
          <div className="flex items-center gap-1.5 text-xs font-display font-extrabold text-teal-950 uppercase tracking-wider">
            <Sparkles size={14} className="text-amber-500" />
            Quick Add Suggested Services
          </div>

          <div className="flex flex-wrap gap-2">
            {categorySuggestions.map((item, idx) => {
              const alreadyAdded = services.some((s) => s.name.toLowerCase() === item.name.toLowerCase());
              return (
                <button
                  key={idx}
                  onClick={() => handleAddSuggestion(item)}
                  disabled={alreadyAdded}
                  className={`px-3 py-1.5 text-xs font-display font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer border ${
                    alreadyAdded
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
                      : 'bg-white text-teal-800 border-teal-200 hover:bg-teal-100/60 shadow-xs'
                  }`}
                >
                  <span>{item.name}</span>
                  <span className="font-mono text-brand font-extrabold">₹{item.price}</span>
                  {alreadyAdded ? <Check size={12} /> : <Plus size={12} className="text-teal-600" />}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ────────────────── SECTION 3: CURRENT SERVICES LIST ────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-xs font-display font-extrabold text-ink-muted uppercase tracking-wider pl-1">
            Current Service Catalog
          </h2>

          {services.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-border-light text-center space-y-2">
              <div className="p-3 bg-surface rounded-full w-12 h-12 mx-auto flex items-center justify-center text-ink-muted">
                <Tag size={20} />
              </div>
              <h3 className="text-sm font-display font-bold text-ink">No services listed yet</h3>
              <p className="text-xs text-ink-muted max-w-sm mx-auto">
                Add your first service using the form above or click one of the quick suggestions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((item) => {
                const isEditing = editingId === item.id;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-border-light shadow-xs space-y-3"
                  >
                    {isEditing ? (
                      /* Editing Inline Form */
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="sm:col-span-2 px-3 py-2 text-sm font-bold bg-surface border-2 border-brand rounded-xl outline-none"
                            placeholder="Service Name"
                          />
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-muted">
                              ₹
                            </span>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-surface border-2 border-brand rounded-xl outline-none"
                              placeholder="Price"
                            />
                          </div>
                        </div>

                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-surface border border-border-light rounded-xl outline-none"
                          placeholder="Brief description (optional)"
                        />

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-1.5 bg-surface text-ink-muted text-xs font-display font-bold rounded-lg border border-border-light cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="px-4 py-1.5 bg-brand text-white text-xs font-display font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <Check size={14} />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display View */
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-display font-extrabold text-ink leading-tight truncate">
                              {item.name}
                            </h3>
                          </div>
                          {item.description && (
                            <p className="text-xs text-ink-muted line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Price & Action Buttons */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-lg font-extrabold font-display text-brand bg-brand/10 px-3 py-1 rounded-xl">
                            ₹{item.price}
                          </span>

                          <button
                            onClick={() => startEditing(item)}
                            className="p-2 text-ink-muted hover:text-brand hover:bg-surface rounded-xl transition-colors cursor-pointer"
                            title="Edit Service"
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-ink-muted hover:text-error hover:bg-error-light/50 rounded-xl transition-colors cursor-pointer"
                            title="Delete Service"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Floating Manual Save Button */}
        <div className="pt-4">
          <button
            onClick={() => handleSaveAll()}
            disabled={saving}
            className="w-full py-4 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-2xl shadow-brand text-sm flex items-center justify-center gap-2 cursor-pointer transition-all border border-accent/20"
          >
            <Save size={18} />
            <span>{saving ? 'Saving Changes…' : 'Save Catalog & Return'}</span>
          </button>
        </div>

      </main>
    </div>
  );
}
