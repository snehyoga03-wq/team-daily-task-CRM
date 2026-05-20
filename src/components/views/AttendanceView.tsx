'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion } from 'framer-motion';
import { useState } from 'react';
import * as dataService from '@/lib/dataService';

export default function AttendanceView() {
  const { theme, teamMembers } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' });

  const handleCheckIn = async () => {
    if (!currentUser) return;
    setCheckingIn(true);
    try {
      await dataService.checkIn(currentUser.id);
      setCheckedIn(true);
    } catch (err) {
      console.error('Check-in failed:', err);
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>Attendance Tracker</h1>
          <p className="text-xs mt-1" style={{ color: mutedColor }}>{today}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCheckIn}
          disabled={checkedIn || checkingIn}
          className="btn-primary text-xs disabled:opacity-50"
        >
          {checkedIn ? '✅ Checked In' : checkingIn ? 'Checking in...' : '📍 Check In'}
        </motion.button>
      </div>

      {/* Team Overview */}
      <div className="glass-card overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-[1fr,100px,80px] gap-4 px-5 py-3 border-b text-xs font-semibold min-w-[400px]" style={{ color: mutedColor, borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
          <span>Member</span><span>Role</span><span>Status</span>
        </div>
        {teamMembers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: mutedColor }}>No team members found</p>
          </div>
        )}
        {teamMembers.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
            className="grid grid-cols-[1fr,100px,80px] gap-4 px-5 py-3 border-b items-center min-w-[400px]"
            style={{ borderColor: isDark ? 'rgba(42,42,58,0.5)' : 'rgba(229,226,240,0.5)' }}>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>
                {r.full_name?.charAt(0)?.toUpperCase() || '?'}
              </span>
              <div>
                <p className="text-sm font-medium" style={{ color: textColor }}>{r.full_name}</p>
                <p className="text-[10px]" style={{ color: mutedColor }}>{r.phone || ''}</p>
              </div>
            </div>
            <span className="text-xs" style={{ color: mutedColor }}>{r.role}</span>
            <span className="text-[10px] px-2 py-1 rounded-full text-center font-medium capitalize"
              style={{ background: r.is_active ? '#10b98115' : '#6b728015', color: r.is_active ? '#10b981' : '#6b7280' }}>{r.is_active ? 'active' : 'inactive'}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
