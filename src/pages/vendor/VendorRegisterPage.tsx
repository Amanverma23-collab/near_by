import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Check,
  Lock,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Clock,
  Gift
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useBackButton } from '../../hooks/useBackButton';
import { capturePhoto as captureNativePhoto } from '../../utils/nativeCamera';
import { getCurrentLocation } from '../../utils/nativeGeolocation';
import { ensureUniqueReferralCode, processReferralReward } from '../../utils/referral';

interface ServiceItem {
  name: string;
  price: string;
}

interface WizardData {
  ownerPhoto: string | null;
  fullName: string;
  mobileNumber: string;
  whatsappNumber: string;
  homeAddress: string;
  referredByCode?: string;
  // Step 2
  shopName: string;
  latitude: number;
  longitude: number;
  shopAddress: string;
  shopPhoto: string | null;
  shopCategory: string;
  subServices: string[];
  servicesList: ServiceItem[];
  openingTime: string;
  closingTime: string;
  closedDays: string[];
  isOpen24Hours: boolean;
  city?: string;
}

// Category Configuration with Customer-side colors
const CATEGORIES = [
  {
    id: 'vehicle-emergency',
    name: 'Vehicle & Emergency',
    color: 'orange',
    themeClass: 'border-orange-500 bg-orange-50/50 text-orange-600',
    selectedBg: 'bg-orange-500/10',
    selectedBorder: 'border-orange-500',
    badgeBg: 'bg-orange-500',
    subServicesList: ['Mechanic', 'Towing', 'Puncture Repair', 'Fuel Delivery']
  },
  {
    id: 'home-maintenance',
    name: 'Home Maintenance',
    color: 'emerald',
    themeClass: 'border-emerald-500 bg-emerald-50/50 text-emerald-600',
    selectedBg: 'bg-emerald-500/10',
    selectedBorder: 'border-emerald-500',
    badgeBg: 'bg-emerald-500',
    subServicesList: ['Electrician', 'Plumber', 'AC Repair', 'Carpenter', 'Cleaning', 'Hardware Shop']
  },
  {
    id: 'healthcare-wellness',
    name: 'Healthcare & Wellness',
    color: 'rose',
    themeClass: 'border-rose-500 bg-rose-50/50 text-rose-600',
    selectedBg: 'bg-rose-500/10',
    selectedBorder: 'border-rose-500',
    badgeBg: 'bg-rose-500',
    subServicesList: ['Doctors', 'Clinics', 'Pharmacy', 'Lab Tests']
  },
  {
    id: 'daily-needs',
    name: 'Daily Needs & Hospitality',
    color: 'purple',
    themeClass: 'border-purple-500 bg-purple-50/50 text-purple-600',
    selectedBg: 'bg-purple-500/10',
    selectedBorder: 'border-purple-500',
    badgeBg: 'bg-purple-500',
    subServicesList: ['Laundry', 'Tiffin / Mess', 'PG / Hostel', 'Grocery', 'Restaurant']
  },
  {
    id: 'education-student',
    name: 'Education & Student Stay',
    color: 'blue',
    themeClass: 'border-blue-500 bg-blue-50/50 text-blue-600',
    selectedBg: 'bg-blue-500/10',
    selectedBorder: 'border-blue-500',
    badgeBg: 'bg-blue-500',
    subServicesList: ['Library', 'Coaching / Academy', 'Stationary', 'Book Store', 'Cyber Cafe']
  }
];

