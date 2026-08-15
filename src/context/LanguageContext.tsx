import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Language = 'en' | 'hi';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    home: 'Home',
    search: 'Search',
    saved: 'Saved',
    profile: 'Profile',
    my_profile: 'My Profile',
    back: 'Back',
    edit: 'Edit',
    cancel: 'Cancel',
    save: 'Save Profile Changes',
    logout: 'Log Out of Account',

    // Dashboard & Category Grid
    what_do_you_need: 'What do you need?',
    tap_category: 'Tap a category to find services',
    see_all: 'See All',
    change_city: 'Change City',
    detect_location: 'Detect My Location',
    set_location: 'Set Location',

    // Search & Headers
    search_nearby: 'Search Nearby',
    search_placeholder: 'Search shops, services, doctors, puncture...',
    popular_searches: 'Popular Searches',
    results_found: 'results',
    clear_filters: 'Clear Search Filters',

    // Categories
    'vehicle-emergency': 'Vehicle & Emergency Support',
    'home-maintenance': 'Home Maintenance',
    'healthcare-wellness': 'Healthcare & Wellness',
    'daily-needs': 'Daily Needs & Hospitality',
    'education-student': 'Education & Student Stay',

    // Services
    Mechanic: 'Mechanic',
    Towing: 'Towing',
    'Puncture Repair': 'Puncture Repair',
    'Fuel Delivery': 'Fuel Delivery',
    Electrician: 'Electrician',
    Plumber: 'Plumber',
    'AC Repair': 'AC Repair',
    Carpenter: 'Carpenter',
    Cleaning: 'Cleaning',
    'Hardware Shop': 'Hardware Shop',
    Doctors: 'Doctors',
    Clinics: 'Clinics',
    Pharmacy: 'Pharmacy',
    'Lab Tests': 'Lab Tests',
    Salon: 'Salon',
    'Grocery/Kirana': 'Grocery/Kirana',
    Hotel: 'Hotel',
    Cafe: 'Cafe',
    Restaurant: 'Restaurant',
    'Clothing Shop': 'Clothing Shop',
    'Coaching/Academy': 'Coaching/Academy',
    Library: 'Library',
    Mess: 'Mess',
    'Hostel/PG': 'Hostel/PG',

    // Actions & Badges
    call: 'Call',
    whatsapp: 'WhatsApp',
    directions: 'Directions',
    map: 'Map',
    open_now: 'Open Now',
    closed: 'Closed',
    manual: 'Manual',
    verified: 'Verified',
    verified_customer: 'Verified Customer',
    services_offered: 'Services Offered',
    customer_reviews: 'Customer Reviews & Ratings',
    write_review: 'Write a Review',
    rate_shop: 'Rate Shop',

    // Profile Screen
    personal_details: 'Personal Details',
    full_name: 'Full Name',
    email_address: 'Email Address',
    saved_location: 'Home / Saved Location Address',
    change_gps: 'Change GPS Location',
    saved_shops: 'Saved Vendors & Shops',
    nearby_alerts: 'Nearby Offer Updates',
    app_language: 'App Language',
    own_a_shop: 'Own a Local Shop?',
    register_shop_promo: 'Register your shop on NearBy & get local customer calls!',
    register_shop_btn: 'Register Your Shop →',
    confirm_logout: 'Confirm Logout',
    my_ratings: 'My Ratings',
    ratings_given: 'Ratings Given',
    no_ratings_yet: 'No ratings given yet',
    delete_rating: 'Delete Rating',
    rating_deleted: 'Rating deleted successfully',
    profile_image: 'Profile Image',
    edit_name: 'Edit Name',
    tap_to_change_photo: 'Tap to change photo',
    name_updated: 'Name updated successfully',
  },
  hi: {
    // Navigation
    home: 'होम',
    search: 'खोजें',
    saved: 'सेव्ड',
    profile: 'प्रोफ़ाइल',
    my_profile: 'मेरी प्रोफ़ाइल',
    back: 'वापस',
    edit: 'एडिट',
    cancel: 'रद्द करें',
    save: 'प्रोफ़ाइल सहेजें',
    logout: 'खाते से लॉग आउट करें',

    // Dashboard & Category Grid
    what_do_you_need: 'आपको किसकी आवश्यकता है?',
    tap_category: 'सेवाएं खोजने के लिए किसी कैटेगरी पर टैप करें',
    see_all: 'सभी देखें',
    change_city: 'शहर बदलें',
    detect_location: 'मेरी लोकेशन खोजें',
    set_location: 'लोकेशन चुनें',

    // Search & Headers
    search_nearby: 'आस-पास खोजें',
    search_placeholder: 'दुकानें, सेवाएं, डॉक्टर, पंचर खोजें...',
    popular_searches: 'लोकप्रिय खोजें',
    results_found: 'परिणाम',
    clear_filters: 'फ़िल्टर हटाएं',

    // Categories
    'vehicle-emergency': 'वाहन एवं इमरजेंसी सहायता',
    'home-maintenance': 'घर की मरम्मत (होम सर्विस)',
    'healthcare-wellness': 'स्वास्थ्य एवं मेडिकल देखभाल',
    'daily-needs': 'दैनिक जरूरतें एवं खान-पान',
    'education-student': 'शिक्षा एवं स्टूडेंट हॉस्टल',

    // Services
    Mechanic: 'मैकेनिक',
    Towing: 'टोइंग सर्विस',
    'Puncture Repair': 'पंचर रिपेयर',
    'Fuel Delivery': 'ईंधन/फ्यूल डिलीवरी',
    Electrician: 'इलेक्ट्रीशियन',
    Plumber: 'प्लम्बर',
    'AC Repair': 'एसी रिपेयर',
    Carpenter: 'कारपेंटर',
    Cleaning: 'होम क्लीनिंग',
    'Hardware Shop': 'हार्डवेयर शॉप',
    Doctors: 'डॉक्टर',
    Clinics: 'क्लिनिक',
    Pharmacy: 'मेडिकल स्टोर',
    'Lab Tests': 'लैब टेस्ट',
    Salon: 'सैलून & ब्यूटी',
    'Grocery/Kirana': 'किराना & ग्रॉसरी',
    Hotel: 'होटल',
    Cafe: 'कैफे',
    Restaurant: 'रेस्टोरेंट',
    'Clothing Shop': 'कपड़ों की दुकान',
    'Coaching/Academy': 'कोचिंग संस्थान',
    Library: 'लाइब्रेरी',
    Mess: 'मैस & टिफिन',
    'Hostel/PG': 'हॉस्टल & PG',

    // Actions & Badges
    call: 'कॉल करें',
    whatsapp: 'व्हाट्सएप',
    directions: 'रास्ता देखें',
    map: 'मैप',
    open_now: 'अभी खुला है',
    closed: 'अभी बंद है',
    manual: 'मैनुअल',
    verified: 'वेरिफाइड',
    verified_customer: 'सत्यापित ग्राहक',
    services_offered: 'उपलब्ध सेवाएं एवं रेट',
    customer_reviews: 'ग्राहकों के रिव्यू एवं रेटिंग',
    write_review: 'रिव्यू लिखें',
    rate_shop: 'रेटिंग दें',

    // Profile Screen
    personal_details: 'व्यक्तिगत जानकारी',
    full_name: 'पूरा नाम',
    email_address: 'ईमेल पता',
    saved_location: 'घर / सेव की गई लोकेशन',
    change_gps: 'GPS लोकेशन बदलें',
    saved_shops: 'सेव की गई दुकानें',
    nearby_alerts: 'लोकल ऑफर्स के अपडेट',
    app_language: 'ऐप की भाषा',
    own_a_shop: 'क्या आपकी दुकान है?',
    register_shop_promo: 'अपनी दुकान नियरबाय पर रजिस्टर करें और ग्राहकों के कॉल पाएं!',
    register_shop_btn: 'दुकान रजिस्टर करें →',
    confirm_logout: 'लॉग आउट की पुष्टि करें',
    my_ratings: 'मेरी रेटिंग्स',
    ratings_given: 'दी गई रेटिंग्स',
    no_ratings_yet: 'अभी तक कोई रेटिंग नहीं दी गई',
    delete_rating: 'रेटिंग हटाएं',
    rating_deleted: 'रेटिंग सफलतापूर्वक हटा दी गई',
    profile_image: 'प्रोफ़ाइल फोटो',
    edit_name: 'नाम बदलें',
    tap_to_change_photo: 'फोटो बदलने के लिए टैप करें',
    name_updated: 'नाम सफलतापूर्वक अपडेट हो गया',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string) => key,
});

const STORAGE_KEY = 'nearby_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'hi' || saved === 'en') return saved;
    } catch (e) {
      console.error('Error loading language setting:', e);
    }
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (e) {
      console.error('Error saving language setting:', e);
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
