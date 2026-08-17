import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X, Loader2 } from 'lucide-react';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface CitySelectorProps {
  onSelect: (city: string, coords?: LocationCoordinates) => void;
  showDivider?: boolean;
}

interface LocationResult {
  title: string;
  subtitle: string;
  fullLocation: string;
  type?: string;
  latitude?: number;
  longitude?: number;
}

// Pre-cached coordinates for instantaneous zero-latency selection
export const INDIAN_CITY_COORDINATES: Record<string, LocationCoordinates> = {
  'Bangalore': { latitude: 12.9716, longitude: 77.5946 },
  'Mumbai': { latitude: 19.0760, longitude: 72.8777 },
  'Delhi': { latitude: 28.7041, longitude: 77.1025 },
  'Hyderabad': { latitude: 17.3850, longitude: 78.4867 },
  'Chennai': { latitude: 13.0827, longitude: 80.2707 },
  'Pune': { latitude: 18.5204, longitude: 73.8567 },
  'Kolkata': { latitude: 22.5726, longitude: 88.3639 },
  'Ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
  'Jaipur': { latitude: 26.9124, longitude: 75.7873 },
  'Lucknow': { latitude: 26.8467, longitude: 80.9462 },
  'Indore': { latitude: 22.7196, longitude: 75.8577 },
  'Chandigarh': { latitude: 30.7333, longitude: 76.7794 },
  'Sikar': { latitude: 27.6094, longitude: 75.1398 },
  'सीकर': { latitude: 27.6094, longitude: 75.1398 },
  'Surat': { latitude: 21.1702, longitude: 72.8311 },
  'Bhopal': { latitude: 23.2599, longitude: 77.4126 },
  'Patna': { latitude: 25.5941, longitude: 85.1376 },
  'Kochi': { latitude: 9.9312, longitude: 76.2673 },
  'Kota': { latitude: 25.2138, longitude: 75.8648 },
  'Jodhpur': { latitude: 26.2389, longitude: 73.0243 },
  'Udaipur': { latitude: 24.5854, longitude: 73.7125 },
  'Ajmer': { latitude: 26.4499, longitude: 74.6399 },
  'Bikaner': { latitude: 28.0229, longitude: 73.3119 },
  'Jhunjhunu': { latitude: 28.1289, longitude: 75.3995 },
  'Neem Ka Thana': { latitude: 27.7394, longitude: 75.7865 },
};

// Popular cities list (shown as quick chips)
const POPULAR_CITIES = [
  "Bangalore", "Mumbai", "Delhi", "Hyderabad",
  "Chennai", "Pune", "Kolkata", "Ahmedabad",
  "Jaipur", "Lucknow", "Indore", "Chandigarh"
];

// Helper to format place name cleanly
function formatPlaceName(place: any): { title: string; subtitle: string } {
  const addr = place.address || {};
  const mainName =
    addr.village ||
    addr.town ||
    addr.city ||
    addr.suburb ||
    addr.neighbourhood ||
    addr.county ||
    place.name ||
    place.display_name.split(',')[0];

  const stateOrDist = [addr.county, addr.state_district, addr.state]
    .filter(Boolean)
    .filter((part) => part !== mainName)
    .slice(0, 2)
    .join(', ');

  const subtitle = stateOrDist || place.display_name.split(',').slice(1, 3).join(',');

  return { title: mainName, subtitle };
}

