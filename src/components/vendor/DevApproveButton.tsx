/**
 * ============================================================
 * 🛠️ TEMPORARY DEV UTILITY
 * Remove this entire file once the real Admin Dashboard is built.
 * Simulates admin approval of vendor verification for testing.
 * ============================================================
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';

interface DevApproveButtonProps {
  /** The auth_user_id of the vendor to approve */
  userId: string;
  /** Called after successful approval — use to navigate or refetch data */
  onApproved: () => void;
}

export default function DevApproveButton({ userId, onApproved }: DevApproveButtonProps) {
  const [approving, setApproving] = useState(false);

  // Only render in development builds
  if (!import.meta.env.DEV) return null;

  const handleApprove = async () => {
    setApproving(true);
    try {
      // 1. Update all rows matching auth_user_id
      await supabase
        .from('vendors')
        .update({
          is_verified: true,
          verification_status: 'approved',
        })
        .eq('auth_user_id', userId);

      // 2. Also update by phone_number to ensure any unlinked/duplicate rows get verified & linked
      const { data: userData } = await supabase.auth.getUser();
      const userPhone = userData?.user?.phone || userData?.user?.user_metadata?.phone_number;
      if (userPhone) {
        const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);
        await supabase
          .from('vendors')
          .update({
            auth_user_id: userId,
            is_verified: true,
            verification_status: 'approved',
          })
          .eq('phone_number', cleanPhone);
      }

      onApproved();
    } catch (err) {
      console.error('Demo approve error:', err);
    } finally {
      setApproving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className="w-full mt-8"
    >
      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 border-t border-dashed border-gray-300" />
        <span className="text-[10px] font-mono font-bold text-amber-500 tracking-wider uppercase">
          🛠️ DEV ONLY
        </span>
        <div className="flex-1 border-t border-dashed border-gray-300" />
      </div>

      <button
        onClick={handleApprove}
        disabled={approving}
        className="w-full py-3 text-sm font-mono font-semibold text-amber-700 bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl hover:bg-amber-100 hover:border-amber-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {approving ? 'Approving…' : 'Demo: Approve Verification'}
      </button>

      <p className="text-[9px] text-gray-400 font-mono mt-2 text-center">
        This button simulates admin approval for testing purposes.
        <br />
        It will not appear in production builds.
      </p>
    </motion.div>
  );
}
