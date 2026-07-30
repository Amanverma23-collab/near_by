import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'customer' | 'vendor';
  text?: string;
  photoUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  audioUrl?: string;
  audioDurationSec?: number;
  created_at: string;
  read: boolean;
}

export interface ChatConversation {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorPhone?: string;
  vendorShopPhoto?: string;
  vendorSubService?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCountCustomer: number;
  unreadCountVendor: number;
  isBlockedByCustomer?: boolean;
  isBlockedByVendor?: boolean;
  reportedBy?: ('customer' | 'vendor')[];
  reportReason?: string;
}

const STORAGE_CONVERSATIONS_KEY = 'nearby_chat_conversations_v1';
const STORAGE_MESSAGES_KEY = 'nearby_chat_messages_v1';

const INITIAL_CONVERSATIONS: ChatConversation[] = [];

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};

// Helper: load conversations from local storage
export function getSavedConversations(): ChatConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_CONVERSATIONS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_CONVERSATIONS_KEY, JSON.stringify(INITIAL_CONVERSATIONS));
      return INITIAL_CONVERSATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CONVERSATIONS;
  }
}

// Helper: save conversations to local storage
export function saveConversations(conversations: ChatConversation[]): void {
  try {
    localStorage.setItem(STORAGE_CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (err) {
    console.error('Error saving conversations:', err);
  }
}

// Helper: load messages map
export function getSavedMessagesMap(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(STORAGE_MESSAGES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(INITIAL_MESSAGES));
      return INITIAL_MESSAGES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_MESSAGES;
  }
}

// Helper: save messages map
export function saveMessagesMap(messagesMap: Record<string, ChatMessage[]>): void {
  try {
    localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messagesMap));
  } catch (err) {
    console.error('Error saving messages:', err);
  }
}

// Get or Create a Conversation with a Vendor
export function getOrCreateConversation({
  vendorId,
  vendorName,
  vendorShopPhoto,
  vendorSubService,
  customerId = 'cust-current',
  customerName = 'Verified Customer',
  customerPhone = '+91 9876543210',
}: {
  vendorId: string;
  vendorName: string;
  vendorShopPhoto?: string;
  vendorSubService?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
}): ChatConversation {
  const conversations = getSavedConversations();
  const existing = conversations.find(
    (c) => c.vendorId === vendorId && c.customerId === customerId
  );

  if (existing) return existing;

  const newConv: ChatConversation = {
    id: `conv-${Date.now()}`,
    vendorId,
    vendorName,
    vendorShopPhoto,
    vendorSubService,
    customerId,
    customerName,
    customerPhone,
    lastMessage: 'Chat started',
    lastMessageTime: new Date().toISOString(),
    unreadCountCustomer: 0,
    unreadCountVendor: 0,
  };

  const updated = [newConv, ...conversations];
  saveConversations(updated);

  const messagesMap = getSavedMessagesMap();
  messagesMap[newConv.id] = [
    {
      id: `m-init-${Date.now()}`,
      conversationId: newConv.id,
      senderId: 'system',
      senderRole: 'vendor',
      text: `Chat initialized with ${vendorName}. You can now send messages, photos, locations, or voice notes.`,
      created_at: new Date().toISOString(),
      read: true,
    },
  ];
  saveMessagesMap(messagesMap);

  return newConv;
}

// Get messages for a conversation
export function getConversationMessages(conversationId: string): ChatMessage[] {
  const map = getSavedMessagesMap();
  return map[conversationId] || [];
}

