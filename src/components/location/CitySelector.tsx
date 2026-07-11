import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

interface CitySelectorProps {
  onSelect: (city: string) => void;
}

const POPULAR_CITIES = [
  'Bangalore',
  'Mumbai',
  'Delhi',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Kochi',
];

export default function CitySelector({ onSelect }: CitySelectorProps) {
  const [query, setQuery] = useState('');

  const filtered = POPULAR_CITIES.filter((city) =>
    city.toLowerCase().includes(query.toLowerCase())
  );

  const handleSubmit = () => {
    const city = query.trim() || 'Bangalore';
    onSelect(city);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm space-y-4"
    >
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Search or enter your city"
          className="w-full pl-12 pr-4 py-3.5 text-base font-body bg-surface-card border-2 border-border rounded-[var(--radius-lg)] transition-all duration-200 outline-none hover:border-ink-muted focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-glow)]"
          autoFocus
        />
      </div>

      {/* Popular cities chips */}
      <div className="flex flex-wrap gap-2">
        {filtered.slice(0, 8).map((city, i) => (
          <motion.button
            key={city}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(city)}
            className="px-4 py-2 text-sm font-body font-medium bg-surface-card border border-border rounded-[var(--radius-pill)] text-ink-light hover:border-brand hover:text-brand hover:bg-brand-50 transition-all duration-200"
          >
            {city}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
