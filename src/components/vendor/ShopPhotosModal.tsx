import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Plus, Trash2, Check, Image as ImageIcon, Sparkles, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useBackButton } from '../../hooks/useBackButton';

interface ShopPhotosModalProps {
  vendor: any;
  isOpen: boolean;
  onClose: () => void;
  onPhotosUpdated?: () => void;
}

export default function ShopPhotosModal({
  vendor,
  isOpen,
  onClose,
  onPhotosUpdated,
}: ShopPhotosModalProps) {
  // Existing images array from vendor or local fallback
  const cleanPhone = (vendor?.phone_number || '').replace(/\D/g, '').slice(-10);
  const localPhotosStr = vendor?.id
    ? localStorage.getItem(`nearby_photos_${vendor.id}`)
    : cleanPhone
    ? localStorage.getItem(`nearby_photos_${cleanPhone}`)
    : null;

  let parsedLocalPhotos: string[] | null = null;
  if (localPhotosStr) {
    try {
      parsedLocalPhotos = JSON.parse(localPhotosStr);
    } catch {}
  }

  const initialImages: string[] =
    parsedLocalPhotos && parsedLocalPhotos.length > 0
      ? parsedLocalPhotos
      : Array.isArray(vendor?.shop_images) && vendor.shop_images.length > 0
      ? vendor.shop_images
      : vendor?.shop_image
      ? [vendor.shop_image]
      : ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800'];

  const [images, setImages] = useState<string[]>(initialImages);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useBackButton(onClose, isOpen);

  if (!isOpen) return null;

  // Handle uploading files (multiple photos at once)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add photo via direct URL
  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setImages((prev) => [...prev, urlInput.trim()]);
    setUrlInput('');
    setShowUrlField(false);
  };

  // Delete a photo
  const handleDeletePhoto = (index: number) => {
    if (images.length <= 1) {
      alert('Your shop must have at least 1 photo.');
      return;
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Make a photo cover photo (move to index 0)
  const handleSetCover = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const selected = copy.splice(index, 1)[0];
      return [selected, ...copy];
    });
  };

  // Save changes to database and local storage
  const handleSave = async () => {
    setSaving(true);
    try {
      const vendorId = vendor?.id;
      const cleanPhone = (vendor?.phone_number || '').replace(/\D/g, '').slice(-10);

      // Save in localStorage as guaranteed fallback
      if (vendorId) {
        localStorage.setItem(`nearby_photos_${vendorId}`, JSON.stringify(images));
      }
      if (cleanPhone) {
        localStorage.setItem(`nearby_photos_${cleanPhone}`, JSON.stringify(images));
      }

      // Update Supabase DB
      if (vendorId) {
        await supabase
          .from('vendors')
          .update({ shop_images: images })
          .eq('id', vendorId);
      } else if (cleanPhone) {
        await supabase
          .from('vendors')
          .update({ shop_images: images })
          .or(`phone_number.eq.${cleanPhone},phone_number.eq.+91${cleanPhone}`);
      }

      setSuccessMsg('Shop photos updated! Customers can now see all your new photos.');
      if (onPhotosUpdated) onPhotosUpdated();
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error saving shop photos:', err);
      alert('Failed to save photos. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs font-body">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-border-light shadow-card space-y-6 relative max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-light">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl border border-teal-100">
                <Camera size={20} />
              </div>
              <div>
                <h2 className="text-xl font-display font-extrabold text-ink leading-tight">
                  Shop Gallery & Photos
                </h2>
                <p className="text-xs text-ink-muted">
                  Add multiple photos of your shop front, interior, and work
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-ink-muted hover:text-ink hover:bg-surface rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Success Message */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2"
              >
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable Gallery Content */}
          <div className="overflow-y-auto pr-1 space-y-5 flex-1">
            {/* Top Info Banner */}
            <div className="p-3 bg-teal-50/70 border border-teal-200/70 rounded-2xl text-xs text-teal-900 leading-relaxed flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-teal-600 shrink-0" />
                <span>
                  <strong>{images.length} Photos</strong> in your shop gallery
                </span>
              </div>
              <span className="text-[10px] font-display font-bold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full">
                Live for Customers
              </span>
            </div>

            {/* Action Buttons: Add Photos */}
            <div className="grid grid-cols-2 gap-3">
              {/* File Upload Input Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3.5 bg-brand text-white rounded-2xl font-display font-bold text-xs hover:bg-brand-dark transition-colors cursor-pointer shadow-sm shadow-brand/20"
              >
                <Camera size={16} />
                <span>Upload Photos</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Paste URL Input Button */}
              <button
                type="button"
                onClick={() => setShowUrlField(!showUrlField)}
                className="flex items-center justify-center gap-2 p-3.5 bg-surface text-ink border border-border-light hover:bg-surface-card rounded-2xl font-display font-bold text-xs transition-colors cursor-pointer"
              >
                <Plus size={16} />
                <span>Add Image URL</span>
              </button>
            </div>

            {/* Optional URL Input Field */}
            {showUrlField && (
              <form onSubmit={handleAddUrl} className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border-light rounded-xl text-xs font-body focus:outline-none focus:border-brand"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand text-white text-xs font-display font-bold rounded-xl"
                >
                  Add
                </button>
              </form>
            )}

            {/* Photos Grid Display */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {images.map((imgUrl, index) => (
                <div
                  key={index}
                  className="relative group rounded-2xl overflow-hidden border border-border-light aspect-[4/3] bg-surface shadow-xs"
                >
                  <img
                    src={imgUrl}
                    alt={`Shop photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Primary Cover Badge for index 0 */}
                  {index === 0 ? (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-400 text-amber-950 text-[9px] font-display font-black rounded-full shadow-sm flex items-center gap-1">
                      <Star size={10} className="fill-amber-950 text-amber-950" />
                      <span>COVER PHOTO</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetCover(index)}
                      className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 hover:bg-black/80 text-white text-[9px] font-display font-bold rounded-full backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      Set Cover
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(index)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition-transform hover:scale-110 cursor-pointer"
                    title="Delete photo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Save Actions */}
          <div className="pt-3 border-t border-border-light flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface hover:bg-surface-card border border-border-light text-ink font-display font-bold text-xs rounded-2xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-brand hover:bg-brand-dark text-white font-display font-extrabold text-xs rounded-2xl transition-colors cursor-pointer shadow-md shadow-brand/20 flex items-center justify-center gap-2"
            >
              {saving ? (
                <span>Saving Photos...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Gallery</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
