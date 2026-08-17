import { fetchCombinedVendors } from '../utils/vendorSync';
import { formatDistance } from '../utils/haversine';
import { type Vendor } from '../data/dummyVendors';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  recommendedVendors?: Vendor[];
}

const DEFAULT_SYSTEM_PROMPT = `
You are "NearBe AI", an intelligent, helpful, and friendly hyperlocal assistant for the "NearBe" app in India.
Your mission is to help users find local vendors, emergency services, technicians, home repairs, healthcare, and daily services in their city/area.

Key Guidelines:
1. Be concise, polite, and practical.
2. Support English, Hindi, and Hinglish naturally depending on user query.
3. If the user mentions a specific problem (e.g. "car puncture", "AC not cooling", "electric shock", "haircut", "doctor"), diagnose briefly and recommend the most suitable local vendors from the available vendors list.
4. When you recommend vendors, mention their exact Name and why they are recommended.
5. If the requested service is not in the list, give general helpful advice and suggest checking back soon.
`.trim();

/**
 * Get Gemini API Key from localStorage or environment variable
 */
export function getGeminiApiKey(): string {
  const customKey = localStorage.getItem('nearby_gemini_api_key');
  if (customKey && customKey.trim().length > 5) {
    return customKey.trim();
  }
  return (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
}

/**
 * Set custom Gemini API Key
 */
export function setGeminiApiKey(key: string) {
  if (key) {
    localStorage.setItem('nearby_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('nearby_gemini_api_key');
  }
}

/**
 * Call Google Gemini API to generate response
 */
export async function sendQueryToGemini(
  userQuery: string,
  history: ChatMessage[] = [],
  userCoords?: { latitude: number; longitude: number } | null
): Promise<{ text: string; recommendedVendors: Vendor[] }> {
  const apiKey = getGeminiApiKey();

  // 1. Fetch live nearby vendors to provide as real-time context
  let vendors: Vendor[] = [];
  try {
    vendors = await fetchCombinedVendors(userCoords);
  } catch (e) {
    console.warn('Could not load vendors for Gemini context:', e);
  }

  // 2. Prepare vendor context summary (top 15 closest vendors)
  const vendorSummary = vendors.slice(0, 15).map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    subService: v.subService,
    rating: v.rating,
    isVerified: v.isVerified,
    distance: formatDistance(v.distanceKm),
    phone: v.phoneNumber,
    address: v.address,
    services: Array.isArray(v.servicesOffered) ? v.servicesOffered.map((s) => s.name).join(', ') : '',
  }));

  // Match vendors based on keyword relevance in user query or AI response
  const findMatchingVendors = (query: string, aiResponseText: string = ''): Vendor[] => {
    const combined = `${query} ${aiResponseText}`.toLowerCase();
    const matched: Vendor[] = [];

    for (const v of vendors) {
      const vName = (v.name || '').toLowerCase();
      const vSub = (v.subService || '').toLowerCase();
      const vCat = (v.category || '').toLowerCase();
      const vServ = Array.isArray(v.servicesOffered)
        ? v.servicesOffered.map((s) => s.name.toLowerCase()).join(' ')
        : '';

      if (
        (vName && combined.includes(vName)) ||
        (vSub && combined.includes(vSub)) ||
        (vServ && vServ.split(' ').some((word) => word.length > 3 && combined.includes(word)))
      ) {
        if (!matched.some((m) => m.id === v.id)) {
          matched.push(v);
        }
      }
      if (matched.length >= 3) break;
    }

    // Fallback: If no direct match, check general keywords like puncture, mechanic, ac, doctor
    if (matched.length === 0) {
      if (combined.includes('puncture') || combined.includes('puncher') || combined.includes('tyre')) {
        return vendors.filter((v) => (v.subService || '').toLowerCase().includes('puncture')).slice(0, 2);
      }
      if (combined.includes('mechanic') || combined.includes('repair') || combined.includes('garage') || combined.includes('bike') || combined.includes('car')) {
        return vendors.filter((v) => (v.subService || '').toLowerCase().includes('mechanic') || (v.category || '').includes('vehicle')).slice(0, 2);
      }
      if (combined.includes('ac') || combined.includes('cooling') || combined.includes('cooler')) {
        return vendors.filter((v) => (v.subService || '').toLowerCase().includes('ac')).slice(0, 2);
      }
      if (combined.includes('electric') || combined.includes('light') || combined.includes('switch') || combined.includes('wire')) {
        return vendors.filter((v) => (v.subService || '').toLowerCase().includes('electrician')).slice(0, 2);
      }
      if (combined.includes('doctor') || combined.includes('clinic') || combined.includes('hospital') || combined.includes('medicine') || combined.includes('pharmacy')) {
        return vendors.filter((v) => (v.category || '').includes('healthcare')).slice(0, 2);
      }
    }

    return matched.slice(0, 3);
  };

  // If no API key is provided, provide smart local assistant response
  if (!apiKey) {
    const fallbackMatches = findMatchingVendors(userQuery);
    let fallbackText = '';

    if (fallbackMatches.length > 0) {
      const topV = fallbackMatches[0];
      fallbackText = `I found **${fallbackMatches.length} verified service provider(s)** near you for your request:\n\n` +
        `• **${topV.name}** (${topV.subService || topV.category}) — ⭐ ${topV.rating > 0 ? topV.rating.toFixed(1) : 'New'} (${formatDistance(topV.distanceKm)} away)\n\n` +
        `You can tap below to call or message them on WhatsApp directly. *(To enable live Gemini AI generation, add your Gemini API Key in Chat Settings).*`;
    } else {
      fallbackText = `I am your NearBe Local Assistant! You can ask me to find mechanics, electricians, doctors, grocery shops, or plumbers near you.\n\n*(Tip: Add your Gemini API Key to enable full AI reasoning).*`;
    }

    return {
      text: fallbackText,
      recommendedVendors: fallbackMatches,
    };
  }

  // 3. Construct Gemini API Request
  const systemInstruction = `${DEFAULT_SYSTEM_PROMPT}\n\nCURRENT AVAILABLE NEARBY VENDORS IN NEARBE DATABASE:\n${JSON.stringify(vendorSummary, null, 2)}`;

  // Convert chat history into Gemini contents format
  const contents = [
    ...history.slice(-6).map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    })),
    {
      role: 'user',
      parts: [{ text: userQuery }],
    },
  ];

  try {
    const model = 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I processed your request. How else can I assist you with local services?';

    const matchedVendors = findMatchingVendors(userQuery, candidateText);

    return {
      text: candidateText,
      recommendedVendors: matchedVendors,
    };
  } catch (error: any) {
    console.error('Gemini query error:', error);
    // Intelligent fallback on network/API failure
    const fallbackMatches = findMatchingVendors(userQuery);
    return {
      text: `Here is what I found for you locally in NearBe:\n${fallbackMatches.map((v) => `• **${v.name}** (${v.subService}) - ${formatDistance(v.distanceKm)}`).join('\n') || 'Please try again or check your internet connection.'}`,
      recommendedVendors: fallbackMatches,
    };
  }
}