export default function CitySelector({ onSelect, showDivider = false }: CitySelectorProps) {
  const [query, setQuery] = useState('');
  const [liveResults, setLiveResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimerRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const cleanQuery = query.trim();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search using OpenStreetMap Nominatim API
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!cleanQuery || cleanQuery.length < 2) {
      setLiveResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          cleanQuery
        )}&countrycodes=in&format=json&limit=6&addressdetails=1`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'NearBe-App',
            'Accept-Language': 'en',
          },
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          const formatted: LocationResult[] = data.map((place: any) => {
            const { title, subtitle } = formatPlaceName(place);
            return {
              title,
              subtitle,
              fullLocation: place.display_name,
              type: place.type || place.class || '',
              latitude: parseFloat(place.lat),
              longitude: parseFloat(place.lon),
            };
          });

          setLiveResults(formatted);
        }
      } catch (err) {
        console.warn('Location search error:', err);
        setSearchError('Search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [cleanQuery]);

  // Set user location handler
  const handleSelectLocation = (cityName: string, lat?: number, lon?: number) => {
    const coords: LocationCoordinates =
      typeof lat === 'number' && typeof lon === 'number'
        ? { latitude: lat, longitude: lon }
        : INDIAN_CITY_COORDINATES[cityName] || { latitude: 27.6094, longitude: 75.1398 };

    // Persist to all localStorage location keys
    const locationPayload = {
      lat: coords.latitude,
      lon: coords.longitude,
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: cityName,
      city: cityName,
      isManual: true,
    };

    try {
      localStorage.setItem('nearbe_user_location', JSON.stringify(locationPayload));
      localStorage.setItem('nearby_location', JSON.stringify(locationPayload));
      localStorage.setItem('nearby_current_gps', JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }));
      localStorage.setItem('nearby_selected_city', cityName);
      localStorage.setItem('nearby_manual_location_selected', 'true');
    } catch {}

    // Dispatch global location updated events for all listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nearby_gps_updated', { detail: { latitude: coords.latitude, longitude: coords.longitude, city: cityName } }));
      window.dispatchEvent(new CustomEvent('nearby_location_changed', { detail: { latitude: coords.latitude, longitude: coords.longitude, city: cityName } }));
    }

    // Invoke parent onSelect
    onSelect(cityName, coords);

    // Reset input
    setQuery('');
    setLiveResults([]);
    setIsFocused(false);
  };

  // Handle click on popular city chip
  const handleSelectPopularCity = async (cityName: string) => {
    const cached = INDIAN_CITY_COORDINATES[cityName];
    if (cached) {
      handleSelectLocation(cityName, cached.latitude, cached.longitude);
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        cityName + ', India'
      )}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'NearBe-App' },
      });
      const data = await response.json();
      if (data && data.length > 0) {
        handleSelectLocation(cityName, parseFloat(data[0].lat), parseFloat(data[0].lon));
      } else {
        handleSelectLocation(cityName);
      }
    } catch {
      handleSelectLocation(cityName);
    }
  };

  // Highlight matching text helper
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <strong key={i} className="text-[#FF5722] font-black">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={wrapperRef} className="w-full select-none font-body">
      {/* Optional Divider Header */}
      {showDivider && (
        <div className="flex items-center gap-3 mb-4 text-[#9E9E9E] text-xs font-semibold tracking-wider uppercase">
          <div className="flex-1 h-px bg-[#E0E0E0]" />
          <span>OR SELECT CITY</span>
          <div className="flex-1 h-px bg-[#E0E0E0]" />
        </div>
      )}

      {/* Search Input Box */}
      <div className="relative mb-5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-base">
          {isSearching ? (
            <Loader2 size={18} className="animate-spin text-[#FF5722]" />
          ) : (
            <Search size={18} className="text-gray-400" />
          )}
        </span>

        <input
          type="text"
          id="citySearchInput"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search village, town, or city..."
          autoComplete="off"
          className="w-full pl-11 pr-10 py-3.5 bg-white text-[15px] font-body text-gray-900 placeholder:text-gray-400 rounded-[30px] border-2 border-gray-200 focus:border-[#FF5722] focus:ring-4 focus:ring-[#FF5722]/10 transition-all duration-200 outline-none shadow-xs"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setLiveResults([]);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        )}

        {/* Live Search Results Dropdown */}
        <AnimatePresence>
          {isFocused && cleanQuery.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-[110%] left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-[300px] overflow-y-auto z-50 divide-y divide-gray-100 custom-scrollbar"
            >
              {isSearching && liveResults.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-xs font-medium flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-[#FF5722]" />
                  <span>Searching locations...</span>
                </div>
              )}

              {searchError && (
                <div className="p-4 text-center text-rose-500 text-xs font-semibold">
                  {searchError}
                </div>
              )}

              {!isSearching && liveResults.length === 0 && !searchError && (
                <div className="p-4 text-center text-gray-500 text-xs">
                  No results for &quot;<strong>{cleanQuery}</strong>&quot;
                </div>
              )}

              {/* Typed custom selection option */}
              <button
                type="button"
                onClick={() => handleSelectLocation(cleanQuery)}
                className="w-full p-3.5 text-left flex items-start gap-2.5 hover:bg-[#FFF3EE] transition-colors cursor-pointer group"
              >
                <span className="text-sm shrink-0 mt-0.5">📍</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-[#FF5722] truncate">
                    Use &quot;{cleanQuery}&quot;
                  </div>
                  <div className="text-[11px] text-gray-400 capitalize">
                    Custom input location
                  </div>
                </div>
              </button>

              {/* Dynamic Live OSM Results */}
              {liveResults.map((place, idx) => (
                <button
                  key={`${place.title}-${idx}`}
                  type="button"
                  onClick={() =>
                    handleSelectLocation(place.title, place.latitude, place.longitude)
                  }
                  className="w-full p-3.5 text-left flex items-start gap-2.5 hover:bg-[#FFF3EE] transition-colors cursor-pointer group"
                >
                  <span className="text-sm shrink-0 mt-0.5">📍</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[#212121] group-hover:text-[#FF5722] truncate">
                      {renderHighlightedText(place.title, cleanQuery)}
                    </div>
                    <div className="text-[11px] text-[#9E9E9E] capitalize truncate">
                      {place.subtitle} {place.type ? `• ${place.type}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* POPULAR CITIES Header */}
      <div className="text-[11px] font-bold tracking-[1px] text-[#9E9E9E] uppercase mb-3">
        POPULAR CITIES
      </div>

      {/* City Chips Grid */}
      <div className="flex flex-wrap gap-2.5">
        {POPULAR_CITIES.map((city, idx) => (
          <motion.button
            key={city}
            type="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.02 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSelectPopularCity(city)}
            className="px-5 py-2.5 rounded-[20px] bg-white border border-[#E0E0E0] hover:bg-[#F5F5F5] hover:border-[#BDBDBD] text-sm font-semibold text-[#424242] transition-all duration-150 cursor-pointer shadow-2xs"
          >
            {city}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
