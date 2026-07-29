import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

interface CitySelectorProps {
  onSelect: (city: string) => void;
}

interface LocationResult {
  title: string;
  subtitle: string;
  fullLocation: string;
}

const INDIAN_CITIES = [
  // Metro Cities & Major Hubs
  'Bangalore',
  'Mumbai',
  'Delhi',
  'Gurugram',
  'Noida',
  'Faridabad',
  'Ghaziabad',
  'Greater Noida',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Surat',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Indore',
  'Bhopal',
  'Patna',
  'Kochi',
  'Thiruvananthapuram',
  'Kozhikode',
  'Coimbatore',
  'Madurai',
  'Visakhapatnam',
  'Vijayawada',
  'Nagpur',
  'Nashik',
  'Thane',
  'Navi Mumbai',
  'Aurangabad',
  'Rajkot',
  'Vadodara',
  'Kanpur',
  'Varanasi',
  'Agra',
  'Prayagraj',
  'Meerut',
  'Bareilly',
  'Gorakhpur',
  'Ludhiana',
  'Amritsar',
  'Jalandhar',
  'Dehradun',
  'Haridwar',
  'Rishikesh',
  'Shimla',
  'Ranchi',
  'Jamshedpur',
  'Dhanbad',
  'Bhubaneswar',
  'Cuttack',
  'Guwahati',
  'Gwalior',
  'Jabalpur',
  'Ujjain',
  'Raipur',
  'Bhilai',
  'Kota',
  'Jodhpur',
  'Udaipur',
  'Ajmer',
  'Bikaner',
  'Mysore',
  'Hubli',
  'Mangalore',
  'Belgaum',
  'Warangal',
  'Tirupati',
  'Salem',
  'Trichy',
  'Solapur',
  'Amravati',
  'Siliguri',
  'Asansol',
  'Durgapur',
  'Panaji',
  'Jammu',
  'Srinagar',
  'Imphal',
  'Shillong',
  'Agartala',
  'Muzaffarpur',
  'Bhagalpur',
  'Gaya',
  'Jhansi',
  'Mathura',
  'Aligarh',
  'Patiala',
  'Panipat',
  'Karnal',
  'Hisar',
  'Rohtak'
];

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
  'Indore',
  'Chandigarh',
];

export default function CitySelector({ onSelect }: CitySelectorProps) {
  const [query, setQuery] = useState('');
  const [liveResults, setLiveResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<any>(null);

  const cleanQuery = query.trim();

  // Local preset matches
  const localMatches = cleanQuery
    ? INDIAN_CITIES.filter((city) =>
        city.toLowerCase().includes(cleanQuery.toLowerCase())
      )
    : [];

  const exactMatch = INDIAN_CITIES.some(
    (city) => city.toLowerCase() === cleanQuery.toLowerCase()
  );

  // Live OpenStreetMap Geocoding for any village, town, locality or city
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!cleanQuery || cleanQuery.length < 2) {
      setLiveResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          cleanQuery
        )}&countrycodes=in&addressdetails=1&limit=8`;
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
          },
        });
        if (res.ok) {
          const data = await res.json();
          const formatted: LocationResult[] = data.map((item: any) => {
            const addr = item.address || {};
            const mainName =
              addr.village ||
              addr.town ||
              addr.suburb ||
              addr.neighbourhood ||
              addr.city ||
              addr.county ||
              item.name ||
              cleanQuery;

            const stateOrDist =
              addr.state_district || addr.state || addr.country || '';
            const subtitle = stateOrDist ? `${stateOrDist}` : item.display_name;

            return {
              title: mainName,
              subtitle: subtitle,
              fullLocation: item.display_name,
            };
          });
          setLiveResults(formatted);
        }
      } catch (err) {
        console.warn('Live geocoding notice:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [cleanQuery]);

  const handleSubmit = () => {
    if (cleanQuery) {
      onSelect(cleanQuery);
    } else {
      onSelect('Bangalore');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-sm space-y-3 font-body select-none"
    >
      {/* Search Input Bar */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
          {isSearching ? (
            <Loader2 size={18} className="animate-spin text-orange-500" />
          ) : (
            <Search size={18} />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Search village, town, or city..."
          className="w-full pl-11 pr-10 py-3 text-sm font-body bg-white border border-gray-200 rounded-2xl transition-all duration-200 outline-none hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 shadow-xs text-gray-900 placeholder:text-gray-400"
          autoFocus
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Realtime Search Results List */}
      {cleanQuery ? (
        <div className="max-h-60 overflow-y-auto rounded-2xl border border-gray-200/80 bg-white shadow-lg divide-y divide-gray-100/80 custom-scrollbar">
          {/* Custom Typed Option */}
          {!exactMatch && (
            <button
              type="button"
              onClick={() => onSelect(cleanQuery)}
              className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-display font-extrabold text-orange-600 hover:bg-orange-50/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <MapPin size={14} />
                </div>
                <span className="truncate">Use &quot;{cleanQuery}&quot;</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold shrink-0">
                Custom
              </span>
            </button>
          )}

          {/* Live OpenStreetMap Search Results */}
          {liveResults.map((loc, i) => (
            <button
              key={`${loc.title}-${i}`}
              type="button"
              onClick={() => onSelect(loc.title)}
              className="w-full px-4 py-2.5 text-left flex items-start gap-2.5 hover:bg-orange-50/50 transition-colors cursor-pointer group"
            >
              <MapPin size={15} className="text-orange-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-display font-extrabold text-gray-900 group-hover:text-orange-600 truncate">
                  {loc.title}
                </p>
                <p className="text-[10px] text-gray-500 font-body truncate">
                  {loc.subtitle}
                </p>
              </div>
            </button>
          ))}

          {/* Local Preset Fallbacks */}
          {localMatches.map((city) => (
            <button
              key={`preset-${city}`}
              type="button"
              onClick={() => onSelect(city)}
              className="w-full px-4 py-2.5 text-left flex items-center gap-2.5 text-xs font-body font-semibold text-gray-800 hover:bg-orange-50/50 hover:text-orange-600 transition-colors cursor-pointer"
            >
              <MapPin size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{city}</span>
            </button>
          ))}
        </div>
      ) : (
        /* Popular Cities Chips when search query is empty */
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-display font-bold text-gray-400 uppercase tracking-wider">
            Popular Cities
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_CITIES.map((city, i) => (
              <motion.button
                key={city}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(city)}
                className="px-3.5 py-1.5 text-xs font-body font-semibold bg-gray-50 border border-gray-200/80 rounded-full text-gray-700 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all duration-150 cursor-pointer"
              >
                {city}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
