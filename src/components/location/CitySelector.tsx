import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface CitySelectorProps {
  onSelect: (city: string, coords?: LocationCoordinates) => void;
}

interface LocationResult {
  title: string;
  subtitle: string;
  fullLocation: string;
  latitude?: number;
  longitude?: number;
}

export const INDIAN_CITY_COORDINATES: Record<string, LocationCoordinates> = {
  'Sikar': { latitude: 27.6094, longitude: 75.1398 },
  'सीकर': { latitude: 27.6094, longitude: 75.1398 },
  'Jaipur': { latitude: 26.9124, longitude: 75.7873 },
  'Delhi': { latitude: 28.6139, longitude: 77.2090 },
  'Bangalore': { latitude: 12.9716, longitude: 77.5946 },
  'Mumbai': { latitude: 19.0760, longitude: 72.8777 },
  'Pune': { latitude: 18.5204, longitude: 73.8567 },
  'Gurugram': { latitude: 28.4595, longitude: 77.0266 },
  'Noida': { latitude: 28.5355, longitude: 77.3910 },
  'Kolkata': { latitude: 22.5726, longitude: 88.3639 },
  'Ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
  'Surat': { latitude: 21.1702, longitude: 72.8311 },
  'Hyderabad': { latitude: 17.3850, longitude: 78.4867 },
  'Chennai': { latitude: 13.0827, longitude: 80.2707 },
  'Lucknow': { latitude: 26.8467, longitude: 80.9462 },
  'Chandigarh': { latitude: 30.7333, longitude: 76.7794 },
  'Indore': { latitude: 22.7196, longitude: 75.8577 },
  'Bhopal': { latitude: 23.2599, longitude: 77.4126 },
  'Patna': { latitude: 25.5941, longitude: 85.1376 },
  'Kochi': { latitude: 9.9312, longitude: 76.2673 },
  'Faridabad': { latitude: 28.4089, longitude: 77.3178 },
  'Ghaziabad': { latitude: 28.6692, longitude: 77.4538 },
  'Kota': { latitude: 25.2138, longitude: 75.8648 },
  'Jodhpur': { latitude: 26.2389, longitude: 73.0243 },
  'Udaipur': { latitude: 24.5854, longitude: 73.7125 },
  'Ajmer': { latitude: 26.4499, longitude: 74.6399 },
  'Bikaner': { latitude: 28.0229, longitude: 73.3119 },
  'Jhunjhunu': { latitude: 28.1289, longitude: 75.3995 },
  'Churu': { latitude: 28.2900, longitude: 74.9600 },
  'Neem Ka Thana': { latitude: 27.7394, longitude: 75.7865 },
  'Alwar': { latitude: 27.5530, longitude: 76.6346 },
};

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
              latitude: Number(item.lat),
              longitude: Number(item.lon),
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
      const coords = INDIAN_CITY_COORDINATES[cleanQuery];
      onSelect(cleanQuery, coords);
    } else {
      onSelect('Bangalore', INDIAN_CITY_COORDINATES['Bangalore']);
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
              onClick={() => onSelect(cleanQuery, INDIAN_CITY_COORDINATES[cleanQuery])}
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
              onClick={() =>
                onSelect(
                  loc.title,
                  loc.latitude && loc.longitude
                    ? { latitude: loc.latitude, longitude: loc.longitude }
                    : undefined
                )
              }
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
              onClick={() => onSelect(city, INDIAN_CITY_COORDINATES[city])}
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
                onClick={() => onSelect(city, INDIAN_CITY_COORDINATES[city])}
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
