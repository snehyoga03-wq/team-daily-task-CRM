'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';

export default function TeamView() {
  const { theme, teamMembers } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: textColor }}>Team Members</h1>
        <p className="text-xs mt-1" style={{ color: mutedColor }}>{teamMembers.length} members</p>
      </div>

      {teamMembers.length === 0 && (
        <div className="text-center py-16">
          <span className="text-5xl">👥</span>
          <p className="text-sm mt-4" style={{ color: mutedColor }}>No team members yet. They will appear here when they log in.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {teamMembers.map((member, i) => (
          <motion.div key={member.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4, scale: 1.02 }} className="glass-card glass-card-hover p-5 cursor-pointer">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>{member.full_name?.charAt(0)?.toUpperCase() || '?'}</div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 bg-green-400" style={{ borderColor: isDark ? '#12121a' : '#fff' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: textColor }}>{member.full_name}</p>
                <p className="text-[11px]" style={{ color: mutedColor }}>{member.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {member.phone && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: mutedColor }}>📱 {member.phone}</span>}
              <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: member.is_active ? '#10b98115' : '#6b728015', color: member.is_active ? '#10b981' : '#6b7280' }}>{member.is_active ? 'active' : 'inactive'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: '#8b5cf6' }}>{member.xp_points}</p>
                <p className="text-[9px]" style={{ color: mutedColor }}>XP</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: '#06b6d4' }}>Lv.{member.level}</p>
                <p className="text-[9px]" style={{ color: mutedColor }}>Level</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>{member.streak_days}</p>
                <p className="text-[9px]" style={{ color: mutedColor }}>🔥 Streak</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
