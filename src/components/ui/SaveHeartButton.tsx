import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { isVendorSaved, toggleSaveVendor } from '../../utils/favoritesStorage';

interface SaveHeartButtonProps {
  vendorId: string;
  size?: number;
  className?: string;
  onToggle?: (isSaved: boolean) => void;
}

export default function SaveHeartButton({
  vendorId,
  size = 18,
  className = '',
  onToggle,
}: SaveHeartButtonProps) {
  const [saved, setSaved] = useState<boolean>(() => isVendorSaved(vendorId));

  useEffect(() => {
    const checkSaved = () => {
      setSaved(isVendorSaved(vendorId));
    };

    window.addEventListener('nearby_favorites_changed', checkSaved);
    return () => window.removeEventListener('nearby_favorites_changed', checkSaved);
  }, [vendorId]);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newState = toggleSaveVendor(vendorId);
    setSaved(newState);
    if (onToggle) onToggle(newState);
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      onClick={handleHeartClick}
      className={`p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
        saved
          ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
          : 'bg-surface/80 hover:bg-surface text-ink-muted hover:text-rose-500 border border-border-light/60'
      } ${className}`}
      title={saved ? 'Remove from saved' : 'Save shop to favorites'}
      aria-label={saved ? 'Remove from saved' : 'Save shop'}
    >
      <Heart
        size={size}
        className={`transition-all duration-200 ${
          saved ? 'fill-rose-500 text-rose-500 drop-shadow-xs' : ''
        }`}
      />
    </motion.button>
  );
}