// Asynchronously sync chat messages with Supabase for real-time cross-device messaging
export function syncSupabaseChatMessages(onUpdated?: () => void): void {
  (async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !data || !Array.isArray(data) || data.length === 0) return;

      const localConvs = getSavedConversations();
      const localMap = getSavedMessagesMap();
      let hasChanges = false;

      // Group messages by conversation_id
      const grouped: Record<string, any[]> = {};
      data.forEach((row: any) => {
        const convId = row.conversation_id || `conv-${row.vendor_id}`;
        if (!grouped[convId]) grouped[convId] = [];
        grouped[convId].push(row);
      });

      Object.entries(grouped).forEach(([convId, rows]) => {
        const first = rows[0];
        const last = rows[rows.length - 1];

        // Ensure conversation exists locally
        let conv = localConvs.find((c) => c.id === convId || c.vendorId === first.vendor_id);
        if (!conv) {
          conv = {
            id: convId,
            vendorId: first.vendor_id,
            vendorName: first.vendor_name || 'Nearby Shop',
            vendorShopPhoto: first.vendor_shop_photo,
            vendorSubService: first.vendor_sub_service || 'General Services',
            customerId: first.customer_id || 'cust-current',
            customerName: first.customer_name || 'Customer',
            customerPhone: first.customer_phone || '',
            lastMessage: last.text || 'Message received',
            lastMessageTime: last.created_at,
            unreadCountCustomer: 0,
            unreadCountVendor: rows.filter((r: any) => r.sender_role === 'customer' && !r.read).length,
          };
          localConvs.unshift(conv);
          hasChanges = true;
        } else {
          let snippet = last.text || '';
          if (last.photo_url) snippet = '📷 Photo attached';
          else if (last.location) snippet = '📍 Shared location';
          else if (last.audio_url) snippet = '🎙️ Voice note';

          if (conv.lastMessageTime !== last.created_at) {
            conv.lastMessage = snippet;
            conv.lastMessageTime = last.created_at;
            conv.unreadCountVendor = rows.filter((r: any) => r.sender_role === 'customer' && !r.read).length;
            hasChanges = true;
          }
        }

        // Map messages
        const formattedMsgs: ChatMessage[] = rows.map((r: any) => ({
          id: r.id,
          conversationId: convId,
          senderId: r.sender_id,
          senderRole: r.sender_role,
          text: r.text,
          photoUrl: r.photo_url,
          location: r.location,
          audioUrl: r.audio_url,
          audioDurationSec: r.audio_duration_sec,
          created_at: r.created_at,
          read: Boolean(r.read),
        }));

        if (JSON.stringify(localMap[convId]) !== JSON.stringify(formattedMsgs)) {
          localMap[convId] = formattedMsgs;
          hasChanges = true;
        }
      });

      if (hasChanges) {
        saveConversations(localConvs);
        saveMessagesMap(localMap);
        if (onUpdated) onUpdated();
      }
    } catch (e) {
      console.warn('Chat sync notice:', e);
    }
  })();
}

