import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  Send,
  X,
  MapPin,
  Star,
  BadgeCheck,
  Phone,
  Settings,
  Trash2,
  Mic,
  MicOff,
  ChevronDown,
  KeyRound,
  Check,
} from 'lucide-react';
import {
  sendQueryToGemini,
  getGeminiApiKey,
  setGeminiApiKey,
  type ChatMessage,
} from '../../services/geminiService';
import { formatDistance } from '../../utils/haversine';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { trackVendorCall, trackVendorWhatsApp } from '../../utils/vendorSync';
import { type Vendor } from '../../data/dummyVendors';
import SaveHeartButton from '../ui/SaveHeartButton';

const WhatsAppIcon = ({ size = 13, className = '' }: { size?: number; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.705 1.456h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const QUICK_PROMPTS = [
  '🚗 Puncture repair near me',
  '❄️ AC service & repair',
  '⚡ Urgent electrician',
  '🩺 Doctor or medical clinic',
  '🛍️ Grocery & Kirana stores',
];

const STORAGE_KEY = 'nearby_gemini_chat_history';

export default function GeminiChatbot() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { session } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'welcome-msg',
        sender: 'ai',
        text: '👋 Namaste! I am **NearBe AI**, your local smart assistant. How can I help you find services, emergency repairs, or shops today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Settings modal state for API key
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getGeminiApiKey());
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save chat to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Only show for logged in users
  if (!session) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const userCoords =
        location && location.latitude && location.longitude
          ? { latitude: location.latitude, longitude: location.longitude }
          : null;

      const aiResponse = await sendQueryToGemini(query, messages, userCoords);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponse.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedVendors: aiResponse.recommendedVendors,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'I ran into an issue connecting to Gemini. Please try asking again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    const initial: ChatMessage[] = [
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: '👋 Chat cleared! How can I help you find local services in your area?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(initial);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  };

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyInput);
    setKeySavedMessage(true);
    setTimeout(() => {
      setKeySavedMessage(false);
      setSettingsOpen(false);
    }, 1200);
  };

  // Speech Recognition (Voice Input)
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Supports Hindi & Indian English
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInputQuery(transcript);
        handleSendMessage(transcript);
      }
    };

    recognition.start();
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-linear-to-r from-brand to-orange-500 hover:from-brand-dark hover:to-orange-600 text-white rounded-full shadow-lg shadow-brand/30 border border-white/20 cursor-pointer select-none group"
          aria-label="Open NearBe AI Assistant"
        >
          <div className="relative">
            <Sparkles size={18} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-300" />
          </div>
          <span className="text-xs font-display font-extrabold tracking-wide">
            Ask AI
          </span>
        </motion.button>
      )}

      {/* CHAT DRAWER / MODAL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-body"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-ink/40 backdrop-blur-xs"
            />

            {/* Chat Window */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative w-full sm:max-w-lg h-[85vh] sm:h-[650px] bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border-light z-10"
            >
              {/* Header */}
              <div className="px-4 py-3.5 bg-surface-card border-b border-border-light flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-linear-to-tr from-brand to-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Bot size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-display font-extrabold text-ink leading-tight">
                        NearBe AI Assistant
                      </h3>
                      <span className="px-1.5 py-0.2 bg-brand/10 text-brand text-[9px] font-extrabold rounded-md uppercase">
                        Gemini
                      </span>
                    </div>
                    <p className="text-[10px] text-ink-muted">
                      Hyperlocal Guide • {location?.city || 'Live GPS'}
                    </p>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors cursor-pointer"
                    title="Gemini Settings"
                  >
                    <Settings size={16} />
                  </button>

                  <button
                    onClick={handleClearChat}
                    className="p-2 text-ink-muted hover:text-rose-500 rounded-xl hover:bg-surface transition-colors cursor-pointer"
                    title="Clear Conversation"
                  >
                    <Trash2 size={16} />
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-ink-muted hover:text-ink rounded-xl hover:bg-surface transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                        msg.sender === 'user'
                          ? 'bg-brand text-white rounded-br-xs font-medium'
                          : 'bg-surface-card border border-border-light text-ink rounded-bl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-body">
                        {msg.text.split('\n').map((line, idx) => {
                          // Simple bold parser
                          const parts = line.split(/(\*\*.*?\*\*)/g);
                          return (
                            <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>
                              {parts.map((part, pIdx) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return (
                                    <strong key={pIdx} className="font-extrabold text-brand-dark">
                                      {part.slice(2, -2)}
                                    </strong>
                                  );
                                }
                                return part;
                              })}
                            </p>
                          );
                        })}
                      </div>

                      {/* Embedded Vendor Recommendation Cards */}
                      {msg.recommendedVendors && msg.recommendedVendors.length > 0 && (
                        <div className="mt-3 space-y-2 pt-2 border-t border-border-light/60">
                          <p className="text-[10px] font-display font-extrabold text-ink-muted uppercase tracking-wider">
                            Recommended Nearby Vendors:
                          </p>
                          {msg.recommendedVendors.map((vendor) => (
                            <div
                              key={vendor.id}
                              onClick={() => {
                                setIsOpen(false);
                                navigate(`/vendor/${vendor.id}`);
                              }}
                              className="bg-surface hover:bg-brand-50/50 p-2.5 rounded-xl border border-border-light hover:border-brand/30 transition-all cursor-pointer space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1">
                                    <h5 className="text-xs font-display font-bold text-ink">
                                      {vendor.name}
                                    </h5>
                                    {vendor.isVerified && (
                                      <BadgeCheck size={13} className="text-brand shrink-0" />
                                    )}
                                  </div>
                                  <span className="text-[10px] text-ink-muted">
                                    {vendor.subService || vendor.category}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 text-[10px] font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded-md">
                                  <MapPin size={10} />
                                  <span>{formatDistance(vendor.distanceKm)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <a
                                  href={`tel:${vendor.phoneNumber || '9876543210'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    trackVendorCall(vendor.id, vendor.phoneNumber);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-brand text-white rounded-lg text-[10px] font-bold"
                                >
                                  <Phone size={11} />
                                  <span>Call</span>
                                </a>

                                <a
                                  href={`https://wa.me/91${(vendor.whatsappNumber || vendor.phoneNumber || '9876543210').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                                    `Hi ${vendor.name}, I found your listing via NearBe AI Assistant.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    trackVendorWhatsApp(vendor.id, vendor.whatsappNumber);
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-[#25D366]/40 text-[#128C7E] bg-[#25D366]/5 rounded-lg text-[10px] font-bold"
                                >
                                  <WhatsAppIcon size={11} className="text-[#25D366]" />
                                  <span>WhatsApp</span>
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-ink-muted mt-1 px-1">{msg.timestamp}</span>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-center gap-2 p-3 bg-surface-card rounded-2xl w-28 border border-border-light text-xs text-ink-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[10px]">Thinking</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="px-3 py-1.5 bg-surface-card border-t border-border-light/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none select-none">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(prompt)}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-surface border border-border-light hover:border-brand/40 text-[11px] font-display font-medium text-ink hover:text-brand transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-surface-card border-t border-border-light flex items-center gap-2">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder="Ask NearBe AI anything..."
                  className="flex-1 px-3.5 py-2.5 bg-surface border border-border-light focus:border-brand rounded-2xl text-xs sm:text-sm outline-none transition-all shadow-2xs"
                />

                {/* Voice Input Button */}
                <button
                  onClick={toggleVoiceInput}
                  className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                      : 'bg-surface text-ink-muted hover:text-brand border-border-light'
                  }`}
                  title={isListening ? 'Listening...' : 'Voice Input'}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                {/* Send Button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputQuery.trim() || isTyping}
                  className="p-2.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white rounded-2xl shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GEMINI API KEY SETTINGS MODAL */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs font-body"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-surface-card rounded-3xl p-6 max-w-sm w-full border border-border-light shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-brand" />
                  <h4 className="text-sm font-display font-extrabold text-ink">
                    Gemini AI Settings
                  </h4>
                </div>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="p-1 text-ink-muted hover:text-ink rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-ink-muted">
                Enter your Google Gemini API Key from{' '}
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand font-bold underline"
                >
                  Google AI Studio
                </a>{' '}
                for live generation.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-display font-bold text-ink uppercase tracking-wider">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2.5 bg-surface border border-border-light focus:border-brand rounded-xl text-xs outline-none"
                />
              </div>

              {keySavedMessage && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                  <Check size={14} />
                  <span>API Key saved successfully!</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-ink-muted bg-surface hover:bg-border-light transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApiKey}
                  className="flex-1 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-display font-bold transition-all shadow-xs cursor-pointer"
                >
                  Save Key
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