// Helper to create Google Maps style red pin marker
const customPinIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute -top-[36px] flex flex-col items-center">
        <!-- Pin Body -->
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg" style="background-color: #EA4335;">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <!-- Pin Tip -->
        <div class="w-2.5 h-2.5 rotate-45 -mt-[6px] border-r border-b border-white shadow-[1px_1px_1px_rgba(0,0,0,0.15)]" style="background-color: #EA4335;"></div>
        <!-- Ground Glow Pulse Shadow -->
        <div class="w-4 h-2 bg-black/25 rounded-full blur-[1px] mt-[2px]"></div>
      </div>
    </div>
  `,
  className: 'custom-map-pin',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// React Leaflet Re-centering helper
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    map.setView([lat, lng], map.getZoom());

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 450);

    return () => clearTimeout(timer);
  }, [lat, lng, map]);
  return null;
}

// React Leaflet Draggable Marker Component
function DraggableMarker({
  lat,
  lng,
  onPositionChange,
  icon
}: {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
  icon: L.DivIcon;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  const eventHandlers = useState(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const pos = marker.getLatLng();
        onPositionChange(pos.lat, pos.lng);
      }
    },
  }))[0];

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[lat, lng]}
      icon={icon}
      ref={markerRef}
    />
  );
}

export default function VendorRegisterPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // If unauthenticated, redirect to Login/Signup page first and remember referral code
  useEffect(() => {
    if (!authLoading && !user) {
      const urlParams = new URLSearchParams(window.location.search);
      const refFromUrl = (urlParams.get('ref') || urlParams.get('referral') || '').trim().toUpperCase();
      if (refFromUrl) {
        localStorage.setItem('nearby_pending_referral_code', refFromUrl);
        localStorage.setItem('nearby_auth_redirect', `/vendor/register?ref=${refFromUrl}`);
      } else {
        localStorage.setItem('nearby_auth_redirect', '/vendor/register');
      }
      navigate('/?mode=register' + (refFromUrl ? `&ref=${refFromUrl}` : ''), { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Wizard state
  const [activeStep, setActiveStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [wizardData, setWizardData] = useState<WizardData>({
    ownerPhoto: null,
    fullName: '',
    mobileNumber: '',
    whatsappNumber: '',
    homeAddress: '',
    shopName: '',
    latitude: 27.6094,
    longitude: 75.1398,
    shopAddress: '',
    shopPhoto: null,
    shopCategory: '',
    subServices: [],
    servicesList: [{ name: '', price: '' }],
    openingTime: '09:00',
    closingTime: '21:00',
    closedDays: ['Sunday'],
    isOpen24Hours: false,
  });

  // Mobile change states
  const [isChangingMobile, setIsChangingMobile] = useState(false);
  const [newMobileNumber, setNewMobileNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState<string[]>(Array(6).fill(''));
  const [otpTimer, setOtpTimer] = useState(0);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // WhatsApp change states
  const [isChangingWhatsapp, setIsChangingWhatsapp] = useState(false);
  const [newWhatsappNumber, setNewWhatsappNumber] = useState('');
  const [whatsappOtpSent, setWhatsappOtpSent] = useState(false);
  const [whatsappOtpCode, setWhatsappOtpCode] = useState<string[]>(Array(6).fill(''));
  const [whatsappOtpTimer, setWhatsappOtpTimer] = useState(0);
  const [verifyingWhatsappOtp, setVerifyingWhatsappOtp] = useState(false);
  const [whatsappOtpError, setWhatsappOtpError] = useState('');
  const whatsappOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'owner' | 'shop'>('owner');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Map references
  const debounceTimerRef = useRef<any>(null);

  // OTP inputs ref for auto-focus
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Hardware Back Button handling
  useBackButton(() => {
    if (isCameraOpen) {
      closeCamera();
    } else if (isChangingMobile) {
      handleCancelMobileChange();
    } else if (isChangingWhatsapp) {
      handleCancelWhatsappChange();
    } else if (activeStep === 2) {
      handleBack();
    } else {
      navigate('/dashboard');
    }
  }, true);

  // Fetch prefilled data from vendors table or customer session & restore saved draft
  useEffect(() => {
    async function fetchVendorData() {
      // 1. Check if there is a saved draft in localStorage
      let savedDraft: Partial<WizardData> | null = null;
      let savedStep = 1;
      try {
        const draftStr = localStorage.getItem('nearby_vendor_draft_data');
        if (draftStr) {
          savedDraft = JSON.parse(draftStr);
        }
        const stepStr = localStorage.getItem('nearby_vendor_draft_step');
        if (stepStr === '2') {
          savedStep = 2;
        }
      } catch (e) {
        console.warn('Error reading saved draft:', e);
      }

      const urlParams = new URLSearchParams(window.location.search);
      const refFromUrl = (urlParams.get('ref') || urlParams.get('referral') || '').trim().toUpperCase();

      const customerName =
        localStorage.getItem('nearby_customer_name') ||
        user?.user_metadata?.full_name ||
        '';
      const customerPhone =
        localStorage.getItem('nearby_customer_phone') ||
        (user?.phone ? user.phone.replace(/\D/g, '').slice(-10) : '') ||
        (user?.email?.includes('@nearbe.app') ? user.email.split('@')[0] : '') ||
        '';

      let dbData: any = null;
      if (user) {
        try {
          const { data, error } = await supabase
            .from('vendors')
            .select('owner_name, phone_number, whatsapp_number, referral_code, referred_by_code')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (!error && data) {
            dbData = data;
          }
        } catch (err) {
          console.error('Error fetching initial profile from db:', err);
        }
      }

      const resolvedFullName = savedDraft?.fullName || dbData?.owner_name || customerName || '';
      const resolvedPhone = savedDraft?.mobileNumber || dbData?.phone_number || customerPhone || '';
      const resolvedWhatsapp = savedDraft?.whatsappNumber || dbData?.whatsapp_number || resolvedPhone || customerPhone || '';
      const resolvedReferredBy = refFromUrl || savedDraft?.referredByCode || dbData?.referred_by_code || '';

      const mergedData: WizardData = {
        ownerPhoto: savedDraft?.ownerPhoto || null,
        fullName: resolvedFullName,
        mobileNumber: resolvedPhone,
        whatsappNumber: resolvedWhatsapp,
        homeAddress: savedDraft?.homeAddress || '',
        referredByCode: resolvedReferredBy,
        shopName: savedDraft?.shopName || '',
        latitude: savedDraft?.latitude || 27.6094,
        longitude: savedDraft?.longitude || 75.1398,
        shopAddress: savedDraft?.shopAddress || '',
        shopPhoto: savedDraft?.shopPhoto || null,
        shopCategory: savedDraft?.shopCategory || '',
        subServices: savedDraft?.subServices || [],
        servicesList: savedDraft?.servicesList && savedDraft.servicesList.length > 0
          ? savedDraft.servicesList
          : [{ name: '', price: '' }],
        openingTime: savedDraft?.openingTime || '09:00',
        closingTime: savedDraft?.closingTime || '21:00',
        closedDays: savedDraft?.closedDays !== undefined ? savedDraft.closedDays : ['Sunday'],
        isOpen24Hours: savedDraft?.isOpen24Hours || false,
      };

      setWizardData(mergedData);
      setLoadingProfile(false);

      // If Step 1 was completed and saved at Step 2, jump straight to Step 2!
      const isStep1Done =
        Boolean(mergedData.ownerPhoto) &&
        Boolean(mergedData.fullName.trim()) &&
        mergedData.mobileNumber.length === 10 &&
        mergedData.whatsappNumber.length === 10 &&
        mergedData.homeAddress.trim().length >= 10;

      if (savedStep === 2 && isStep1Done) {
        setActiveStep(2);
      }
    }
    fetchVendorData();
  }, [user]);

  // Auto-save form progress to localStorage
  useEffect(() => {
    if (!loadingProfile) {
      try {
        localStorage.setItem('nearby_vendor_draft_data', JSON.stringify(wizardData));
        localStorage.setItem('nearby_vendor_draft_step', String(activeStep));
      } catch (e) {
        console.warn('Draft auto-save error:', e);
      }
    }
  }, [wizardData, activeStep, loadingProfile]);

  // Request GPS permission and center location
  useEffect(() => {
    if (activeStep === 2) {
      getCurrentLocation()
        .then(({ latitude, longitude }) => {
          setWizardData((prev) => ({
            ...prev,
            latitude,
            longitude,
          }));
          handleMarkerPositionChange(latitude, longitude);
        })
        .catch((error) => {
          console.warn('Geolocation permission error:', error);
          handleMarkerPositionChange(wizardData.latitude, wizardData.longitude);
        });
    }
  }, [activeStep]);

  // Handle OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  useEffect(() => {
    if (whatsappOtpTimer > 0) {
      const timer = setTimeout(() => setWhatsappOtpTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [whatsappOtpTimer]);

  // Reverse geocoding (OpenStreetMap Nominatim)
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.display_name) {
        const detectedCity =
          data.address?.city ||
          data.address?.town ||
          data.address?.municipality ||
          data.address?.district ||
          data.address?.state_district ||
          data.address?.county ||
          data.address?.state ||
          '';
        setWizardData(prev => ({
          ...prev,
          shopAddress: data.display_name,
          city: detectedCity || prev.city || '',
        }));
      }
    } catch (err) {
      console.error('Reverse geocoding error:', err);
    }
  };

  const handleMarkerPositionChange = (lat: number, lon: number) => {
    setWizardData(prev => ({ ...prev, latitude: lat, longitude: lon }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      reverseGeocode(lat, lon);
    }, 1000);
  };

  const useCurrentLocation = async () => {
    try {
      const { latitude, longitude } = await getCurrentLocation();
      setWizardData((prev) => ({
        ...prev,
        latitude,
        longitude,
      }));
      handleMarkerPositionChange(latitude, longitude);
    } catch (err) {
      console.error('Error fetching current location:', err);
    }
  };

  // Camera handling (Capacitor Native Camera on mobile, direct WebRTC on web/desktop)
  const openCamera = async (mode: 'owner' | 'shop') => {
    setCameraMode(mode);
    setCameraError('');

    // Attempt Capacitor Native Camera ONLY if on native device (Android/iOS)
    try {
      const nativePhoto = await captureNativePhoto();
      if (nativePhoto) {
        if (mode === 'owner') {
          setWizardData((prev) => ({ ...prev, ownerPhoto: nativePhoto }));
          triggerSuccessToast('Selfie captured successfully');
        } else {
          setWizardData((prev) => ({ ...prev, shopPhoto: nativePhoto }));
          triggerSuccessToast('Shop front photo captured successfully');
        }
        return;
      }
    } catch (err) {
      console.warn('Native camera capture fallback to web camera:', err);
    }

    // Direct WebRTC Live Camera (on desktop/web browsers)
    setIsCameraOpen(true);
    try {
      const facing = mode === 'owner' ? 'user' : 'environment';
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Error opening camera:', err);
      setCameraError('Camera access denied or unavailable. Please check permissions.');
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror front camera (selfie)
        if (cameraMode === 'owner') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        if (cameraMode === 'owner') {
          setWizardData(prev => ({ ...prev, ownerPhoto: dataUrl }));
          triggerSuccessToast('Selfie captured successfully');
        } else {
          setWizardData(prev => ({ ...prev, shopPhoto: dataUrl }));
          triggerSuccessToast('Shop front photo captured successfully');
        }
        closeCamera();
      }
    }
  };

  // Convert Base64 image to Blob
  const base64ToBlob = (base64: string, contentType = 'image/jpeg') => {
    const parts = base64.split(';base64,');
    const byteCharacters = atob(parts[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  };

  // OTP change mobile flow
  const triggerSuccessToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleStartMobileChange = () => {
    setIsChangingMobile(true);
    setNewMobileNumber('');
    setOtpSent(false);
    setOtpError('');
  };

  const handleCancelMobileChange = () => {
    setIsChangingMobile(false);
    setOtpSent(false);
    setOtpError('');
    setNewMobileNumber('');
  };

  const handleSendOtp = () => {
    if (newMobileNumber.length !== 10) return;
    setOtpSent(true);
    setOtpTimer(30);
    setOtpCode(Array(6).fill(''));
    setOtpError('');
    triggerSuccessToast(`OTP sent to +91 ${newMobileNumber}`);
  };

  const handleOtpChange = (val: string, index: number) => {
    if (isNaN(Number(val))) return;
    const newCode = [...otpCode];
    newCode[index] = val.slice(-1);
    setOtpCode(newCode);

    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const fullOtp = otpCode.join('');
    if (fullOtp.length !== 6) return;

    setVerifyingOtp(true);
    setOtpError('');

    setTimeout(() => {
      if (fullOtp === '123456') {
        setWizardData(prev => ({ ...prev, mobileNumber: newMobileNumber }));
        setIsChangingMobile(false);
        setOtpSent(false);
        setVerifyingOtp(false);
        triggerSuccessToast('Mobile number updated');
      } else {
        setOtpError('Invalid verification code. Use 123456 for testing.');
        setVerifyingOtp(false);
      }
    }, 1000);
  };

  // WhatsApp change handlers
  const handleStartWhatsappChange = () => {
    setIsChangingWhatsapp(true);
    setNewWhatsappNumber('');
    setWhatsappOtpSent(false);
    setWhatsappOtpError('');
  };

  const handleCancelWhatsappChange = () => {
    setIsChangingWhatsapp(false);
    setWhatsappOtpSent(false);
    setWhatsappOtpError('');
    setNewWhatsappNumber('');
  };

  const handleSendWhatsappOtp = () => {
    if (newWhatsappNumber.length !== 10) return;
    setWhatsappOtpSent(true);
    setWhatsappOtpTimer(30);
    setWhatsappOtpCode(Array(6).fill(''));
    setWhatsappOtpError('');
    triggerSuccessToast(`OTP sent to WhatsApp +91 ${newWhatsappNumber}`);
  };

  const handleWhatsappOtpChange = (val: string, index: number) => {
    if (isNaN(Number(val))) return;
    const newCode = [...whatsappOtpCode];
    newCode[index] = val.slice(-1);
    setWhatsappOtpCode(newCode);

    if (val && index < 5) {
      whatsappOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleWhatsappOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !whatsappOtpCode[index] && index > 0) {
      whatsappOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyWhatsappOtp = async () => {
    const fullOtp = whatsappOtpCode.join('');
    if (fullOtp.length !== 6) return;

    setVerifyingWhatsappOtp(true);
    setWhatsappOtpError('');

    setTimeout(() => {
      if (fullOtp === '123456') {
        setWizardData(prev => ({ ...prev, whatsappNumber: newWhatsappNumber }));
        setIsChangingWhatsapp(false);
        setWhatsappOtpSent(false);
        setVerifyingWhatsappOtp(false);
        triggerSuccessToast('WhatsApp number updated');
      } else {
        setWhatsappOtpError('Invalid verification code. Use 123456 for testing.');
        setVerifyingWhatsappOtp(false);
      }
    }, 1000);
  };

  // Category and sub-services selects
  const handleCategorySelect = (categoryId: string) => {
    setWizardData(prev => ({
      ...prev,
      shopCategory: categoryId,
      subServices: [] // Reset sub-services on parent change
    }));
  };

  const handleSubServiceToggle = (subService: string) => {
    setWizardData(prev => {
      const exists = prev.subServices.includes(subService);
      const updated = exists
        ? prev.subServices.filter(s => s !== subService)
        : [...prev.subServices, subService];
      return { ...prev, subServices: updated };
    });
  };

  // Services Repeatable list
  const handleServiceChange = (idx: number, field: 'name' | 'price', val: string) => {
    const updated = [...wizardData.servicesList];
    updated[idx][field] = val;
    setWizardData(prev => ({ ...prev, servicesList: updated }));
  };

  const handleAddServiceRow = () => {
    setWizardData(prev => ({
      ...prev,
      servicesList: [...prev.servicesList, { name: '', price: '' }]
    }));
  };

  const handleRemoveServiceRow = (idx: number) => {
    const updated = wizardData.servicesList.filter((_, i) => i !== idx);
    setWizardData(prev => ({ ...prev, servicesList: updated }));
  };

  // Step Validations
  const isStep1Valid =
    wizardData.ownerPhoto !== null &&
    wizardData.fullName.trim() !== '' &&
    wizardData.mobileNumber.length === 10 &&
    !isChangingMobile &&
    wizardData.whatsappNumber.length === 10 &&
    !isChangingWhatsapp &&
    wizardData.homeAddress.trim().length >= 10;

  const isStep2Valid =
    wizardData.shopName.trim() !== '' &&
    wizardData.shopPhoto !== null &&
    wizardData.shopCategory !== '' &&
    wizardData.subServices.length >= 1;

  const handleNext = () => {
    if (!isStep1Valid) return;
    try {
      localStorage.setItem('nearby_vendor_draft_data', JSON.stringify(wizardData));
      localStorage.setItem('nearby_vendor_draft_step', '2');
    } catch (e) {
      console.warn('Draft save error:', e);
    }
    setDirection(1);
    setActiveStep(2);
  };

  const handleBack = () => {
    try {
      localStorage.setItem('nearby_vendor_draft_step', '1');
    } catch (e) {
      console.warn('Draft save error:', e);
    }
    setDirection(-1);
    setActiveStep(1);
  };

  // Helper function to format 24h time to 12h AM/PM
  const formatTime12H = (time24?: string): string => {
    if (!time24) return 'N/A';
    const parts = time24.split(':');
    if (parts.length < 2) return time24;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return time24;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  // Final Registration Submit Flow
  const handleSubmit = async () => {
    if (!isStep1Valid || !isStep2Valid || !user) return;
    setSubmitting(true);

    try {
      // Always store the real captured base64 photo data directly so real camera photos show in Admin Dashboard
      const shopUrl = wizardData.shopPhoto || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600';
      const selfieUrl = wizardData.ownerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600';

      // Filter optional services list
      const cleanServices = wizardData.servicesList
        .filter(s => s.name.trim() !== '')
        .map(s => ({ name: s.name.trim(), price: s.price.trim() }));

      // Compute formatted opening hours string
      const formattedOpen = formatTime12H(wizardData.openingTime || '09:00');
      const formattedClose = formatTime12H(wizardData.closingTime || '21:00');
      const closedDaysText =
        wizardData.closedDays.length === 0
          ? 'Open all 7 days'
          : `Closed on ${wizardData.closedDays.join(', ')}`;
      const computedOpeningHours = wizardData.isOpen24Hours
        ? `Open 24 Hours (${closedDaysText})`
        : `${formattedOpen} - ${formattedClose} (${closedDaysText})`;

      const selectedCityFromStorage =
        localStorage.getItem('nearby_selected_city') ||
        localStorage.getItem('nearby_user_city');
      const resolvedCity = wizardData.city?.trim() || selectedCityFromStorage || 'Not Specified';

      // 3. Update database row with all required columns matching Supabase schema
      const updatePayload: any = {
        name: wizardData.shopName.trim(),
        owner_name: wizardData.fullName.trim(),
        phone_number: wizardData.mobileNumber,
        category: wizardData.shopCategory,
        sub_service: wizardData.subServices.join(', '),
        address: wizardData.shopAddress.trim(),
        latitude: wizardData.latitude,
        longitude: wizardData.longitude,
        shop_images: [shopUrl, selfieUrl],
        services_offered: cleanServices,
        is_verified: false,
        whatsapp_number: wizardData.whatsappNumber || wizardData.mobileNumber,
        opening_hours: computedOpeningHours,
        city: resolvedCity,
      };

      // Check if vendor row already exists by auth_user_id or phone_number
      const { data: authVendors } = await supabase
        .from('vendors')
        .select('id, referral_code, referred_by_code, referral_counted')
        .eq('auth_user_id', user.id);

      const { data: phoneVendors } = (!authVendors || authVendors.length === 0) && wizardData.mobileNumber
        ? await supabase
          .from('vendors')
          .select('id, referral_code, referred_by_code, referral_counted')
          .eq('phone_number', wizardData.mobileNumber)
        : { data: null };

      const existingVendors = (authVendors && authVendors.length > 0) ? authVendors : (phoneVendors || []);
      const existingVendor = existingVendors.length > 0 ? existingVendors[0] : null;
      const existingId = existingVendor?.id || null;

      // Assign or keep unique referral code
      const assignedReferralCode = existingVendor?.referral_code || (await ensureUniqueReferralCode(wizardData.fullName));
      const cleanReferredByCode = wizardData.referredByCode?.trim().toUpperCase() || existingVendor?.referred_by_code || null;

      const fullPayload = {
        ...updatePayload,
        auth_user_id: user.id,
        verification_status: 'pending',
        verification_requested_at: new Date().toISOString(),
        referral_code: assignedReferralCode,
        ...(cleanReferredByCode ? { referred_by_code: cleanReferredByCode } : {}),
      };

      if (existingId) {
        // UPDATE existing vendor record
        const { error: updateErr } = await supabase
          .from('vendors')
          .update(fullPayload)
          .eq('id', existingId);

        if (updateErr) {
          console.warn('Failed with verification columns, retrying basic update...', updateErr);
          const { error: basicErr } = await supabase
            .from('vendors')
            .update(updatePayload)
            .eq('id', existingId);
          if (basicErr) throw basicErr;
        }
      } else {
        // INSERT new vendor record if none existed
        const { error: insertErr } = await supabase
          .from('vendors')
          .insert(fullPayload);

        if (insertErr) {
          console.warn('Failed with verification columns, retrying basic insert...', insertErr);
          const { error: basicErr } = await supabase
            .from('vendors')
            .insert({
              ...updatePayload,
              auth_user_id: user.id
            });
          if (basicErr) throw basicErr;
        }
      }

      // Process Vendor-to-Vendor referral reward if referred_by_code is provided
      let finalVendorId = existingId;
      if (!finalVendorId) {
        const { data: insertedV } = await supabase
          .from('vendors')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        finalVendorId = insertedV?.id || null;
      }

      if (finalVendorId && cleanReferredByCode) {
        try {
          await processReferralReward({
            id: finalVendorId,
            referral_code: assignedReferralCode,
            referred_by_code: cleanReferredByCode,
            referral_counted: existingVendor?.referral_counted || false,
          });
        } catch (refErr) {
          console.warn('Referral reward processing error:', refErr);
        }
      }

      window.dispatchEvent(new Event('nearby_vendor_updated'));

      // Clear draft on successful submission
      localStorage.removeItem('nearby_vendor_draft_data');
      localStorage.removeItem('nearby_vendor_draft_step');

      // Redirect to Pending Verification screen
      navigate('/vendor/pending');
    } catch (err: any) {
      console.error('Verification submission failed:', err);
      alert('Failed to submit registration: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Animation variants
  const slideVariants = {
    initial: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 260,
        damping: 24,
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
      transition: { duration: 0.25 }
    })
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 200, damping: 18 }
    }
  };

  const selectedParentCategory = CATEGORIES.find(c => c.id === wizardData.shopCategory);

  return (
    <div className="vendor-mode min-h-screen bg-surface flex flex-col font-body pb-24 sm:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-border-light">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (activeStep === 2) {
                  handleBack();
                } else {
                  navigate('/dashboard');
                }
              }}
              className="p-2 hover:bg-surface rounded-full transition-colors cursor-pointer text-ink-muted hover:text-ink border border-border-light"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold font-display">
                <span className="text-ink">Near</span>
                <span className="text-brand">By</span>
              </span>
              <span className="text-[10px] font-display font-extrabold px-2 py-0.5 rounded-full bg-brand/10 text-brand uppercase tracking-wider">
                Partner
              </span>
            </div>
          </div>

          {/* Progress segments */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-display font-bold text-ink">
                Step {activeStep} of 2
              </div>
              <div className="text-[10px] text-ink-muted">
                {activeStep === 1 ? 'Owner Details' : 'Shop Details'}
              </div>
            </div>
            <div className="flex gap-1.5 items-center">
              <div className={`w-6 h-2 rounded-full transition-all duration-300 bg-brand flex items-center justify-center`}>
                <Check size={8} className="text-white" strokeWidth={4} />
              </div>
              <div className={`w-6 h-2 rounded-full transition-all duration-300 border ${activeStep === 2 ? 'bg-brand shadow-brand border-transparent' : 'bg-transparent border-border'}`} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-8 flex flex-col justify-center">

        {loadingProfile ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <Loader2 className="animate-spin text-brand" size={32} />
            <p className="text-sm text-ink-muted mt-2">Loading registration data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait" custom={direction}>
            {activeStep === 1 ? (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-border-light shadow-card space-y-6"
              >
                <div className="text-center sm:text-left mb-2">
                  <h2 className="text-2xl font-display font-extrabold text-ink">
                    Owner Details
                  </h2>
                  <p className="text-xs sm:text-sm text-ink-muted mt-1">
                    Please provide your authentic identification details to verify your account.
                  </p>
                </div>

                {/* Field 1: Live Photo Capture */}
                <motion.div variants={itemVariants} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-display font-bold text-ink-light self-start">
                    Owner Photo (Selfie) <span className="text-brand">*</span>
                  </span>

                  <div className="relative group">
                    <button
                      onClick={() => openCamera('owner')}
                      className={`w-36 h-36 rounded-full overflow-hidden border-2 flex flex-col items-center justify-center transition-all duration-300 relative cursor-pointer ${wizardData.ownerPhoto
                          ? 'border-brand'
                          : 'border-dashed border-border hover:border-brand bg-surface'
                        }`}
                    >
                      {wizardData.ownerPhoto ? (
                        <>
                          <img
                            src={wizardData.ownerPhoto}
                            alt="Owner photo preview"
                            className="w-full h-full object-cover"
                          />
                          {/* Success Badge */}
                          <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand border-2 border-white flex items-center justify-center text-white shadow-md">
                            <Check size={16} strokeWidth={3} />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <Camera size={26} className="text-ink-muted group-hover:text-brand transition-colors mb-1.5" />
                          <span className="text-[11px] font-display font-bold text-ink-muted group-hover:text-brand transition-colors leading-tight">
                            Take a live photo
                          </span>
                        </div>
                      )}
                    </button>
                  </div>

                  {wizardData.ownerPhoto && (
                    <button
                      onClick={() => openCamera('owner')}
                      className="text-xs font-display font-bold text-brand hover:text-brand-dark flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      <span>Retake Photo</span>
                    </button>
                  )}
                </motion.div>

                {/* Field 2: Full Name (Read-Only) */}
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <label className="text-xs font-display font-bold text-ink-light block">
                    Full Name
                  </label>
                  <div className="relative rounded-[var(--radius-md)] overflow-hidden bg-surface border border-border-light flex items-center pr-3.5">
                    <input
                      type="text"
                      value={wizardData.fullName}
                      disabled
                      readOnly
                      className="w-full py-3 px-4 text-sm text-ink-muted cursor-not-allowed bg-transparent focus:outline-none"
                    />
                    <Lock size={15} className="text-ink-muted" />
                  </div>
                </motion.div>

                {/* Field 3: Mobile Number (Read-Only / Edit inline with OTP) */}
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-display font-bold text-ink-light">
                      Mobile Number
                    </label>
                    {!isChangingMobile && (
                      <button
                        onClick={handleStartMobileChange}
                        className="text-xs font-display font-bold text-brand hover:text-brand-dark flex items-center gap-1 cursor-pointer"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {!isChangingMobile ? (
                      <motion.div
                        key="view-mobile"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative rounded-[var(--radius-md)] overflow-hidden bg-surface border border-border-light flex items-center pr-3.5"
                      >
                        <span className="pl-4 text-sm text-ink-muted">+91</span>
                        <input
                          type="text"
                          value={wizardData.mobileNumber}
                          disabled
                          readOnly
                          className="w-full py-3 px-2 text-sm text-ink-muted cursor-not-allowed bg-transparent focus:outline-none"
                        />
                        <Lock size={15} className="text-ink-muted" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="edit-mobile"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <div className="relative rounded-[var(--radius-md)] border border-brand/50 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-glow flex items-center pr-2 bg-white transition-all">
                          <span className="pl-4 text-sm text-ink-light">+91</span>
                          <input
                            type="text"
                            maxLength={10}
                            value={newMobileNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (val.length <= 10) setNewMobileNumber(val);
                            }}
                            placeholder="Enter 10-digit number"
                            disabled={otpSent}
                            className="w-full py-3 px-2 text-sm text-ink focus:outline-none"
                          />
                        </div>

                        {newMobileNumber.length === 10 && !otpSent && (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSendOtp}
                              className="flex-1 py-2.5 bg-brand hover:bg-brand-dark text-white font-display font-bold text-xs rounded-xl shadow-brand cursor-pointer transition-colors"
                            >
                              Verify via OTP
                            </button>
                            <button
                              onClick={handleCancelMobileChange}
                              className="py-2.5 px-4 border border-border text-ink-muted hover:text-ink font-display font-bold text-xs rounded-xl hover:bg-surface cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {otpSent && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3 p-4 bg-surface rounded-2xl border border-border-light"
                          >
                            <span className="text-[11px] font-display font-bold text-ink-light block">
                              Enter 6-digit Verification Code:
                            </span>

                            <div className="flex justify-between gap-1.5 max-w-xs mx-auto">
                              {otpCode.map((digit, i) => (
                                <input
                                  key={i}
                                  ref={el => { otpRefs.current[i] = el; }}
                                  type="text"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) => handleOtpChange(e.target.value, i)}
                                  onKeyDown={(e) => handleOtpKeyDown(e, i)}
                                  className="w-10 h-12 text-center text-lg font-display font-bold border border-border focus:border-brand focus:ring-2 focus:ring-brand-glow rounded-xl bg-white focus:outline-none"
                                />
                              ))}
                            </div>

                            {otpError && (
                              <p className="text-[11px] text-red-500 font-body flex items-center gap-1">
                                <AlertCircle size={12} />
                                <span>{otpError}</span>
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              <button
                                onClick={handleVerifyOtp}
                                disabled={otpCode.join('').length !== 6 || verifyingOtp}
                                className="px-5 py-2 bg-brand text-white font-display font-bold text-xs rounded-lg shadow-brand cursor-pointer hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                              >
                                {verifyingOtp && <Loader2 size={12} className="animate-spin" />}
                                <span>Confirm Code</span>
                              </button>

                              <div className="flex items-center gap-3">
                                <button
                                  onClick={handleSendOtp}
                                  disabled={otpTimer > 0}
                                  className="text-xs font-display font-bold text-brand disabled:text-ink-muted cursor-pointer"
                                >
                                  {otpTimer > 0 ? `Resend (${otpTimer}s)` : 'Resend'}
                                </button>
                                <button
                                  onClick={handleCancelMobileChange}
                                  className="text-xs font-display font-bold text-ink-muted hover:text-ink cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Field: WhatsApp Number (Read-Only / Edit inline with OTP) */}
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-display font-bold text-ink-light">
                        WhatsApp Number
                      </label>
                      <span className="text-[10px] font-display font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        WhatsApp
                      </span>
                    </div>
                    {!isChangingWhatsapp && (
                      <button
                        onClick={handleStartWhatsappChange}
                        className="text-xs font-display font-bold text-brand hover:text-brand-dark flex items-center gap-1 cursor-pointer"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {!isChangingWhatsapp ? (
                      <motion.div
                        key="view-whatsapp"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative rounded-[var(--radius-md)] overflow-hidden bg-surface border border-border-light flex items-center pr-3.5"
                      >
                        <span className="pl-4 text-sm text-ink-muted">+91</span>
                        <input
                          type="text"
                          value={wizardData.whatsappNumber}
                          disabled
                          readOnly
                          className="w-full py-3 px-2 text-sm text-ink-muted cursor-not-allowed bg-transparent focus:outline-none"
                        />
                        <Lock size={15} className="text-ink-muted" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="edit-whatsapp"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <div className="relative rounded-[var(--radius-md)] border border-emerald-500/50 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 flex items-center pr-2 bg-white transition-all">
                          <span className="pl-4 text-sm text-ink-light">+91</span>
                          <input
                            type="text"
                            maxLength={10}
                            value={newWhatsappNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (val.length <= 10) setNewWhatsappNumber(val);
                            }}
                            placeholder="Enter 10-digit WhatsApp number"
                            disabled={whatsappOtpSent}
                            className="w-full py-3 px-2 text-sm text-ink focus:outline-none"
                          />
                        </div>

                        {newWhatsappNumber.length === 10 && !whatsappOtpSent && (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSendWhatsappOtp}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                            >
                              Verify via OTP
                            </button>
                            <button
                              onClick={handleCancelWhatsappChange}
                              className="py-2.5 px-4 border border-border text-ink-muted hover:text-ink font-display font-bold text-xs rounded-xl hover:bg-surface cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {whatsappOtpSent && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3 p-4 bg-surface rounded-2xl border border-border-light"
                          >
                            <span className="text-[11px] font-display font-bold text-ink-light block">
                              Enter 6-digit WhatsApp Verification Code:
                            </span>

                            <div className="flex justify-between gap-1.5 max-w-xs mx-auto">
                              {whatsappOtpCode.map((digit, i) => (
                                <input
                                  key={i}
                                  ref={el => { whatsappOtpRefs.current[i] = el; }}
                                  type="text"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) => handleWhatsappOtpChange(e.target.value, i)}
                                  onKeyDown={(e) => handleWhatsappOtpKeyDown(e, i)}
                                  className="w-10 h-12 text-center text-lg font-display font-bold border border-border focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-xl bg-white focus:outline-none"
                                />
                              ))}
                            </div>

                            {whatsappOtpError && (
                              <p className="text-[11px] text-red-500 font-body flex items-center gap-1">
                                <AlertCircle size={12} />
                                <span>{whatsappOtpError}</span>
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              <button
                                onClick={handleVerifyWhatsappOtp}
                                disabled={whatsappOtpCode.join('').length !== 6 || verifyingWhatsappOtp}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs rounded-lg shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                              >
                                {verifyingWhatsappOtp && <Loader2 size={12} className="animate-spin" />}
                                <span>Confirm Code</span>
                              </button>

                              <div className="flex items-center gap-3">
                                <button
                                  onClick={handleSendWhatsappOtp}
                                  disabled={whatsappOtpTimer > 0}
                                  className="text-xs font-display font-bold text-emerald-700 disabled:text-ink-muted cursor-pointer"
                                >
                                  {whatsappOtpTimer > 0 ? `Resend (${whatsappOtpTimer}s)` : 'Resend'}
                                </button>
                                <button
                                  onClick={handleCancelWhatsappChange}
                                  className="text-xs font-display font-bold text-ink-muted hover:text-ink cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Field 4: Home Address */}
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <label className="text-xs font-display font-bold text-ink-light block">
                    Home Address <span className="text-brand">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={wizardData.homeAddress}
                    onChange={(e) => setWizardData(prev => ({ ...prev, homeAddress: e.target.value }))}
                    placeholder="Enter your complete home address"
                    className="w-full py-3 px-4 text-sm text-ink border border-border-light rounded-[var(--radius-md)] focus:border-brand focus:ring-2 focus:ring-brand-glow focus:outline-none transition-all placeholder:text-ink-muted bg-white"
                  />
                  <span className="text-[10px] text-ink-muted block mt-1">
                    Minimum 10 characters required.
                  </span>
                </motion.div>

                {/* Field 5: Referral Code (Optional) */}
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-display font-bold text-ink-light flex items-center gap-1.5">
                      <Gift size={14} className="text-brand" />
                      <span>Referral Code (Optional)</span>
                    </label>
                    {wizardData.referredByCode && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Code Linked
                      </span>
                    )}
                  </div>
                  <div className="relative rounded-[var(--radius-md)] overflow-hidden bg-white border border-border-light focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-glow flex items-center pr-3 transition-all">
                    <input
                      type="text"
                      maxLength={12}
                      value={wizardData.referredByCode || ''}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        setWizardData(prev => ({ ...prev, referredByCode: val }));
                      }}
                      placeholder="e.g. RAJU4821"
                      className="w-full py-3 px-4 text-sm font-mono uppercase text-ink placeholder:text-ink-muted focus:outline-none bg-transparent"
                    />
                    {wizardData.referredByCode && (
                      <button
                        type="button"
                        onClick={() => setWizardData(prev => ({ ...prev, referredByCode: '' }))}
                        className="text-xs text-ink-muted hover:text-ink font-bold px-1.5 py-0.5 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-ink-muted block">
                    Have a referral code from a fellow merchant? Enter it to link their invite.
                  </span>
                </motion.div>

                {/* Bottom Inline Button on Desktop */}
                <motion.button
                  variants={itemVariants}
                  disabled={!isStep1Valid}
                  onClick={handleNext}
                  className="w-full hidden sm:flex py-4 bg-brand hover:bg-brand-dark disabled:bg-border-light disabled:text-ink-muted text-white font-display font-extrabold rounded-[var(--radius-md)] shadow-brand text-sm items-center justify-center gap-2 cursor-pointer transition-colors duration-200 border border-accent/10 disabled:border-transparent disabled:shadow-none"
                >
                  <span>Next: Shop Details</span>
                </motion.button>
              </motion.div>
            ) : (
              // Step 2: Shop Details
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-border-light shadow-card space-y-6"
              >
                <div className="text-center sm:text-left mb-2">
                  <h2 className="text-2xl font-display font-extrabold text-ink">
                    Shop Details
                  </h2>
                  <p className="text-xs sm:text-sm text-ink-muted mt-1">
                    Set up your public shop profile and pin your location so customers can find you.
                  </p>
                </div>

                {/* Field 1: Shop Name */}
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <label className="text-xs font-display font-bold text-ink-light block">
                    Shop Name <span className="text-brand">*</span>
                  </label>
                  <input
                    type="text"
                    value={wizardData.shopName}
                    onChange={(e) => setWizardData(prev => ({ ...prev, shopName: e.target.value }))}
                    placeholder="e.g. Sharma Auto Repair"
                    className="w-full py-3 px-4 text-sm text-ink border border-border-light rounded-[var(--radius-md)] focus:border-brand focus:ring-2 focus:ring-brand-glow focus:outline-none transition-all placeholder:text-ink-muted bg-white"
                  />
                </motion.div>

                {/* Field 2: Map Location Picker */}
                <motion.div variants={itemVariants} className="space-y-1.5">
                  <label className="text-xs font-display font-bold text-ink-light block">
                    Pin Your Shop Location <span className="text-brand">*</span>
                  </label>
                  <span className="text-[11px] text-ink-muted block mt-0.5">
                    Drag the pin to your exact shop location.
                  </span>

                  {/* Compact Google Maps container */}
                  <div className="relative w-full rounded-2xl overflow-hidden border border-border-light bg-zinc-100 shadow-sm z-10" style={{ height: '190px' }}>
                    <MapContainer
                      center={[wizardData.latitude, wizardData.longitude]}
                      zoom={16}
                      zoomControl={false}
                      style={{ height: '190px', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        maxZoom={20}
                        attribution='&copy; Google Maps'
                      />
                      <DraggableMarker
                        lat={wizardData.latitude}
                        lng={wizardData.longitude}
                        onPositionChange={handleMarkerPositionChange}
                        icon={customPinIcon}
                      />
                      <MapRecenter lat={wizardData.latitude} lng={wizardData.longitude} />
                    </MapContainer>

                    {/* Floating GPS Button */}
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      className="absolute top-2.5 right-2.5 z-[400] p-2 bg-white hover:bg-surface rounded-xl border border-border shadow-md cursor-pointer text-brand hover:text-brand-dark transition-colors flex items-center justify-center"
                      title="Use My Current Location"
                    >
                      <Navigation size={13} fill="currentColor" />
                    </button>
                  </div>

                  {/* Manual Shop Address & Landmark (Optional) */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-display font-bold text-ink-light block">
                        Shop Address / Landmark <span className="text-ink-muted text-[10px] font-normal">(Optional)</span>
                      </label>
                    </div>
                    <div className="relative rounded-[var(--radius-md)] border border-border-light focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-glow bg-white transition-all">
                      <textarea
                        rows={2}
                        value={wizardData.shopAddress}
                        onChange={(e) => setWizardData(prev => ({ ...prev, shopAddress: e.target.value }))}
                        placeholder="e.g. Shop No. 12, Ground Floor, Near Main Chowk, City Mall Road"
                        className="w-full py-2.5 px-3.5 text-xs sm:text-sm text-ink placeholder:text-ink-muted/50 bg-transparent focus:outline-none resize-none"
                      />
                    </div>
                    <span className="text-[10px] text-ink-muted block">
                      Shop no., floor ya koi landmark add karein taaki customers asani se pahuche.
                    </span>
                  </div>
                </motion.div>

                {/* Field 3: Live Shop Front Photo */}
                <motion.div variants={itemVariants} className="space-y-1.5 flex flex-col">
                  <span className="text-xs font-display font-bold text-ink-light block">
                    Shop Front Photo <span className="text-brand">*</span>
                  </span>

                  <div className="w-full relative group">
                    <button
                      onClick={() => openCamera('shop')}
                      className={`w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 flex flex-col items-center justify-center transition-all duration-300 relative cursor-pointer ${wizardData.shopPhoto
                          ? 'border-brand'
                          : 'border-dashed border-border hover:border-brand bg-surface'
                        }`}
                    >
                      {wizardData.shopPhoto ? (
                        <>
                          <img
                            src={wizardData.shopPhoto}
                            alt="Shop front preview"
                            className="w-full h-full object-cover"
                          />
                          {/* Success Badge */}
                          <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-brand border-2 border-white flex items-center justify-center text-white shadow-md">
                            <Check size={16} strokeWidth={3} />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <Camera size={28} className="text-ink-muted group-hover:text-brand transition-colors mb-2" />
                          <span className="text-xs font-display font-bold text-ink-muted group-hover:text-brand transition-colors">
                            Take a live shop photo
                          </span>
                          <span className="text-[10px] text-ink-muted mt-1 leading-normal">
                            Capture the full storefront clearly
                          </span>
                        </div>
                      )}
                    </button>
                  </div>

                  {wizardData.shopPhoto && (
                    <button
                      onClick={() => openCamera('shop')}
                      className="text-xs font-display font-bold text-brand hover:text-brand-dark flex items-center gap-1 mt-1 cursor-pointer self-center"
                    >
                      <RefreshCw size={12} />
                      <span>Retake Shop Photo</span>
                    </button>
                  )}
                </motion.div>

                {/* Field 4: Service Category Select */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <label className="text-xs font-display font-bold text-ink-light block">
                    What type of service do you provide? <span className="text-brand">*</span>
                  </label>

                  {/* Parent Categories list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {CATEGORIES.map((cat) => {
                      const isSelected = wizardData.shopCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`p-4 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all duration-300 relative ${isSelected
                              ? `${cat.selectedBorder} ${cat.selectedBg} ring-1 ring-offset-0 ring-${cat.color}-500 shadow-sm scale-[1.01]`
                              : 'border-border-light hover:border-border bg-white hover:bg-surface/50'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Color Dot badge */}
                            <div className={`w-3.5 h-3.5 rounded-full ${cat.badgeBg} shadow-sm shrink-0`} />
                            <span className="text-xs sm:text-sm font-display font-extrabold text-ink leading-tight">
                              {cat.name}
                            </span>
                          </div>

                          {isSelected && (
                            <div className={`w-5 h-5 rounded-full ${cat.badgeBg} text-white flex items-center justify-center shadow-md`}>
                              <Check size={11} strokeWidth={4} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub-services mapping Chips (Animated display) */}
                  <AnimatePresence>
                    {selectedParentCategory && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        className="p-4 bg-surface rounded-2xl border border-border-light mt-4 space-y-3 overflow-hidden"
                      >
                        <span className="text-[11px] font-display font-bold text-ink-light block">
                          Select the specific sub-services you offer (Multi-select):
                        </span>

                        <div className="flex flex-wrap gap-2.5">
                          {selectedParentCategory.subServicesList.map((sub) => {
                            const isSubSelected = wizardData.subServices.includes(sub);
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => handleSubServiceToggle(sub)}
                                className={`px-4 py-2 rounded-xl text-xs font-display font-bold cursor-pointer transition-all border flex items-center gap-1.5 ${isSubSelected
                                    ? `bg-brand text-white border-transparent shadow-brand`
                                    : 'bg-white text-ink border-border-light hover:bg-surface-card hover:border-border'
                                  }`}
                              >
                                {isSubSelected && <Check size={12} strokeWidth={3} />}
                                <span>{sub}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Field 5: Shop Timing & Working Days */}
                <motion.div variants={itemVariants} className="space-y-3 bg-surface/70 p-4 rounded-2xl border border-border-light">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                        <Clock size={16} />
                      </div>
                      <div>
                        <label className="text-xs font-display font-bold text-ink block">
                          Shop Timing & Working Days <span className="text-brand">*</span>
                        </label>
                        <span className="text-[10px] text-ink-muted block">
                          Dukan khulne aur band hone ka samay
                        </span>
                      </div>
                    </div>

                    {/* 24 Hours Open Toggle */}
                    <button
                      type="button"
                      onClick={() => setWizardData(prev => ({ ...prev, isOpen24Hours: !prev.isOpen24Hours }))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-display font-bold border transition-colors cursor-pointer ${
                        wizardData.isOpen24Hours
                          ? 'bg-brand text-white border-brand shadow-xs'
                          : 'bg-white text-ink-muted border-border-light hover:border-brand/40'
                      }`}
                    >
                      {wizardData.isOpen24Hours ? '✓ 24 Hours Open' : '24 Hours Open?'}
                    </button>
                  </div>

                  {!wizardData.isOpen24Hours && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[11px] font-display font-bold text-ink-light block mb-1">
                          Opening Time (Khulne ka Samay)
                        </span>
                        <input
                          type="time"
                          value={wizardData.openingTime}
                          onChange={(e) => setWizardData(prev => ({ ...prev, openingTime: e.target.value }))}
                          className="w-full py-2.5 px-3 text-xs text-ink font-mono font-medium border border-border-light rounded-xl focus:border-brand focus:ring-1 focus:ring-brand-glow focus:outline-none bg-white shadow-xs"
                        />
                        <span className="text-[10px] text-brand font-semibold block mt-1">
                          Opens at {formatTime12H(wizardData.openingTime)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-display font-bold text-ink-light block mb-1">
                          Closing Time (Band hone ka Samay)
                        </span>
                        <input
                          type="time"
                          value={wizardData.closingTime}
                          onChange={(e) => setWizardData(prev => ({ ...prev, closingTime: e.target.value }))}
                          className="w-full py-2.5 px-3 text-xs text-ink font-mono font-medium border border-border-light rounded-xl focus:border-brand focus:ring-1 focus:ring-brand-glow focus:outline-none bg-white shadow-xs"
                        />
                        <span className="text-[10px] text-brand font-semibold block mt-1">
                          Closes at {formatTime12H(wizardData.closingTime)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Weekly Off Days Selection */}
                  <div className="pt-2 border-t border-border-light/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-display font-bold text-ink-light block">
                        Weekly Off / Closed Day (Chhutti ka din):
                      </span>
                      <button
                        type="button"
                        onClick={() => setWizardData(prev => ({ ...prev, closedDays: [] }))}
                        className={`text-[10px] font-display font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                          wizardData.closedDays.length === 0
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white text-ink-muted border border-border-light hover:text-ink'
                        }`}
                      >
                        {wizardData.closedDays.length === 0 ? '✓ Open All 7 Days' : 'Set Open All 7 Days'}
                      </button>
                    </div>

                    {/* Day chips */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {[
                        { short: 'Sun', full: 'Sunday' },
                        { short: 'Mon', full: 'Monday' },
                        { short: 'Tue', full: 'Tuesday' },
                        { short: 'Wed', full: 'Wednesday' },
                        { short: 'Thu', full: 'Thursday' },
                        { short: 'Fri', full: 'Friday' },
                        { short: 'Sat', full: 'Saturday' },
                      ].map((day) => {
                        const isClosed = wizardData.closedDays.includes(day.full);
                        return (
                          <button
                            key={day.full}
                            type="button"
                            onClick={() => {
                              setWizardData(prev => {
                                const exists = prev.closedDays.includes(day.full);
                                return {
                                  ...prev,
                                  closedDays: exists
                                    ? prev.closedDays.filter(d => d !== day.full)
                                    : [...prev.closedDays, day.full]
                                };
                              });
                            }}
                            className={`py-2 rounded-xl text-xs font-display font-bold cursor-pointer transition-all border text-center flex flex-col items-center justify-center ${
                              isClosed
                                ? 'bg-rose-50 border-rose-400 text-rose-600 shadow-xs ring-1 ring-rose-300'
                                : 'bg-white border-border-light text-ink hover:border-brand/40'
                            }`}
                          >
                            <span>{day.short}</span>
                            <span className={`text-[9px] ${isClosed ? 'text-rose-500 font-extrabold' : 'text-ink-muted'}`}>
                              {isClosed ? 'Off' : 'Open'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Timing Preview */}
                    <div className="mt-2 py-2 px-3 bg-white rounded-xl border border-border-light flex items-center justify-between text-xs">
                      <span className="text-ink-muted text-[11px]">Display on Profile:</span>
                      <span className="font-display font-bold text-ink">
                        {wizardData.isOpen24Hours
                          ? `Open 24 Hours (${wizardData.closedDays.length > 0 ? `Closed: ${wizardData.closedDays.join(', ')}` : 'Open 7 days'})`
                          : `${formatTime12H(wizardData.openingTime)} – ${formatTime12H(wizardData.closingTime)} (${wizardData.closedDays.length > 0 ? `Closed: ${wizardData.closedDays.join(', ')}` : 'Open 7 days'})`}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Field 6: Services list (Optional Section) */}
                <motion.div variants={itemVariants} className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-display font-bold text-ink-light">
                      Add Your Services
                    </label>
                    <span className="text-[10px] bg-border-light text-ink-muted px-2 py-0.5 rounded-md font-body">
                      Optional
                    </span>
                  </div>
                  <span className="text-[11px] text-ink-muted block -mt-1 leading-normal">
                    You can add this later too — but it helps customers know what you offer.
                  </span>

                  {/* Dynamic repeatable list */}
                  <div className="space-y-3">
                    <AnimatePresence>
                      {wizardData.servicesList.map((service, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className="flex gap-2.5 items-center overflow-hidden"
                        >
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={service.name}
                              onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                              placeholder="e.g. Wiring Repair"
                              className="py-2.5 px-3.5 text-xs text-ink border border-border-light rounded-xl focus:border-brand focus:ring-1 focus:ring-brand-glow focus:outline-none placeholder:text-ink-muted bg-white"
                            />
                            <input
                              type="text"
                              value={service.price}
                              onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                              placeholder="Price (optional)"
                              className="py-2.5 px-3.5 text-xs text-ink border border-border-light rounded-xl focus:border-brand focus:ring-1 focus:ring-brand-glow focus:outline-none placeholder:text-ink-muted bg-white"
                            />
                          </div>

                          {wizardData.servicesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveServiceRow(index)}
                              className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-red-100 shrink-0"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddServiceRow}
                    className="text-xs font-display font-bold text-brand hover:text-brand-dark flex items-center gap-1 mt-1.5 cursor-pointer bg-transparent border-0"
                  >
                    <Plus size={14} />
                    <span>Add Another Service</span>
                  </button>
                </motion.div>

                {/* Submit Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 py-4 border border-border text-ink hover:text-brand font-display font-bold text-sm rounded-[var(--radius-md)] cursor-pointer hover:bg-surface transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!isStep2Valid || submitting}
                    onClick={handleSubmit}
                    className="flex-1 py-4 bg-brand hover:bg-brand-dark disabled:bg-border-light disabled:text-ink-muted text-white font-display font-extrabold rounded-[var(--radius-md)] shadow-brand text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors border border-accent/10 disabled:border-transparent disabled:shadow-none"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Verification</span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Mobile Sticky CTA bar for Step 2 */}
      {activeStep === 2 && !loadingProfile && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-border-light p-4 z-30 flex gap-3 sm:hidden shadow-elevated">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-3.5 border border-border text-ink font-display font-bold text-xs rounded-[var(--radius-md)] cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!isStep2Valid || submitting}
            onClick={handleSubmit}
            className="flex-1 py-3.5 bg-brand hover:bg-brand-dark disabled:bg-border-light disabled:text-ink-muted text-white font-display font-extrabold rounded-[var(--radius-md)] shadow-brand text-xs flex items-center justify-center gap-2 cursor-pointer border border-accent/10 disabled:border-transparent disabled:shadow-none"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Verification</span>
            )}
          </button>
        </div>
      )}

      {/* Camera Capture Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-between p-6"
          >
            {/* Camera Header */}
            <div className="w-full max-w-md flex justify-between items-center text-white mt-2">
              <div>
                <h3 className="text-sm font-display font-bold uppercase tracking-wider text-brand-light">
                  {cameraMode === 'owner' ? 'Owner Identity Verification' : 'Shop Verification'}
                </h3>
                <p className="text-[11px] text-zinc-400 font-body">
                  {cameraMode === 'owner' ? 'Center your face in the oval guide' : 'Center the shop front in the guide'}
                </p>
              </div>
              <button
                onClick={closeCamera}
                className="p-2 bg-zinc-800/80 rounded-full text-zinc-300 hover:text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Camera Viewport */}
            <div className="relative w-full max-w-md aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle className="text-red-500 mx-auto" size={32} />
                  <p className="text-sm text-zinc-300">{cameraError}</p>
                  <button
                    onClick={() => openCamera(cameraMode)}
                    className="px-4 py-2 bg-zinc-800 text-white font-display font-bold text-xs rounded-xl hover:bg-zinc-700 cursor-pointer"
                  >
                    Retry Camera
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraMode === 'owner' ? 'scale-x-[-1]' : ''}`}
                  />
                  {/* Vignette Cutouts */}
                  {cameraMode === 'owner' ? (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-[190px] h-[270px] rounded-[100px] border-2 border-dashed border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-[285px] h-[210px] rounded-2xl border-2 border-dashed border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
                      <span className="absolute bottom-6 text-white text-[10px] bg-black/60 px-3.5 py-1 rounded-full font-body font-bold uppercase tracking-wider">
                        Frame the shop front
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Camera Controls */}
            <div className="w-full max-w-md flex flex-col items-center gap-4 mb-4">
              {!cameraError && cameraStream && (
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full border-4 border-accent flex items-center justify-center bg-transparent cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 bg-brand hover:bg-brand-dark rounded-full transition-colors" />
                </button>
              )}
              <span className="text-[10px] text-zinc-500 font-body">
                {cameraMode === 'owner'
                  ? 'Captured selfies are only used for owner verification.'
                  : 'Captured shop front photo will be shown on your profile.'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Alert */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-xs px-4 py-3 rounded-full flex items-center gap-2 shadow-elevated border border-zinc-800 font-display font-bold"
          >
            <CheckCircle2 size={14} className="text-brand-light" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
