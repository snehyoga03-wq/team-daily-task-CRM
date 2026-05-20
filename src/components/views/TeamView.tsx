'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { useIsAdmin } from '@/lib/useAdmin';
import { motion } from 'framer-motion';
import { useState } from 'react';
import * as dataService from '@/lib/dataService';

export default function TeamView() {
  const { theme, teamMembers, teams, setTeamMembers } = useAppStore();
  const { currentUser } = useAuthStore();
  const isAdmin = useIsAdmin();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const borderColor = isDark ? '#2a2a3a' : '#e5e2f0';

  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'Unassigned';
    return teams.find(t => t.id === teamId)?.name || 'Unknown';
  };

  const getTeamColor = (teamId: string | null) => {
    if (!teamId) return '#71717a';
    return teams.find(t => t.id === teamId)?.color || '#71717a';
  };

  const handleSaveEdit = async (memberId: string) => {
    try {
      const updates: Record<string, any> = {};
      if (selectedTeam !== undefined) updates.team_id = selectedTeam || null;
      if (selectedRole) updates.role = selectedRole;
      await dataService.updateUser(memberId, updates);
      const members = await dataService.fetchTeamMembers();
      setTeamMembers(members);
      setEditingMember(null);
    } catch (err) {
      console.error('Failed to update member:', err);
    }
  };

  const startEditing = (member: typeof teamMembers[0]) => {
    setEditingMember(member.id);
    setSelectedTeam(member.team_id || '');
    setSelectedRole(member.role);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>Team Members</h1>
          <p className="text-xs mt-1" style={{ color: mutedColor }}>{teamMembers.length} members</p>
        </div>
        {isAdmin && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => useAppStore.getState().setActiveView('admin')}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
          >
            <span>🛡️</span> Manage Team
          </motion.button>
        )}
      </div>

      {teamMembers.length === 0 && (
        <div className="text-center py-16">
          <span className="text-5xl">👥</span>
          <p className="text-sm mt-4" style={{ color: mutedColor }}>No team members yet. They will appear here when they log in.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {teamMembers.map((member, i) => (
          <motion.div key={member.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4, scale: 1.02 }} className="glass-card glass-card-hover p-5 cursor-pointer group">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${getTeamColor(member.team_id)}, ${getTeamColor(member.team_id)}99)` }}>{member.full_name?.charAt(0)?.toUpperCase() || '?'}</div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 bg-green-400" style={{ borderColor: isDark ? '#12121a' : '#fff' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: textColor }}>{member.full_name}</p>
                  {member.role === 'admin' && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>ADMIN</span>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: mutedColor }}>{getTeamName(member.team_id)}</p>
              </div>
              {/* Admin edit button */}
              {isAdmin && member.id !== currentUser?.id && editingMember !== member.id && (
                <motion.button whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); startEditing(member); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: isDark ? '#2a2a3a' : '#e5e2f0' }}
                >✏️</motion.button>
              )}
            </div>

            {/* Admin inline edit */}
            {isAdmin && editingMember === member.id ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                className="mb-3 space-y-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.04)', border: `1px solid ${borderColor}` }}
              >
                <div>
                  <label className="text-[9px] font-medium block mb-1" style={{ color: mutedColor }}>Team</label>
                  <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none appearance-none"
                    style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                  >
                    <option value="">Unassigned</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-medium block mb-1" style={{ color: mutedColor }}>Role</label>
                  <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none appearance-none"
                    style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setEditingMember(null)}
                    className="flex-1 text-[10px] py-1.5 rounded-lg font-medium"
                    style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: mutedColor }}
                  >Cancel</button>
                  <motion.button whileTap={{ scale: 0.95 }}
                    onClick={() => handleSaveEdit(member.id)}
                    className="flex-1 text-[10px] py-1.5 rounded-lg font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
                  >Save</motion.button>
                </div>
              </motion.div>
            ) : null}

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
