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

// Helper to retrieve active chat context for current user
export function getActiveChatContext(): {
  cleanPhone: string;
  customerId: string;
  customerName: string;
  vendorId?: string;
} {
  const phone = (
    localStorage.getItem('nearby_customer_phone') ||
    localStorage.getItem('nearby_vendor_phone') ||
    ''
  ).replace(/\D/g, '').slice(-10);

  const name = localStorage.getItem('nearby_customer_name') || 'Customer';
  const vendorId = localStorage.getItem('nearby_vendor_id') || undefined;
  const customerId = phone ? `cust-${phone}` : 'cust-anonymous';

  return { cleanPhone: phone, customerId, customerName: name, vendorId };
}

// Generate deterministic conversation ID
export function getConversationId(vendorId: string, customerId: string): string {
  const cleanV = vendorId.replace(/^conv-/, '');
  const cleanC = customerId.replace(/^cust-/, '');
  return `conv-${cleanV}-${cleanC}`;
}

const getStorageConvsKey = () => {
  const ctx = getActiveChatContext();
  return `nearby_chat_conversations_v3_${ctx.cleanPhone || 'guest'}`;
};

const getStorageMsgsKey = () => {
  const ctx = getActiveChatContext();
  return `nearby_chat_messages_v3_${ctx.cleanPhone || 'guest'}`;
};

const INITIAL_CONVERSATIONS: ChatConversation[] = [];
const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};

// Helper: load conversations from local storage
export function getSavedConversations(): ChatConversation[] {
  try {
    const raw = localStorage.getItem(getStorageConvsKey());
    if (!raw) return INITIAL_CONVERSATIONS;
    return JSON.parse(raw);
  } catch {
    return INITIAL_CONVERSATIONS;
  }
}

// Helper: save conversations to local storage
export function saveConversations(conversations: ChatConversation[]): void {
  try {
    localStorage.setItem(getStorageConvsKey(), JSON.stringify(conversations));
  } catch (err) {
    console.error('Error saving conversations:', err);
  }
}

// Helper: load messages map
export function getSavedMessagesMap(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(getStorageMsgsKey());
    if (!raw) return INITIAL_MESSAGES;
    return JSON.parse(raw);
  } catch {
    return INITIAL_MESSAGES;
  }
}

// Helper: save messages map
export function saveMessagesMap(messagesMap: Record<string, ChatMessage[]>): void {
  try {
    localStorage.setItem(getStorageMsgsKey(), JSON.stringify(messagesMap));
  } catch (err) {
    console.error('Error saving messages:', err);
  }
}