// Send a message in a conversation
export function sendMessageToConversation({
  conversationId,
  senderId,
  senderRole,
  text,
  photoUrl,
  location,
  audioUrl,
  audioDurationSec,
}: {
  conversationId: string;
  senderId: string;
  senderRole: 'customer' | 'vendor';
  text?: string;
  photoUrl?: string;
  location?: { latitude: number; longitude: number; address?: string };
  audioUrl?: string;
  audioDurationSec?: number;
}): ChatMessage {
  const messagesMap = getSavedMessagesMap();
  const conversations = getSavedConversations();

  const convIndex = conversations.findIndex((c) => c.id === conversationId);
  const targetConv = convIndex !== -1 ? conversations[convIndex] : null;

  if (targetConv) {
    if (senderRole === 'customer' && targetConv.isBlockedByVendor) {
      throw new Error('You cannot send messages to this vendor because you have been blocked.');
    }
    if (senderRole === 'vendor' && targetConv.isBlockedByCustomer) {
      throw new Error('You cannot send messages to this customer because you have been blocked.');
    }
  }

  const newMsg: ChatMessage = {
    id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    conversationId,
    senderId,
    senderRole,
    text,
    photoUrl,
    location,
    audioUrl,
    audioDurationSec,
    created_at: new Date().toISOString(),
    read: false,
  };

  const list = messagesMap[conversationId] || [];
  messagesMap[conversationId] = [...list, newMsg];
  saveMessagesMap(messagesMap);

  // Update conversation last message & unread count
  if (convIndex !== -1) {
    let snippet = text || '';
    if (photoUrl) snippet = '📷 Photo attached';
    else if (location) snippet = '📍 Shared location';
    else if (audioUrl) snippet = '🎙️ Voice note';

    const conv = conversations[convIndex];
    conv.lastMessage = snippet;
    conv.lastMessageTime = newMsg.created_at;

    if (senderRole === 'customer') {
      conv.unreadCountVendor = (conv.unreadCountVendor || 0) + 1;
    } else {
      conv.unreadCountCustomer = (conv.unreadCountCustomer || 0) + 1;
    }

    saveConversations(conversations);
  }

  // Async insert to Supabase DB for cross-device delivery
  if (targetConv) {
    (async () => {
      try {
        const payload = {
          id: newMsg.id,
          conversation_id: conversationId,
          vendor_id: targetConv.vendorId,
          customer_id: targetConv.customerId,
          sender_id: senderId,
          sender_role: senderRole,
          text: text || '',
          photo_url: photoUrl || null,
          location: location || null,
          audio_url: audioUrl || null,
          audio_duration_sec: audioDurationSec || null,
          created_at: newMsg.created_at,
          read: false,
          read_at: null,
          vendor_name: targetConv.vendorName || null,
          customer_name: targetConv.customerName || null,
          customer_phone: targetConv.customerPhone || null,
          vendor_sub_service: targetConv.vendorSubService || null,
          vendor_shop_photo: targetConv.vendorShopPhoto || null,
        };

        const { data, error } = await supabase
          .from('chat_messages')
          .insert(payload)
          .select();

        console.log('SEND RESULT:', { data, error, payload });
        window.dispatchEvent(new Event('nearby_unread_updated'));

        if (error) {
          console.warn('Supabase chat message insert error/notice:', error);
        }
      } catch (e) {
        console.warn('Supabase chat message insert catch notice:', e);
      }
    })();
  }

  return newMsg;
}

// Mark messages as read
export function markConversationAsRead(conversationId: string, role: 'customer' | 'vendor'): void {
  const conversations = getSavedConversations();
  const convIndex = conversations.findIndex((c) => c.id === conversationId);

  if (convIndex !== -1) {
    if (role === 'customer') {
      conversations[convIndex].unreadCountCustomer = 0;
    } else {
      conversations[convIndex].unreadCountVendor = 0;
    }
    saveConversations(conversations);
  }

  const messagesMap = getSavedMessagesMap();
  const list = messagesMap[conversationId] || [];
  let changed = false;

  const updatedList = list.map((m) => {
    if (m.senderRole !== role && !m.read) {
      changed = true;
      return { ...m, read: true };
    }
    return m;
  });

  if (changed) {
    messagesMap[conversationId] = updatedList;
    saveMessagesMap(messagesMap);
  }
}

// Block / Unblock user
export function toggleBlockConversation(
  conversationId: string,
  blockedByRole: 'customer' | 'vendor'
): ChatConversation | null {
  const conversations = getSavedConversations();
  const convIndex = conversations.findIndex((c) => c.id === conversationId);

  if (convIndex === -1) return null;

  const conv = conversations[convIndex];
  if (blockedByRole === 'customer') {
    conv.isBlockedByCustomer = !conv.isBlockedByCustomer;
  } else {
    conv.isBlockedByVendor = !conv.isBlockedByVendor;
  }

  saveConversations(conversations);
  return conv;
}

// Report user
export function reportConversation(
  conversationId: string,
  reportedByRole: 'customer' | 'vendor',
  reason: string
): ChatConversation | null {
  const conversations = getSavedConversations();
  const convIndex = conversations.findIndex((c) => c.id === conversationId);

  if (convIndex === -1) return null;

  const conv = conversations[convIndex];
  const list = conv.reportedBy || [];
  if (!list.includes(reportedByRole)) {
    conv.reportedBy = [...list, reportedByRole];
  }
  conv.reportReason = reason;

  saveConversations(conversations);
  return conv;
}
