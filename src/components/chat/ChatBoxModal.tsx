import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Camera,
  MapPin,
  Mic,
  Square,
  Play,
  Pause,
  MoreVertical,
  Flag,
  ShieldOff,
  ShieldCheck,
  AlertCircle,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Navigation,
  Loader2,
  Trash2,
  Paperclip,
  Plus,
  ArrowLeft,
  Phone,
} from 'lucide-react';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import type {
  ChatMessage,
  ChatConversation,
} from '../../utils/chatStorage';
import {
  getConversationMessages,
  sendMessageToConversation,
  markConversationAsRead,
  toggleBlockConversation,
  reportConversation,
} from '../../utils/chatStorage';
import { getCurrentLocation } from '../../utils/nativeGeolocation';
import { useBackButton } from '../../hooks/useBackButton';
import { Keyboard } from '@capacitor/keyboard';

interface ChatBoxModalProps {
  conversation: ChatConversation | null;
  currentUserRole: 'customer' | 'vendor';
  currentUserId?: string;
  isOpen: boolean;
  onClose: () => void;
  onConversationUpdated?: () => void;
}

export default function ChatBoxModal({
  conversation,
  currentUserRole,
  currentUserId = 'cust-current',
  isOpen,
  onClose,
  onConversationUpdated,
}: ChatBoxModalProps) {
  const navigate = useNavigate();
  useBackButton(onClose, isOpen);

  const handleOpenVendorProfile = () => {
    if (currentUserRole === 'customer' && conversation?.vendorId) {
      onClose();
      navigate(`/vendor/${conversation.vendorId}`);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or Fraud');
  const [reportSubmittedToast, setReportSubmittedToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [micPermissionModalOpen, setMicPermissionModalOpen] = useState(false);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Currently playing message audio ID
  const [playingMsgAudioId, setPlayingMsgAudioId] = useState<string | null>(null);

  // Photo Upload State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active Photo Lightbox Modal
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Location share loading state
  const [sharingLocation, setSharingLocation] = useState(false);

  // Native Soft Keyboard Offset state
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Track Native Keyboard & Visual Viewport resize
  useEffect(() => {
    let showSub: any;
    let hideSub: any;

    try {
      showSub = Keyboard.addListener('keyboardWillShow', (info) => {
        setKeyboardOffset(info.keyboardHeight || 0);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
      hideSub = Keyboard.addListener('keyboardWillHide', () => {
        setKeyboardOffset(0);
      });
    } catch (err) {
      console.warn('Keyboard listener error:', err);
    }

    const handleViewportResize = () => {
      if (window.visualViewport) {
        const diff = window.innerHeight - window.visualViewport.height;
        if (diff > 120) {
          setKeyboardOffset(diff);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        } else {
          setKeyboardOffset(0);
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      if (showSub) showSub.then((s: any) => s.remove());
      if (hideSub) hideSub.then((h: any) => h.remove());
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  // Reload messages when conversation changes or opens
  useEffect(() => {
    if (conversation && isOpen) {
      const msgs = getConversationMessages(conversation.id);
      setMessages(msgs);
      markConversationAsRead(conversation.id, currentUserRole);
      if (onConversationUpdated) onConversationUpdated();
    }
  }, [conversation?.id, isOpen, currentUserRole]);

  // Dispatch event to hide bottom navbar when chat modal is open
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('chatModalStateChange', { detail: { isOpen: true } }));
    } else {
      window.dispatchEvent(new CustomEvent('chatModalStateChange', { detail: { isOpen: false } }));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('chatModalStateChange', { detail: { isOpen: false } }));
    };
  }, [isOpen]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen || !conversation) return null;

  const isBlockedByMe =
    currentUserRole === 'customer'
      ? conversation.isBlockedByCustomer
      : conversation.isBlockedByVendor;

  const isBlockedByOther =
    currentUserRole === 'customer'
      ? conversation.isBlockedByVendor
      : conversation.isBlockedByCustomer;

  const otherName =
    currentUserRole === 'customer' ? conversation.vendorName : conversation.customerName;

  const otherAvatar =
    currentUserRole === 'customer'
      ? conversation.vendorShopPhoto
      : undefined;

  const otherPhone =
    currentUserRole === 'customer'
      ? conversation.vendorPhone
      : undefined;

  // Send Message logic
  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() && !photoPreview && !audioPreviewUrl) return;
    setActionError(null);
    setAttachMenuOpen(false);

    try {
      const newMsg = sendMessageToConversation({
        conversationId: conversation.id,
        senderId: currentUserId,
        senderRole: currentUserRole,
        text: textInput.trim() || undefined,
        photoUrl: photoPreview || undefined,
        audioUrl: audioPreviewUrl || undefined,
        audioDurationSec: audioPreviewUrl ? recordingSeconds : undefined,
      });

      setMessages((prev) => [...prev, newMsg]);
      setTextInput('');
      setPhotoPreview(null);
      discardAudioRecording();

      if (onConversationUpdated) onConversationUpdated();
    } catch (err: any) {
      setActionError(err.message || 'Failed to send message.');
    }
  };

  // Handle Photo Select
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setAttachMenuOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Location Sharing
  const handleShareLocation = async () => {
    setSharingLocation(true);
    setActionError(null);
    setAttachMenuOpen(false);
    try {
      const loc = await getCurrentLocation();
      const newMsg = sendMessageToConversation({
        conversationId: conversation.id,
        senderId: currentUserId,
        senderRole: currentUserRole,
        location: {
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: 'Current Live GPS Location Shared',
        },
      });

      setMessages((prev) => [...prev, newMsg]);
      if (onConversationUpdated) onConversationUpdated();
    } catch (err: any) {
      console.warn('Geolocation failed, fallback to preset location:', err);
      const newMsg = sendMessageToConversation({
        conversationId: conversation.id,
        senderId: currentUserId,
        senderRole: currentUserRole,
        location: {
          latitude: 27.6094,
          longitude: 75.1398,
          address: 'Main Market, Sikar, Rajasthan',
        },
      });
      setMessages((prev) => [...prev, newMsg]);
      if (onConversationUpdated) onConversationUpdated();
    } finally {
      setSharingLocation(false);
    }
  };

  // Start Voice Recording (Capacitor VoiceRecorder Native + Browser fallback)
  const startAudioRecording = async () => {
    setActionError(null);
    setAttachMenuOpen(false);

    try {
      // 1. Try Capacitor Native VoiceRecorder plugin
      const canRecord = await VoiceRecorder.canDeviceVoiceRecord();
      if (canRecord.value) {
        const hasPerm = await VoiceRecorder.hasAudioRecordingPermission();
        if (!hasPerm.value) {
          const requested = await VoiceRecorder.requestAudioRecordingPermission();
          if (!requested.value) {
            setMicPermissionModalOpen(true);
            setActionError('Microphone permission required in phone settings.');
            return;
          }
        }

        await VoiceRecorder.startRecording();
        setIsRecording(true);
        setRecordingSeconds(0);
        timerRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
        return;
      }
    } catch (e) {
      console.log('VoiceRecorder plugin fallback to Web API:', e);
    }

    // 2. Web API fallback
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone media API unavailable');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/mp4' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioPreviewUrl(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access notice:', err);
      setMicPermissionModalOpen(true);
      setActionError('Microphone permission required. Tap "Allow Mic" to grant.');
    }
  };

  // Handle direct user gesture mic permission request
  const handleRequestMicDirect = async () => {
    setMicPermissionModalOpen(false);
    startAudioRecording();
  };

  // Stop Voice Recording
  const stopAudioRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      // 1. Try stopping VoiceRecorder plugin
      const result = await VoiceRecorder.stopRecording();
      if (result.value && result.value.recordDataBase64) {
        const mime = result.value.mimeType || 'audio/aac';
        const dataUrl = `data:${mime};base64,${result.value.recordDataBase64}`;
        setAudioPreviewUrl(dataUrl);
        setIsRecording(false);
        return;
      }
    } catch (e) {
      console.log('VoiceRecorder plugin stop fallback:', e);
    }

    // 2. Web MediaRecorder stop fallback
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping mediaRecorder:', err);
      }
    }

    setIsRecording(false);
  };

  // Discard Audio Recording
  const discardAudioRecording = async () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingSeconds(0);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setIsPreviewPlaying(false);

    try {
      await VoiceRecorder.stopRecording();
    } catch (e) {
      // ignore
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping mediaRecorder on discard:', err);
      }
    }
  };

  // Toggle Audio Preview Playback
  const togglePreviewPlay = () => {
    if (!audioPlayerRef.current || !audioPreviewUrl) return;
    if (isPreviewPlaying) {
      audioPlayerRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  // Toggle Playback for any message audio
  const toggleMsgAudioPlay = (msgId: string, audioUrl: string) => {
    if (playingMsgAudioId === msgId) {
      setPlayingMsgAudioId(null);
    } else {
      setPlayingMsgAudioId(msgId);
    }
  };

  // Handle Block Toggle
  const handleToggleBlock = () => {
    const updated = toggleBlockConversation(conversation.id, currentUserRole);
    if (updated) {
      setMenuOpen(false);
      if (onConversationUpdated) onConversationUpdated();
    }
  };

  // Handle Report Submit
  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = reportConversation(conversation.id, currentUserRole, reportReason);
    if (updated) {
      setReportModalOpen(false);
      setMenuOpen(false);
      setReportSubmittedToast(`User reported for "${reportReason}". Our team will review this chat.`);
      setTimeout(() => setReportSubmittedToast(null), 4000);
      if (onConversationUpdated) onConversationUpdated();
    }
  };

  const formatSecToMin = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatMsgTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-xs font-body select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          className="bg-[#EFEAE2] w-full max-w-lg h-full sm:h-[90vh] sm:rounded-3xl border border-gray-300 shadow-2xl flex flex-col overflow-hidden relative"
        >
          {/* Always-Mounted Hidden File Input for Camera/Gallery */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            disabled={isBlockedByMe || isBlockedByOther}
            className="hidden"
          />

          {/* ═══════════ AUTHENTIC WHATSAPP TOP HEADER BAR ═══════════ */}
          <div className="p-2.5 px-3 bg-[#075E54] text-white flex items-center justify-between shadow-md shrink-0 z-20">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
                title="Back"
              >
                <ArrowLeft size={20} />
              </button>

              {/* Clickable Vendor Profile Pill */}
              <div
                onClick={handleOpenVendorProfile}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer group hover:opacity-90 transition-opacity"
                title={currentUserRole === 'customer' ? 'Tap to view shop profile & details' : undefined}
              >
                {/* Avatar Pill */}
                <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-display font-extrabold text-sm shrink-0 overflow-hidden border border-white/20 group-hover:scale-105 transition-transform shadow-xs">
                  {otherAvatar ? (
                    <img src={otherAvatar} alt={otherName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{otherName[0]}</span>
                  )}
                </div>

                {/* Name & Online Status */}
                <div className="overflow-hidden min-w-0">
                  <h3 className="text-sm font-display font-extrabold text-white truncate leading-tight group-hover:underline">
                    {otherName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-teal-100 font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#25D366] shrink-0 animate-pulse" />
                    <span>{currentUserRole === 'customer' ? 'Online • Tap for shop info' : 'Online'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1">
              {otherPhone && (
                <a
                  href={`tel:${otherPhone}`}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
                  title="Call Vendor"
                >
                  <Phone size={18} />
                </a>
              )}

              {/* Dropdown Menu Toggle */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
                >
                  <MoreVertical size={19} />
                </button>

                {/* Dropdown menu */}
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      className="absolute right-0 top-11 z-50 w-48 bg-white text-ink rounded-2xl p-1.5 shadow-2xl border border-gray-200 text-xs font-display font-bold"
                    >
                      <button
                        onClick={handleToggleBlock}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                          isBlockedByMe
                            ? 'text-emerald-700 hover:bg-emerald-50'
                            : 'text-error hover:bg-error-light'
                        }`}
                      >
                        {isBlockedByMe ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
                        <span>{isBlockedByMe ? 'Unblock User' : 'Block User'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setReportModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                      >
                        <Flag size={16} />
                        <span>Report User</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Toast Notification */}
          <AnimatePresence>
            {reportSubmittedToast && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 z-20"
              >
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>{reportSubmittedToast}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Banner */}
          {actionError && (
            <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center justify-between shrink-0 z-20">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
              <button onClick={() => setActionError(null)} className="p-1 text-rose-500 hover:text-rose-800">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Block Banner */}
          {(isBlockedByMe || isBlockedByOther) && (
            <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 z-20">
              <ShieldOff size={16} className="text-amber-600 shrink-0" />
              <span>
                {isBlockedByMe
                  ? 'You have blocked this user.'
                  : 'You are blocked by this user. Messaging is disabled.'}
              </span>
            </div>
          )}

          {/* ═══════════ MESSAGES AREA (Authentic WhatsApp Doodle Background) ═══════════ */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 relative bg-[#EFEAE2]">
            {/* WhatsApp Tile Background Pattern overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-30 bg-repeat z-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%3C%239C92AC%3E' fill-opacity='0.12' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Date Pill Badge */}
            <div className="flex justify-center relative z-10 my-1">
              <span className="px-3 py-1 bg-white/90 shadow-[0_1px_2px_rgba(0,0,0,0.08)] rounded-lg text-[10px] font-display font-extrabold text-gray-500 uppercase tracking-wider">
                TODAY
              </span>
            </div>

            {messages.map((msg) => {
              const isMe = msg.senderRole === currentUserRole;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col relative z-10 ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[16px] p-2.5 px-3 shadow-[0_1px_2px_rgba(0,0,0,0.12)] space-y-1.5 text-[13px] leading-relaxed relative ${
                      isMe
                        ? 'bg-[#E7F8F4] text-[#111B21] rounded-tr-[3px]'
                        : 'bg-white text-[#111B21] rounded-tl-[3px]'
                    }`}
                  >
                    {/* Text Message */}
                    {msg.text && <p className="whitespace-pre-wrap font-body font-medium">{msg.text}</p>}

                    {/* Photo Attachment */}
                    {msg.photoUrl && (
                      <div
                        onClick={() => setActiveLightboxImg(msg.photoUrl!)}
                        className="rounded-xl overflow-hidden cursor-pointer border border-black/5 max-h-64 relative group shadow-xs"
                      >
                        <img
                          src={msg.photoUrl}
                          alt="Chat attachment"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ImageIcon size={22} />
                        </div>
                      </div>
                    )}

                    {/* Location Share Card */}
                    {msg.location && (
                      <div
                        className={`p-2.5 rounded-xl border flex flex-col gap-2 ${
                          isMe
                            ? 'bg-teal-900/10 border-teal-800/15 text-teal-950'
                            : 'bg-surface border-border-light text-ink'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-display font-extrabold text-xs">
                          <div className="p-1.5 rounded-lg bg-teal-600 text-white shadow-xs">
                            <MapPin size={16} />
                          </div>
                          <div>
                            <p className="leading-tight">Shared GPS Location</p>
                            <p className="text-[10px] font-normal text-gray-600">{msg.location.address || 'Live Pin Location'}</p>
                          </div>
                        </div>

                        <a
                          href={`https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-display font-extrabold cursor-pointer transition-colors bg-[#075E54] text-white hover:bg-teal-800 shadow-xs"
                        >
                          <Navigation size={13} />
                          <span>Open in Google Maps</span>
                        </a>
                      </div>
                    )}

                    {/* WhatsApp Authentic Voice Note Player */}
                    {msg.audioUrl && (
                      <div className="flex items-center gap-2.5 p-1.5 px-2 min-w-[210px]">
                        {/* Left User Avatar with Mic Badge */}
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-teal-800/15 text-[#075E54] flex items-center justify-center font-display font-extrabold text-xs overflow-hidden border border-teal-600/20">
                            {isMe ? 'You' : otherName[0]}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#075E54] text-white flex items-center justify-center border border-white text-[8px]">
                            <Mic size={8} />
                          </div>
                        </div>

                        {/* Green Play/Pause Button */}
                        <button
                          type="button"
                          onClick={() => toggleMsgAudioPlay(msg.id, msg.audioUrl!)}
                          className="w-9 h-9 rounded-full bg-[#075E54] hover:bg-teal-800 text-white flex items-center justify-center shadow-xs cursor-pointer shrink-0 transition-transform active:scale-95"
                        >
                          {playingMsgAudioId === msg.id ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} className="ml-0.5 fill-white" />
                          )}
                        </button>

                        {/* Equalizer Sound Waves & Duration */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-1 h-3.5 pt-0.5">
                            {[40, 70, 30, 90, 50, 80, 40, 100, 60, 30, 80, 50, 90, 40].map((h, idx) => (
                              <span
                                key={idx}
                                style={{ height: `${h}%` }}
                                className={`w-0.5 rounded-full transition-all duration-300 ${
                                  playingMsgAudioId === msg.id
                                    ? 'bg-[#075E54] animate-pulse'
                                    : 'bg-gray-400/70'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono font-medium text-gray-500">
                            <span>{msg.audioDurationSec ? formatSecToMin(msg.audioDurationSec) : '0:05'}</span>
                          </div>
                        </div>

                        {/* Audio element player */}
                        {playingMsgAudioId === msg.id && (
                          <audio
                            src={msg.audioUrl}
                            autoPlay
                            onEnded={() => setPlayingMsgAudioId(null)}
                            onError={() => setPlayingMsgAudioId(null)}
                            className="hidden"
                          />
                        )}
                      </div>
                    )}

                    {/* Timestamp & WhatsApp Blue Double Ticks */}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 font-medium pt-0.5">
                      <span>{formatMsgTime(msg.created_at)}</span>
                      {isMe && (
                        <span>
                          {msg.read ? (
                            <CheckCheck size={14} className="text-[#53BDEB]" />
                          ) : (
                            <Check size={14} className="text-gray-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Photo attachment preview bar */}
          <AnimatePresence>
            {photoPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-2 bg-white border-t border-gray-200 flex items-center justify-between shrink-0 relative z-20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-200 shadow-xs">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-xs font-display font-extrabold text-ink block">Photo Attached</span>
                    <span className="text-[10px] text-gray-500">Ready to send</span>
                  </div>
                </div>
                <button
                  onClick={() => setPhotoPreview(null)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Voice Note Audio Preview bar (Before Sending) */}
          <AnimatePresence>
            {audioPreviewUrl && !isRecording && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-2.5 bg-amber-50 border-t border-amber-200 flex items-center justify-between shrink-0 relative z-20"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePreviewPlay}
                    className="w-8 h-8 rounded-full bg-[#075E54] text-white flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    {isPreviewPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                  </button>
                  <div>
                    <p className="text-xs font-display font-bold text-ink">Voice note recorded ({formatSecToMin(recordingSeconds)})</p>
                    <p className="text-[10px] text-gray-500">Tap send button to share</p>
                  </div>
                  <audio
                    ref={audioPlayerRef}
                    src={audioPreviewUrl}
                    onEnded={() => setIsPreviewPlaying(false)}
                    className="hidden"
                  />
                </div>
                <button
                  onClick={discardAudioRecording}
                  className="p-1 text-gray-400 hover:text-rose-600 rounded-full hover:bg-rose-50"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════ WHATSAPP-STYLE ATTACHMENT MENU POPUP SHEET ═══════════ */}
          <AnimatePresence>
            {attachMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className="absolute bottom-16 left-3 z-40 bg-white rounded-3xl p-3 shadow-2xl border border-gray-200 flex gap-4 font-body"
              >
                {/* 1. Photo Attachment */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-1.5 p-2 px-3 rounded-2xl hover:bg-surface cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                    <Camera size={22} />
                  </div>
                  <span className="text-[10px] font-display font-extrabold text-ink">Gallery</span>
                </button>

                {/* 2. Share GPS Location */}
                <button
                  type="button"
                  onClick={handleShareLocation}
                  disabled={sharingLocation || isBlockedByMe || isBlockedByOther}
                  className="flex flex-col items-center gap-1.5 p-2 px-3 rounded-2xl hover:bg-surface cursor-pointer group disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                    {sharingLocation ? <Loader2 size={22} className="animate-spin" /> : <MapPin size={22} />}
                  </div>
                  <span className="text-[10px] font-display font-extrabold text-ink">Location</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════ AUTHENTIC WHATSAPP FLOATING INPUT TOOLBAR ═══════════ */}
          <div
            style={{ paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : undefined }}
            className="p-2 px-2.5 bg-[#EFEAE2] shrink-0 transition-[padding] duration-150 z-30"
          >
            {isRecording ? (
              /* WhatsApp Voice Recording Bar */
              <div className="flex items-center justify-between gap-2 p-1.5 px-3 bg-white rounded-full shadow-lg border border-gray-200">
                {/* Left: Discard Trash Button */}
                <button
                  type="button"
                  onClick={discardAudioRecording}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors cursor-pointer shrink-0"
                  title="Cancel Recording"
                >
                  <Trash2 size={19} />
                </button>

                {/* Center: Live Timer & Animated Audio Waveform */}
                <div className="flex-1 flex items-center justify-center gap-3 px-2">
                  <div className="flex items-center gap-1.5 text-rose-600 font-mono font-bold text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>{formatSecToMin(recordingSeconds)}</span>
                  </div>

                  {/* WhatsApp sound wave animation bars */}
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-5 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.4s]" />
                    <span className="w-1 h-6 bg-rose-600 rounded-full animate-bounce" />
                    <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1 h-5 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.35s]" />
                  </div>
                </div>

                {/* Right: Done / Check Floating Button */}
                <button
                  type="button"
                  onClick={stopAudioRecording}
                  className="w-10 h-10 rounded-full bg-[#075E54] hover:bg-teal-800 text-white flex items-center justify-center shadow-md cursor-pointer shrink-0"
                  title="Finish Recording"
                >
                  <Check size={20} className="stroke-[3]" />
                </button>
              </div>
            ) : (
              /* WhatsApp Floating Input Bar & Mic/Send FAB */
              <form onSubmit={handleSendText} className="flex items-center gap-2">
                {/* Floating White Input Pill */}
                <div className="flex-1 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.12)] flex items-center px-2 py-1 border border-gray-200/60">
                  {/* (+) Attachment Toggle */}
                  <button
                    type="button"
                    onClick={() => setAttachMenuOpen((prev) => !prev)}
                    disabled={isBlockedByMe || isBlockedByOther}
                    className={`p-2 text-gray-500 hover:text-[#075E54] rounded-full transition-all cursor-pointer shrink-0 ${
                      attachMenuOpen ? 'rotate-45 text-[#075E54]' : ''
                    }`}
                    title="Attach gallery photo or location"
                  >
                    <Paperclip size={19} />
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    disabled={isBlockedByMe || isBlockedByOther}
                    placeholder={
                      isBlockedByMe || isBlockedByOther
                        ? 'Messaging disabled'
                        : 'Message'
                    }
                    className="flex-1 px-2 py-1.5 bg-transparent text-xs font-body text-[#111B21] outline-none placeholder:text-gray-400 disabled:opacity-50 min-w-0"
                  />

                  {/* Camera Quick Button inside Input Pill */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBlockedByMe || isBlockedByOther}
                    className="p-1.5 text-gray-500 hover:text-[#075E54] rounded-full cursor-pointer shrink-0 disabled:opacity-40"
                    title="Camera"
                  >
                    <Camera size={19} />
                  </button>
                </div>

                {/* WhatsApp Floating Circle FAB (Mic / Send) */}
                {textInput.trim() || photoPreview || audioPreviewUrl ? (
                  /* Send Button */
                  <button
                    type="submit"
                    disabled={isBlockedByMe || isBlockedByOther}
                    className="w-11 h-11 rounded-full bg-[#075E54] hover:bg-teal-800 text-white flex items-center justify-center shadow-lg shadow-teal-900/20 cursor-pointer disabled:opacity-40 transition-all shrink-0"
                    title="Send"
                  >
                    <Send size={17} className="ml-0.5" />
                  </button>
                ) : (
                  /* Voice Note Mic Button */
                  <button
                    type="button"
                    onClick={startAudioRecording}
                    disabled={isBlockedByMe || isBlockedByOther}
                    className="w-11 h-11 rounded-full bg-[#075E54] hover:bg-teal-800 text-white flex items-center justify-center shadow-lg shadow-teal-900/20 cursor-pointer disabled:opacity-40 transition-all shrink-0"
                    title="Record voice note"
                  >
                    <Mic size={19} />
                  </button>
                )}
              </form>
            )}
          </div>

          {/* ────────────────── REPORT USER MODAL ────────────────── */}
          <AnimatePresence>
            {reportModalOpen && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <motion.form
                  onSubmit={handleReportSubmit}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-3xl max-w-sm w-full p-6 border border-border-light shadow-2xl space-y-4 font-body"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 font-display font-extrabold text-sm">
                      <Flag size={18} />
                      <span>Report {otherName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReportModalOpen(false)}
                      className="text-gray-400 hover:text-ink p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    Select a reason for reporting this chat user:
                  </p>

                  <div className="space-y-2">
                    {[
                      'Spam or Fraud',
                      'Abusive or Harassing Messages',
                      'Fake Business Profile',
                      'Inappropriate Content',
                    ].map((reason) => (
                      <label
                        key={reason}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-display font-bold cursor-pointer transition-colors ${
                          reportReason === reason
                            ? 'border-[#075E54] bg-teal-50 text-ink'
                            : 'border-gray-200 text-gray-600 hover:bg-surface'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          checked={reportReason === reason}
                          onChange={() => setReportReason(reason)}
                          className="accent-[#075E54]"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setReportModalOpen(false)}
                      className="flex-1 py-2.5 bg-surface text-ink font-display font-extrabold text-xs rounded-xl border border-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-display font-extrabold text-xs rounded-xl shadow-sm"
                    >
                      Submit Report
                    </button>
                  </div>
                </motion.form>
              </div>
            )}
          </AnimatePresence>

          {/* ────────────────── PHOTO LIGHTBOX ────────────────── */}
          <AnimatePresence>
            {activeLightboxImg && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                <div className="relative max-w-lg w-full max-h-[90vh]">
                  <button
                    onClick={() => setActiveLightboxImg(null)}
                    className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 cursor-pointer"
                  >
                    <X size={24} />
                  </button>
                  <img
                    src={activeLightboxImg}
                    alt="Expanded"
                    className="w-full h-full object-contain rounded-2xl"
                  />
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* ────────────────── COMPACT MICROPHONE PERMISSION GUIDE MODAL ────────────────── */}
          <AnimatePresence>
            {micPermissionModalOpen && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-body">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-2xl max-w-xs w-full p-4 border border-gray-200 shadow-2xl space-y-3 text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shrink-0">
                    <Mic size={20} />
                  </div>

                  <div>
                    <h3 className="text-sm font-display font-extrabold text-ink">
                      Microphone Access
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                      Tap allow below to enable voice recording
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setMicPermissionModalOpen(false)}
                      className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-display font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestMicDirect}
                      className="flex-1 py-2 bg-[#075E54] hover:bg-teal-800 text-white font-display font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                    >
                      Allow Mic
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