// Get or Create a Conversation with a Vendor
export function getOrCreateConversation({
  vendorId,
  vendorName,
  vendorPhone,
  vendorShopPhoto,
  vendorSubService,
  customerId,
  customerName,
  customerPhone,
}: {
  vendorId: string;
  vendorName: string;
  vendorPhone?: string;
  vendorShopPhoto?: string;
  vendorSubService?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
}): ChatConversation {
  const ctx = getActiveChatContext();
  const effectiveCustomerId = customerId || ctx.customerId;
  const effectiveCustomerName = customerName || ctx.customerName;
  const effectiveCustomerPhone = customerPhone || ctx.cleanPhone;
  const convId = getConversationId(vendorId, effectiveCustomerId);

  const conversations = getSavedConversations();
  const existing = conversations.find(
    (c) => c.id === convId || (c.vendorId === vendorId && c.customerId === effectiveCustomerId)
  );

  if (existing) return existing;

  const newConv: ChatConversation = {
    id: convId,
    vendorId,
    vendorName,
    vendorPhone,
    vendorShopPhoto,
    vendorSubService,
    customerId: effectiveCustomerId,
    customerName: effectiveCustomerName,
    customerPhone: effectiveCustomerPhone,
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

// Asynchronously sync chat messages with Supabase with STRICT privacy filtering
export function syncSupabaseChatMessages(onUpdated?: () => void): void {
  (async () => {
    try {
      const ctx = getActiveChatContext();
      if (!ctx.cleanPhone && !ctx.customerId) return;

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .neq('conversation_id', '__system__')
        .order('created_at', { ascending: true });

      if (error || !data || !Array.isArray(data) || data.length === 0) return;

      // Filter: only keep messages belonging strictly to current user as customer OR as vendor
      const filteredData = data.filter((row: any) => {
        if (!row.conversation_id || row.conversation_id === '__system__') return false;
        const rCustPhone = (row.customer_phone || '').replace(/\D/g, '').slice(-10);
        const rVendPhone = (row.vendor_phone || '').replace(/\D/g, '').slice(-10);
        const rCustId = row.customer_id || '';
        const rVendId = row.vendor_id || '';

        const isAsCustomer =
          (ctx.cleanPhone && rCustPhone === ctx.cleanPhone) ||
          (ctx.customerId && rCustId === ctx.customerId) ||
          (ctx.cleanPhone && rCustId.includes(ctx.cleanPhone));

        const isAsVendor =
          (ctx.vendorId && (rVendId === ctx.vendorId || rVendId.includes(ctx.vendorId))) ||
          (ctx.cleanPhone && rVendPhone === ctx.cleanPhone) ||
          (ctx.cleanPhone && rVendId.includes(ctx.cleanPhone));

        return isAsCustomer || isAsVendor;
      });

      const localConvs = getSavedConversations();
      const localMap = getSavedMessagesMap();
      let hasChanges = false;

      // Group messages by conversation_id
      const grouped: Record<string, any[]> = {};
      filteredData.forEach((row: any) => {
        const convId = row.conversation_id || `conv-${row.vendor_id}-${row.customer_id}`;
        if (!grouped[convId]) grouped[convId] = [];
        grouped[convId].push(row);
      });

      Object.entries(grouped).forEach(([convId, rows]) => {
        const first = rows[0];
        const last = rows[rows.length - 1];

        const unreadForVendor = rows.filter(
          (r: any) => r.sender_role === 'customer' && !r.read_at && r.read !== true
        ).length;
        const unreadForCustomer = rows.filter(
          (r: any) => r.sender_role === 'vendor' && !r.read_at && r.read !== true
        ).length;

        // Ensure conversation exists locally
        let conv = localConvs.find((c) => c.id === convId);
        if (!conv) {
          conv = {
            id: convId,
            vendorId: first.vendor_id,
            vendorName: first.vendor_name || 'Nearby Shop',
            vendorPhone: first.vendor_phone,
            vendorShopPhoto: first.vendor_shop_photo,
            vendorSubService: first.vendor_sub_service || 'General Services',
            customerId: first.customer_id,
            customerName: first.customer_name || 'Customer',
            customerPhone: first.customer_phone || '',
            lastMessage: last.text || 'Message received',
            lastMessageTime: last.created_at,
            unreadCountCustomer: unreadForCustomer,
            unreadCountVendor: unreadForVendor,
          };
          localConvs.unshift(conv);
          hasChanges = true;
        } else {
          let snippet = last.text || '';
          if (last.photo_url) snippet = '📷 Photo attached';
          else if (last.location) snippet = '📍 Shared location';
          else if (last.audio_url) snippet = '🎙️ Voice note';

          conv.lastMessage = snippet;
          conv.lastMessageTime = last.created_at;
          conv.unreadCountVendor = unreadForVendor;
          conv.unreadCountCustomer = unreadForCustomer;
          hasChanges = true;
        }

        // Map messages and merge with recent local optimistic messages
        const existingLocal = localMap[convId] || [];
        const dbIds = new Set(rows.map((r: any) => r.id));
        const pendingOptimistic = existingLocal.filter(
          (m) => !dbIds.has(m.id) && Date.now() - new Date(m.created_at).getTime() < 30000
        );

        const formattedMsgs: ChatMessage[] = [
          ...rows.map((r: any) => ({
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
          })),
          ...pendingOptimistic,
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

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
        const cleanVendorPhone = (
          targetConv.vendorPhone ||
          targetConv.vendorId ||
          localStorage.getItem('nearby_vendor_phone') ||
          ''
        ).replace(/\D/g, '').slice(-10);

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
          vendor_phone: cleanVendorPhone || null,
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
