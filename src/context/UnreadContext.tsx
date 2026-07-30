import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getSavedConversations, markConversationAsRead as markLocalRead } from '../utils/chatStorage';

interface UnreadContextType {
  unreadCount: number;
  hasUnread: boolean;
  refreshUnread: () => Promise<void>;
  markAsRead: (conversationId?: string) => Promise<void>;
}

const UnreadContext = createContext<UnreadContextType | undefined>(undefined);

export const UnreadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const getCleanPhone = useCallback(() => {
    const custPhone = localStorage.getItem('nearby_customer_phone');
    const vendPhone = localStorage.getItem('nearby_vendor_phone');
    const raw = (role === 'vendor' ? vendPhone : custPhone) || user?.phone || user?.user_metadata?.phone_number || '';
    return raw.replace(/\D/g, '').slice(-10);
  }, [role, user]);

  const refreshUnread = useCallback(async () => {
    const cleanPhone = getCleanPhone();
    const userRole = role === 'vendor' ? 'vendor' : 'customer';

    let totalUnread = 0;

    try {
      // 1. Query Supabase chat_messages table for unread messages where read_at is null
      let query = supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null);

      if (userRole === 'vendor') {
        query = query.eq('sender_role', 'customer');
        if (cleanPhone) {
          query = query.or(`vendor_phone.eq.${cleanPhone},vendor_id.eq.${cleanPhone},vendor_id.eq.${user?.id || ''}`);
        }
      } else {
        query = query.eq('sender_role', 'vendor');
        if (cleanPhone) {
          query = query.or(`customer_phone.eq.${cleanPhone},customer_id.eq.${cleanPhone},customer_id.eq.${user?.id || ''}`);
        }
      }

      const { count, error } = await query;

      if (!error && typeof count === 'number') {
        totalUnread = count;
      } else {
        // Fallback calculation from local conversations state
        const localConvs = getSavedConversations();
        totalUnread = localConvs.reduce((acc, conv) => {
          return acc + (userRole === 'vendor' ? (conv.unreadCountVendor || 0) : (conv.unreadCountCustomer || 0));
        }, 0);
      }
    } catch {
      const localConvs = getSavedConversations();
      totalUnread = localConvs.reduce((acc, conv) => {
        return acc + (userRole === 'vendor' ? (conv.unreadCountVendor || 0) : (conv.unreadCountCustomer || 0));
      }, 0);
    }

    setUnreadCount(totalUnread);
  }, [getCleanPhone, role, user?.id]);

  const markAsRead = useCallback(async (conversationId?: string) => {
    const userRole = role === 'vendor' ? 'vendor' : 'customer';
    const nowIso = new Date().toISOString();

    try {
      let query = supabase
        .from('chat_messages')
        .update({ read: true, read_at: nowIso })
        .is('read_at', null);

      if (userRole === 'vendor') {
        query = query.eq('sender_role', 'customer');
      } else {
        query = query.eq('sender_role', 'vendor');
      }

      if (conversationId) {
        query = query.eq('conversation_id', conversationId);
      }

      await query;

      if (conversationId) {
        markLocalRead(conversationId, userRole);
      } else {
        const localConvs = getSavedConversations();
        localConvs.forEach((conv) => {
          markLocalRead(conv.id, userRole);
        });
      }
    } catch (e) {
      console.warn('Notice marking messages as read:', e);
    }

    await refreshUnread();
  }, [role, refreshUnread]);

  useEffect(() => {
    refreshUnread();

    // Supabase Realtime channel listening for live new messages & read status updates
    const channel = supabase
      .channel('global_unread_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          refreshUnread();
        }
      )
      .subscribe();

    const handleLocalUpdate = () => refreshUnread();
    window.addEventListener('nearby_unread_updated', handleLocalUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('nearby_unread_updated', handleLocalUpdate);
    };
  }, [refreshUnread]);

  return (
    <UnreadContext.Provider
      value={{
        unreadCount,
        hasUnread: unreadCount > 0,
        refreshUnread,
        markAsRead,
      }}
    >
      {children}
    </UnreadContext.Provider>
  );
};

export const useUnread = (): UnreadContextType => {
  const context = useContext(UnreadContext);
  if (!context) {
    throw new Error('useUnread must be used within an UnreadProvider');
  }
  return context;
};
