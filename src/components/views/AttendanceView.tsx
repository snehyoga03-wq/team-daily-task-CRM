'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { mockTeamMembers } from '@/lib/mockData';

export default function AttendanceView() {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';

  const statusColors = { present: '#10b981', late: '#f59e0b', absent: '#f43f5e', half_day: '#06b6d4', leave: '#8b5cf6' };
  const attendanceRecords = mockTeamMembers.map((m, i) => ({
    ...m, checkIn: i < 6 ? `09:${String(i * 5 + 2).padStart(2, '0')} AM` : null,
    checkOut: i < 4 ? `06:${String(i * 10 + 5).padStart(2, '0')} PM` : null,
    attStatus: i < 5 ? 'present' : i < 6 ? 'late' : i < 7 ? 'absent' : 'leave' as keyof typeof statusColors,
    hours: i < 6 ? `${8 - i * 0.3}h` : '—',
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>Attendance Tracker</h1>
          <p className="text-xs mt-1" style={{ color: mutedColor }}>May 13, 2026 — Tuesday</p>
        </div>
        <div className="flex gap-3">
          {[
            { label: 'Present', count: 5, color: '#10b981' },
            { label: 'Late', count: 1, color: '#f59e0b' },
            { label: 'Absent', count: 1, color: '#f43f5e' },
            { label: 'Leave', count: 1, color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} className="stat-card py-2 px-4 text-center">
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.count}</p>
              <p className="text-[10px]" style={{ color: mutedColor }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr,100px,100px,80px,80px] gap-4 px-5 py-3 border-b text-xs font-semibold" style={{ color: mutedColor, borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
          <span>Member</span><span>Check In</span><span>Check Out</span><span>Hours</span><span>Status</span>
        </div>
        {attendanceRecords.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
            className="grid grid-cols-[1fr,100px,100px,80px,80px] gap-4 px-5 py-3 border-b items-center"
            style={{ borderColor: isDark ? 'rgba(42,42,58,0.5)' : 'rgba(229,226,240,0.5)' }}>
            <div className="flex items-center gap-3">
              <span className="text-lg">{r.avatar}</span>
              <div>
                <p className="text-sm font-medium" style={{ color: textColor }}>{r.name}</p>
                <p className="text-[10px]" style={{ color: mutedColor }}>{r.role}</p>
              </div>
            </div>
            <span className="text-xs" style={{ color: r.checkIn ? textColor : mutedColor }}>{r.checkIn || '—'}</span>
            <span className="text-xs" style={{ color: r.checkOut ? textColor : mutedColor }}>{r.checkOut || '—'}</span>
            <span className="text-xs" style={{ color: textColor }}>{r.hours}</span>
            <span className="text-[10px] px-2 py-1 rounded-full text-center font-medium capitalize"
              style={{ background: `${statusColors[r.attStatus]}15`, color: statusColors[r.attStatus] }}>{r.attStatus.replace('_', ' ')}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
