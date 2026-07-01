'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore, cleanPhoneNumber } from '@/lib/auth';
import { useIsAdmin } from '@/lib/useAdmin';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [selectedName, setSelectedName] = useState<string>('');
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');

  // Create Member Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newMemberForm, setNewMemberForm] = useState({ full_name: '', phone: '', email: '', role: 'member', team_id: '' });
  const [loading, setLoading] = useState<boolean>(false);

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
      if (selectedName.trim()) updates.full_name = selectedName.trim();
      if (selectedPhone !== undefined) updates.phone = cleanPhoneNumber(selectedPhone);
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
    setSelectedName(member.full_name || '');
    setSelectedPhone(member.phone || '');
    setSelectedTeam(member.team_id || '');
    setSelectedRole(member.role || 'member');
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.full_name.trim() || !newMemberForm.phone.trim()) return;
    setLoading(true);
    try {
      const cleanPhone = cleanPhoneNumber(newMemberForm.phone);
      await dataService.createUser({
        full_name: newMemberForm.full_name.trim(),
        phone: cleanPhone,
        email: newMemberForm.email.trim() || null,
        role: newMemberForm.role as 'admin' | 'member',
        team_id: newMemberForm.team_id || null,
        xp_points: 0,
        level: 1,
        streak_days: 0,
        is_active: true
      });
      const members = await dataService.fetchTeamMembers();
      setTeamMembers(members);
      setShowCreateModal(false);
      setNewMemberForm({ full_name: '', phone: '', email: '', role: 'member', team_id: '' });
    } catch (err: any) {
      alert(err.message || 'Failed to create member');
    }
    setLoading(false);
  };

  const renderMemberCard = (member: typeof teamMembers[0], i: number) => (
    <motion.div key={member.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4, scale: 1.02 }} className="glass-card glass-card-hover p-5 cursor-pointer group">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${getTeamColor(member.team_id)}, ${getTeamColor(member.team_id)}99)` }}>{member.full_name?.charAt(0)?.toUpperCase() || '?'}</div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 bg-green-400" style={{ borderColor: isDark ? '#12121a' : '#fff' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate" style={{ color: textColor }}>{member.full_name}</p>
            {member.role === 'admin' && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>ADMIN</span>
            )}
          </div>
          <p className="text-[11px] truncate" style={{ color: mutedColor }}>{getTeamName(member.team_id)}</p>
        </div>
        {/* Admin edit button */}
        {isAdmin && editingMember !== member.id && (
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); startEditing(member); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: isDark ? '#2a2a3a' : '#e5e2f0' }}
            title="Edit member login & details"
          >✏️</motion.button>
        )}
      </div>

      {/* Admin inline edit */}
      {isAdmin && editingMember === member.id ? (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          onClick={(e) => e.stopPropagation()}
          className="mb-3 space-y-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.04)', border: `1px solid ${borderColor}` }}
        >
          <div>
            <label className="text-[9px] font-medium block mb-1" style={{ color: mutedColor }}>Name</label>
            <input type="text" value={selectedName} onChange={e => setSelectedName(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none"
              style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
            />
          </div>
          <div>
            <label className="text-[9px] font-medium block mb-1" style={{ color: mutedColor }}>Phone (Login Number)</label>
            <input type="tel" value={selectedPhone} onChange={e => setSelectedPhone(e.target.value)}
              placeholder="10 digit mobile"
              className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none"
              style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
            />
          </div>
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
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>Team Members</h1>
          <p className="text-xs mt-1" style={{ color: mutedColor }}>{teamMembers.length} active members</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-md"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <span>＋</span> Add Member
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => useAppStore.getState().setActiveView('admin')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-md"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
            >
              <span>🛡️</span> Manage Team
            </motion.button>
          </div>
        )}
      </div>

      {/* Team Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setActiveTab('all')}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5"
          style={{
            background: activeTab === 'all' ? (isDark ? '#8b5cf625' : '#8b5cf615') : (isDark ? '#1e1e2d' : '#f4f4f5'),
            color: activeTab === 'all' ? '#8b5cf6' : mutedColor,
            border: `1px solid ${activeTab === 'all' ? '#8b5cf6' : 'transparent'}`
          }}
        >
          <span>All Teams</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: activeTab === 'all' ? '#8b5cf6' : (isDark ? '#2a2a3a' : '#e5e2f0'), color: activeTab === 'all' ? '#fff' : mutedColor }}>{teamMembers.length}</span>
        </motion.button>

        {teams.map(team => {
          const count = teamMembers.filter(m => m.team_id === team.id).length;
          return (
            <motion.button
              key={team.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(team.id)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5"
              style={{
                background: activeTab === team.id ? `${team.color}25` : (isDark ? '#1e1e2d' : '#f4f4f5'),
                color: activeTab === team.id ? team.color : mutedColor,
                border: `1px solid ${activeTab === team.id ? team.color : 'transparent'}`
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: team.color }} />
              <span>{team.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: activeTab === team.id ? team.color : (isDark ? '#2a2a3a' : '#e5e2f0'), color: activeTab === team.id ? '#fff' : mutedColor }}>{count}</span>
            </motion.button>
          );
        })}

        {teamMembers.some(m => !m.team_id) && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveTab('unassigned')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5"
            style={{
              background: activeTab === 'unassigned' ? (isDark ? '#71717a25' : '#71717a15') : (isDark ? '#1e1e2d' : '#f4f4f5'),
              color: activeTab === 'unassigned' ? '#71717a' : mutedColor,
              border: `1px solid ${activeTab === 'unassigned' ? '#71717a' : 'transparent'}`
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: '#71717a' }} />
            <span>Unassigned</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: activeTab === 'unassigned' ? '#71717a' : (isDark ? '#2a2a3a' : '#e5e2f0'), color: activeTab === 'unassigned' ? '#fff' : mutedColor }}>{teamMembers.filter(m => !m.team_id).length}</span>
          </motion.button>
        )}
      </div>

      {teamMembers.length === 0 && (
        <div className="text-center py-16">
          <span className="text-5xl">👥</span>
          <p className="text-sm mt-4" style={{ color: mutedColor }}>No team members yet. They will appear here when they log in or are added.</p>
        </div>
      )}

      {/* Team-wise Sections or Filtered Grid */}
      {activeTab === 'all' ? (
        <div className="space-y-8">
          {teams.map(team => {
            const membersInTeam = teamMembers.filter(m => m.team_id === team.id);
            if (membersInTeam.length === 0) return null;
            return (
              <div key={team.id} className="space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b" style={{ borderColor }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: team.color }} />
                  <h2 className="text-sm font-bold tracking-wide uppercase" style={{ color: textColor }}>{team.name}</h2>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${team.color}20`, color: team.color }}>{membersInTeam.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {membersInTeam.map((member, idx) => renderMemberCard(member, idx))}
                </div>
              </div>
            );
          })}
          {/* Unassigned Section */}
          {teamMembers.some(m => !m.team_id) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b" style={{ borderColor }}>
                <div className="w-3 h-3 rounded-full" style={{ background: '#71717a' }} />
                <h2 className="text-sm font-bold tracking-wide uppercase" style={{ color: textColor }}>Unassigned</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#71717a20', color: '#71717a' }}>{teamMembers.filter(m => !m.team_id).length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {teamMembers.filter(m => !m.team_id).map((member, idx) => renderMemberCard(member, idx))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teamMembers
            .filter(m => activeTab === 'unassigned' ? !m.team_id : m.team_id === activeTab)
            .map((member, idx) => renderMemberCard(member, idx))}
        </div>
      )}

      {/* Create Member Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl"
              style={{ background: isDark ? '#1a1a2e' : '#fff', border: `1px solid ${borderColor}`, color: textColor }}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">➕ Add Team Member</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleCreateMember} className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Full Name *</label>
                  <input type="text" value={newMemberForm.full_name} onChange={e => setNewMemberForm({ ...newMemberForm, full_name: e.target.value })}
                    placeholder="Enter full name"
                    required
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Phone Number (Login ID) *</label>
                  <input type="tel" value={newMemberForm.phone} onChange={e => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    required
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                  />
                  <p className="text-[10px] mt-1" style={{ color: mutedColor }}>Teammates will use this phone number to log in.</p>
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Email (Optional)</label>
                  <input type="email" value={newMemberForm.email} onChange={e => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Role</label>
                    <select value={newMemberForm.role} onChange={e => setNewMemberForm({ ...newMemberForm, role: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                      style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Team</label>
                    <select value={newMemberForm.team_id} onChange={e => setNewMemberForm({ ...newMemberForm, team_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                      style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                    >
                      <option value="">Unassigned</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button type="button" onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: mutedColor }}
                  >Cancel</button>
                  <motion.button whileTap={{ scale: 0.97 }} type="submit"
                    disabled={loading || !newMemberForm.full_name.trim() || !newMemberForm.phone.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >{loading ? 'Creating...' : 'Add Member'}</motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

