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
  RefreshCw 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface WizardData {
  ownerPhoto: string | null;
  fullName: string;
  mobileNumber: string;
  homeAddress: string;
  // Step 2 placeholder data
  shopName?: string;
  shopCategory?: string;
}

export default function VendorRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Wizard state
  const [activeStep, setActiveStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Form states
  const [wizardData, setWizardData] = useState<WizardData>({
    ownerPhoto: null,
    fullName: '',
    mobileNumber: '',
    homeAddress: '',
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

  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // OTP inputs ref for auto-focus
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch prefilled data from vendors table
  useEffect(() => {
    async function fetchVendorData() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('owner_name, phone_number')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setWizardData(prev => ({
            ...prev,
            fullName: data.owner_name || '',
            mobileNumber: data.phone_number || '',
          }));
        }
      } catch (err) {
        console.error('Error fetching initial profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchVendorData();
  }, [user]);

  // Handle OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // Camera handling
  const openCamera = async () => {
    setCameraError('');
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
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
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setWizardData(prev => ({ ...prev, ownerPhoto: dataUrl }));
        closeCamera();
        triggerSuccessToast('Selfie captured successfully');
      }
    }
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

    // Auto focus next field
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

    // Simulate OTP Verification
    setTimeout(() => {
      // Test cases:
      // Phone is +919783204194 and OTP is 123456
      // For any other number in dev mode, we accept 123456 as the validation standard
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

  // Validation step 1
  const isStep1Valid = 
    wizardData.ownerPhoto !== null && 
    wizardData.fullName.trim() !== '' && 
    wizardData.mobileNumber.length === 10 && 
    !isChangingMobile &&
    wizardData.homeAddress.trim().length >= 10;

  const handleNext = () => {
    if (!isStep1Valid) return;
    setDirection(1);
    setActiveStep(2);
  };

  const handleBack = () => {
    setDirection(-1);
    setActiveStep(1);
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

  return (
    <div className="vendor-mode min-h-screen bg-surface flex flex-col font-body pb-20 sm:pb-8">
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
            <div className="flex gap-1.5">
              <div className={`w-6 h-2 rounded-full transition-all duration-300 ${activeStep === 1 ? 'bg-brand shadow-brand' : 'bg-brand'}`} />
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
                      onClick={openCamera}
                      className={`w-36 h-36 rounded-full overflow-hidden border-2 flex flex-col items-center justify-center transition-all duration-300 relative cursor-pointer ${
                        wizardData.ownerPhoto 
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
                      onClick={openCamera}
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
                  <span className="text-[10px] text-ink-muted block mt-1">
                    Contact support to request name updates.
                  </span>
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

                        {/* Verify Button (Shown once 10 digits entered) */}
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

                        {/* OTP Boxes (Shown after clicking verify) */}
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
              // Step 2 Placeholder screen (Shop Details)
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-border-light shadow-card space-y-6 text-center"
              >
                <div className="mb-2">
                  <h2 className="text-2xl font-display font-extrabold text-ink">
                    Step 2: Shop Details
                  </h2>
                  <p className="text-xs sm:text-sm text-ink-muted mt-1">
                    Placeholder layout showing collected Step 1 data for state verification.
                  </p>
                </div>

                <div className="bg-surface rounded-2xl p-5 border border-border-light/60 space-y-4 text-left">
                  <div className="flex items-center gap-3 pb-3 border-b border-border-light">
                    {wizardData.ownerPhoto ? (
                      <img 
                        src={wizardData.ownerPhoto} 
                        alt="Captured Owner selfie" 
                        className="w-12 h-12 rounded-full object-cover border border-brand"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center">
                        <Camera size={16} />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-display font-extrabold text-ink">
                        {wizardData.fullName}
                      </h4>
                      <p className="text-xs text-ink-muted">+91 {wizardData.mobileNumber}</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-display font-bold text-ink-light">Home Address:</h5>
                    <p className="text-xs text-ink mt-1 font-body leading-relaxed bg-white p-3 rounded-lg border border-border-light">
                      {wizardData.homeAddress}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-3.5 border border-border text-ink hover:text-brand font-display font-bold text-sm rounded-[var(--radius-md)] cursor-pointer hover:bg-surface transition-colors"
                  >
                    Back to Step 1
                  </button>
                  <button
                    onClick={() => {
                      alert('Registration wizard completed! Step 1 data is held in state: ' + JSON.stringify(wizardData));
                      navigate('/dashboard');
                    }}
                    className="flex-1 py-3.5 bg-brand hover:bg-brand-dark text-white font-display font-extrabold rounded-[var(--radius-md)] shadow-brand text-sm cursor-pointer transition-colors"
                  >
                    Finish (Submit)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Mobile Sticky Next Button */}
      {activeStep === 1 && !loadingProfile && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-border-light p-4 z-30 block sm:hidden shadow-elevated">
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={!isStep1Valid}
            onClick={handleNext}
            className="w-full py-4 bg-brand hover:bg-brand-dark disabled:bg-border-light disabled:text-ink-muted text-white font-display font-extrabold rounded-[var(--radius-md)] shadow-brand text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 border border-accent/10 disabled:border-transparent disabled:shadow-none"
          >
            <span>Next: Shop Details</span>
          </motion.button>
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
                  Owner Identity Verification
                </h3>
                <p className="text-[11px] text-zinc-400 font-body">Center your face in the oval guide</p>
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
                    onClick={openCamera}
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
                    className="w-full h-full object-cover scale-x-[-1]" // Mirror front camera preview
                  />
                  {/* Face Guide Oval Cutout Vignette */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[190px] h-[270px] rounded-[100px] border-2 border-dashed border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
                  </div>
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
                Captured selfies are only used for owner verification.
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
