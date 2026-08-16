import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  ArrowLeft,
  ChevronRight,
  Mic,
  Camera,
  MapPin,
  CheckCheck,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUnread } from '../context/UnreadContext';
import type { ChatConversation } from '../utils/chatStorage';
import {
  getSavedConversations,
  markConversationAsRead,
  syncSupabaseChatMessages,
} from '../utils/chatStorage';
import { supabase } from '../lib/supabase';
import ChatBoxModal from '../components/chat/ChatBoxModal';

export default function ChatsPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const userRole: 'customer' | 'vendor' = role === 'vendor' ? 'vendor' : 'customer';

  const userCleanPhone = (
    localStorage.getItem('nearby_vendor_phone') ||
    user?.phone ||
    user?.user_metadata?.phone_number ||
    (user?.email || '').replace('@nearbe.app', '') ||
    ''
  ).replace(/\D/g, '').slice(-10);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  const { markAsRead } = useUnread();

  const reloadConversations = () => {
    const list = getSavedConversations();
    setConversations(list);
  };

  useEffect(() => {
    reloadConversations();
    syncSupabaseChatMessages(reloadConversations);
    markAsRead();

    // Subscribe to live Supabase Realtime changes on chat_messages table
    const channel = supabase
      .channel('chats_page_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          syncSupabaseChatMessages(reloadConversations);
        }
      )
      .subscribe();

    const timer = setInterval(() => {
      syncSupabaseChatMessages(reloadConversations);
    }, 6000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [markAsRead]);

  const handleOpenConversation = (conv: ChatConversation) => {
    setActiveConversation(conv);
    markConversationAsRead(conv.id, userRole);
    markAsRead(conv.id);
    setIsChatModalOpen(true);
    reloadConversations();
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!conv || conv.id === '__system__' || conv.vendorId === '__system__') return false;

    if (userRole === 'vendor') {
      const convVendorPhone = (conv.vendorPhone || conv.vendorId || '').replace(/\D/g, '').slice(-10);
      const matchesVendor =
        conv.vendorId === user?.id ||
        (userCleanPhone && convVendorPhone === userCleanPhone) ||
        (userCleanPhone && conv.vendorId.includes(userCleanPhone));
      if (!matchesVendor) return false;
    } else {
      // Customer mode: strictly show only conversations started by this customer
      const convCustomerPhone = (conv.customerPhone || '').replace(/\D/g, '').slice(-10);
      const matchesCustomer =
        (userCleanPhone && convCustomerPhone === userCleanPhone) ||
        (user?.id && conv.customerId === user.id) ||
        (userCleanPhone && conv.customerId.includes(userCleanPhone));
      if (!matchesCustomer) return false;
    }

    const name = userRole === 'customer' ? (conv.vendorName || 'Nearby Shop') : (conv.customerName || 'Customer');
    const q = searchQuery.toLowerCase().trim();
    return (
      name.toLowerCase().includes(q) ||
      (conv.lastMessage && conv.lastMessage.toLowerCase().includes(q)) ||
      (conv.vendorSubService && conv.vendorSubService.toLowerCase().includes(q))
    );
  });

  const formatTimeAgo = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Format last message preview with icons
  const formatLastMsg = (msg: string) => {
    if (msg.startsWith('📍')) return { icon: <MapPin size={13} className="text-orange-500 shrink-0" />, text: 'Shared Location' };
    if (msg.startsWith('🎙️')) return { icon: <Mic size={13} className="text-orange-500 shrink-0" />, text: 'Voice note' };
    if (msg.startsWith('📷')) return { icon: <Camera size={13} className="text-orange-500 shrink-0" />, text: 'Photo' };
    return { icon: null, text: msg };
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-body pb-24 sm:pb-8 select-none">

      {/* ═══════════ MOBILE-OPTIMIZED SLEEK HEADER ═══════════ */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_6px_rgba(0,0,0,0.03)] pt-1 pb-1">
        <div className="max-w-xl mx-auto px-3.5 min-h-[56px] flex items-center justify-between gap-2">
          {/* Left: Back Button + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-gray-100/90 hover:bg-gray-200/90 text-gray-700 flex items-center justify-center transition-colors cursor-pointer border border-gray-200/60 shrink-0"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-[15px] font-display font-extrabold text-gray-900 leading-tight truncate">
                In-App Chats
              </h1>
              <p className="text-[11px] text-gray-500 font-medium leading-tight truncate">
                {userRole === 'customer' ? 'Customer Messages' : 'Vendor Customer Chats'}
              </p>
            </div>
          </div>

          {/* Right: Sleek Compact Mode Pill */}
          <div className="shrink-0">
            <span className="text-[10px] font-display font-extrabold px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200/70 uppercase tracking-wider whitespace-nowrap">
              {userRole} Mode
            </span>
          </div>
        </div>
      </header>

      {/* ═══════════ MAIN CONTAINER ═══════════ */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-4 space-y-3.5">
        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages by name or service..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200/80 rounded-2xl text-xs font-body outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Conversations List */}
        {filteredConversations.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center space-y-4 py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-50 to-amber-100 text-orange-600 rounded-2xl mx-auto flex items-center justify-center border border-orange-200/60 shadow-xs">
              <MessageCircle size={32} />
            </div>
            <div>
              <h3 className="text-base font-display font-extrabold text-gray-900">No conversations found</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed">
                {searchQuery
                  ? `No chats match "${searchQuery}"`
                  : 'Start a direct chat with any vendor by clicking the "Chat" button on their shop profile.'}
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-display font-extrabold text-xs rounded-2xl shadow-md shadow-orange-500/20 cursor-pointer transition-all active:scale-95"
            >
              Explore Nearby Vendors
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredConversations.map((conv, idx) => {
              const partnerName = userRole === 'customer' ? conv.vendorName : conv.customerName;
              const partnerPhoto = userRole === 'customer' ? conv.vendorShopPhoto : undefined;
              const unreadCount =
                userRole === 'customer' ? conv.unreadCountCustomer : conv.unreadCountVendor;
              const isBlocked = conv.isBlockedByCustomer || conv.isBlockedByVendor;
              const lastMsg = formatLastMsg(conv.lastMessage);

              return (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenConversation(conv)}
                  className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center gap-3.5 relative overflow-hidden ${
                    unreadCount > 0
                      ? 'border-orange-300/80 bg-gradient-to-r from-orange-50/40 via-white to-white'
                      : 'border-gray-100 hover:border-orange-200'
                  }`}
                >
                  {/* Left Accent indicator for unread */}
                  {unreadCount > 0 && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-amber-500 rounded-r-full" />
                  )}

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 text-orange-600 flex items-center justify-center font-display font-extrabold text-base overflow-hidden border border-orange-200/50 shadow-xs">
                      {partnerPhoto ? (
                        <img src={partnerPhoto} alt={partnerName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{partnerName[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    {/* Active Badge */}
                    {!isBlocked && unreadCount > 0 && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className={`text-xs sm:text-sm font-display truncate leading-tight ${
                        unreadCount > 0 ? 'font-extrabold text-gray-900' : 'font-bold text-gray-800'
                      }`}>
                        {partnerName}
                      </h3>
                      <span className={`text-[10px] shrink-0 font-mono ${
                        unreadCount > 0 ? 'text-orange-600 font-extrabold' : 'text-gray-400 font-medium'
                      }`}>
                        {formatTimeAgo(conv.lastMessageTime)}
                      </span>
                    </div>

                    {/* Subservice Tag */}
                    {conv.vendorSubService && (
                      <p className="text-[10px] text-orange-600 font-display font-extrabold truncate mb-1">
                        {conv.vendorSubService}
                      </p>
                    )}

                    {/* Last message snippet */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <CheckCheck size={14} className="text-gray-400 shrink-0" />
                        {lastMsg.icon}
                        <p className={`text-xs truncate font-body ${
                          unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'
                        }`}>
                          {lastMsg.text}
                        </p>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isBlocked && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                            Blocked
                          </span>
                        )}
                        {unreadCount > 0 && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-display font-extrabold text-[10px] flex items-center justify-center shadow-xs animate-bounce">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* ═══════════ ACTIVE CHAT BOX MODAL ═══════════ */}
      <ChatBoxModal
        conversation={activeConversation}
        currentUserRole={userRole}
        isOpen={isChatModalOpen}
        onClose={() => {
          setIsChatModalOpen(false);
          reloadConversations();
        }}
        onConversationUpdated={reloadConversations}
      />
    </div>
  );
}
