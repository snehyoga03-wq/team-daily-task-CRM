'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { useRequireAdmin } from '@/lib/useAdmin';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import * as dataService from '@/lib/dataService';
import { DbTeam, DbUser } from '@/lib/supabase';

type AdminTab = 'teams' | 'users' | 'overview' | 'settings';

// ─── Color presets for teams ────────────────────────────────────────
const TEAM_COLORS = [
  '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899',
  '#ef4444', '#3b82f6', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48',
];

export default function AdminView() {
  const isAdmin = useRequireAdmin();
  const { theme, tasks, leads, teamMembers, teams, setTeams, setTeamMembers } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const cardBg = isDark ? 'rgba(30,30,45,0.6)' : 'rgba(255,255,255,0.8)';
  const borderColor = isDark ? '#2a2a3a' : '#e5e2f0';

  const [activeTab, setActiveTab] = useState<AdminTab>('teams');
  const [allUsers, setAllUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(false);

  // ─── Modals ───────────────────────────────────────────────────────
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<DbTeam | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<DbUser | null>(null);

  // ─── Form state ───────────────────────────────────────────────────
  const [teamForm, setTeamForm] = useState({ name: '', description: '', color: '#8b5cf6' });
  const [userForm, setUserForm] = useState({ full_name: '', phone: '', email: '', role: 'member', team_id: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ─── Load all users (including inactive) ──────────────────────────
  const loadAllUsers = useCallback(async () => {
    try {
      const users = await dataService.fetchAllUsers();
      setAllUsers(users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const teamsData = await dataService.fetchTeams();
      setTeams(teamsData);
    } catch (err) {
      console.error('Failed to load teams:', err);
    }
  }, [setTeams]);

  useEffect(() => {
    if (isAdmin) {
      loadAllUsers();
      loadTeams();
    }
  }, [isAdmin, loadAllUsers, loadTeams]);

  if (!isAdmin) return null;

  // ─── Team CRUD handlers ───────────────────────────────────────────
  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) return;
    setLoading(true);
    try {
      await dataService.createTeam({
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || null,
        color: teamForm.color,
      });
      await loadTeams();
      setTeamForm({ name: '', description: '', color: '#8b5cf6' });
      setShowTeamModal(false);
    } catch (err) {
      console.error('Failed to create team:', err);
    }
    setLoading(false);
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam || !teamForm.name.trim()) return;
    setLoading(true);
    try {
      await dataService.updateTeam(editingTeam.id, {
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || null,
        color: teamForm.color,
      });
      await loadTeams();
      setEditingTeam(null);
      setShowTeamModal(false);
      setTeamForm({ name: '', description: '', color: '#8b5cf6' });
    } catch (err) {
      console.error('Failed to update team:', err);
    }
    setLoading(false);
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Delete this team? Members will be unassigned.')) return;
    setLoading(true);
    try {
      await dataService.deleteTeam(teamId);
      await loadTeams();
      await loadAllUsers();
      // Also refresh teamMembers in global store
      const members = await dataService.fetchTeamMembers();
      setTeamMembers(members);
    } catch (err) {
      console.error('Failed to delete team:', err);
    }
    setLoading(false);
  };

  const openEditTeam = (team: DbTeam) => {
    setEditingTeam(team);
    setTeamForm({ name: team.name, description: team.description || '', color: team.color });
    setShowTeamModal(true);
  };

  const openNewTeam = () => {
    setEditingTeam(null);
    setTeamForm({ name: '', description: '', color: '#8b5cf6' });
    setShowTeamModal(true);
  };

  // ─── User CRUD handlers ───────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!userForm.full_name.trim() || !userForm.phone.trim()) return;
    setLoading(true);
    try {
      const cleanPhone = userForm.phone.replace(/[\s\-\+]/g, '').replace(/^91/, '');
      await dataService.createUser({
        full_name: userForm.full_name.trim(),
        phone: cleanPhone,
        email: userForm.email.trim() || null,
        role: userForm.role,
        team_id: userForm.team_id || null,
        xp_points: 0,
        level: 1,
        streak_days: 0,
        is_active: true,
      });
      await loadAllUsers();
      const members = await dataService.fetchTeamMembers();
      setTeamMembers(members);
      setUserForm({ full_name: '', phone: '', email: '', role: 'member', team_id: '' });
      setShowUserModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
    setLoading(false);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !userForm.full_name.trim()) return;
    setLoading(true);
    try {
      await dataService.updateUser(editingUser.id, {
        full_name: userForm.full_name.trim(),
        email: userForm.email.trim() || null,
        role: userForm.role,
        team_id: userForm.team_id || null,
      });
      await loadAllUsers();
      const members = await dataService.fetchTeamMembers();
      setTeamMembers(members);
      setEditingUser(null);
      setShowUserModal(false);
      setUserForm({ full_name: '', phone: '', email: '', role: 'member', team_id: '' });
    } catch (err) {
      console.error('Failed to update user:', err);
    }
    setLoading(false);
  };

  const handleToggleUserStatus = async (user: DbUser) => {
    const action = user.is_active ? 'deactivate' : 'reactivate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.full_name}?`)) return;
    setLoading(true);
    try {
      if (user.is_active) {
        await dataService.deactivateUser(user.id);
      } else {
        await dataService.reactivateUser(user.id);
      }
      await loadAllUsers();
      const members = await dataService.fetchTeamMembers();
      setTeamMembers(members);
    } catch (err) {
      console.error(`Failed to ${action} user:`, err);
    }
    setLoading(false);
  };

  const openEditUser = (user: DbUser) => {
    setEditingUser(user);
    setUserForm({
      full_name: user.full_name,
      phone: user.phone || '',
      email: user.email || '',
      role: user.role,
      team_id: user.team_id || '',
    });
    setShowUserModal(true);
  };

  const openNewUser = () => {
    setEditingUser(null);
    setUserForm({ full_name: '', phone: '', email: '', role: 'member', team_id: '' });
    setShowUserModal(true);
  };

  // ─── Filters ──────────────────────────────────────────────────────
  const filteredUsers = allUsers.filter((u) => {
    if (searchQuery && !u.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (filterStatus === 'active' && !u.is_active) return false;
    if (filterStatus === 'inactive' && u.is_active) return false;
    return true;
  });

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'Unassigned';
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  const getTeamColor = (teamId: string | null) => {
    if (!teamId) return '#71717a';
    const team = teams.find(t => t.id === teamId);
    return team?.color || '#71717a';
  };

  const getMemberCount = (teamId: string) => {
    return allUsers.filter(u => u.team_id === teamId && u.is_active).length;
  };

  // ─── Stats ────────────────────────────────────────────────────────
  const stats = {
    totalUsers: allUsers.length,
    activeUsers: allUsers.filter(u => u.is_active).length,
    inactiveUsers: allUsers.filter(u => !u.is_active).length,
    totalTeams: teams.length,
    totalTasks: tasks.length,
    doneTasks: tasks.filter(t => t.status === 'done').length,
    inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
    todoTasks: tasks.filter(t => t.status === 'todo').length,
    totalLeads: leads.length,
    admins: allUsers.filter(u => u.role === 'admin').length,
  };

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'teams', label: 'Teams', icon: '🏢' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))',
            }}>
              <span className="text-xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: textColor }}>Admin Panel</h1>
              <p className="text-xs" style={{ color: mutedColor }}>Manage teams, users, and workspace settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: isDark ? 'rgba(30,30,45,0.5)' : 'rgba(240,238,250,0.7)' }}>
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all relative"
            style={{
              color: activeTab === tab.id ? textColor : mutedColor,
              background: activeTab === tab.id ? (isDark ? 'rgba(139,92,246,0.15)' : '#fff') : 'transparent',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(139,92,246,0.12)' : 'none',
            }}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="admin-tab" className="absolute inset-0 rounded-xl" style={{
                border: '1px solid rgba(139,92,246,0.2)',
              }} />
            )}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {activeTab === 'teams' && renderTeamsTab()}
          {activeTab === 'users' && renderUsersTab()}
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </motion.div>
      </AnimatePresence>

      {/* Team Modal */}
      <AnimatePresence>
        {showTeamModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowTeamModal(false)}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl p-6 space-y-5"
              style={{ background: isDark ? '#1a1a2e' : '#fff', border: `1px solid ${borderColor}` }}
            >
              <h2 className="text-lg font-bold" style={{ color: textColor }}>
                {editingTeam ? '✏️ Edit Team' : '➕ Create Team'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Team Name *</label>
                  <input type="text" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })}
                    placeholder="e.g. Marketing"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Description</label>
                  <input type="text" value={teamForm.description} onChange={e => setTeamForm({ ...teamForm, description: e.target.value })}
                    placeholder="What does this team do?"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {TEAM_COLORS.map(color => (
                      <motion.button key={color} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setTeamForm({ ...teamForm, color })}
                        className="w-8 h-8 rounded-xl transition-all"
                        style={{
                          background: color,
                          border: teamForm.color === color ? '3px solid #fff' : '2px solid transparent',
                          boxShadow: teamForm.color === color ? `0 0 0 2px ${color}` : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowTeamModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: mutedColor }}
                >Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                  disabled={loading || !teamForm.name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
                >{loading ? '...' : (editingTeam ? 'Save Changes' : 'Create Team')}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Modal */}
      <AnimatePresence>
        {showUserModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowUserModal(false)}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl p-6 space-y-5"
              style={{ background: isDark ? '#1a1a2e' : '#fff', border: `1px solid ${borderColor}` }}
            >
              <h2 className="text-lg font-bold" style={{ color: textColor }}>
                {editingUser ? '✏️ Edit User' : '➕ Add Member'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Full Name *</label>
                  <input type="text" value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Phone Number *</label>
                  <input type="tel" value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    disabled={!!editingUser}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                    style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Email</label>
                  <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Role</label>
                    <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                      style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>Team</label>
                    <select value={userForm.team_id} onChange={e => setUserForm({ ...userForm, team_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                      style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                    >
                      <option value="">No Team</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowUserModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: mutedColor }}
                >Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={editingUser ? handleUpdateUser : handleCreateUser}
                  disabled={loading || !userForm.full_name.trim() || (!editingUser && !userForm.phone.trim())}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
                >{loading ? '...' : (editingUser ? 'Save Changes' : 'Add Member')}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════
  // TAB: Teams Management
  // ═══════════════════════════════════════════════════════════════════
  function renderTeamsTab() {
    return (
      <div className="space-y-5">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: mutedColor }}>{teams.length} teams</p>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={openNewTeam}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
          >
            <span>＋</span> Create Team
          </motion.button>
        </div>

        {/* Team Grid */}
        {teams.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-2xl">
            <span className="text-5xl">🏢</span>
            <p className="text-sm mt-4" style={{ color: mutedColor }}>No teams yet. Create your first team!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team, i) => (
              <motion.div key={team.id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-5 space-y-4 group cursor-pointer transition-all"
                style={{
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Team Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: `linear-gradient(135deg, ${team.color}, ${team.color}99)` }}
                    >
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: textColor }}>{team.name}</p>
                      <p className="text-[10px]" style={{ color: mutedColor }}>{team.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => openEditTeam(team)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{ background: isDark ? '#2a2a3a' : '#e5e2f0' }}
                    >✏️</motion.button>
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteTeam(team.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{ background: 'rgba(244,63,94,0.1)' }}
                    >🗑️</motion.button>
                  </div>
                </div>

                {/* Member Count */}
                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor }}>
                  <div className="flex -space-x-2">
                    {allUsers.filter(u => u.team_id === team.id && u.is_active).slice(0, 4).map(u => (
                      <div key={u.id} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] text-white font-bold"
                        style={{ background: team.color, borderColor: isDark ? '#1a1a2e' : '#fff' }}
                      >{u.full_name.charAt(0)}</div>
                    ))}
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: mutedColor }}>
                    {getMemberCount(team.id)} member{getMemberCount(team.id) !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Color Strip */}
                <div className="h-1 rounded-full" style={{ background: `linear-gradient(to right, ${team.color}, ${team.color}33)` }} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAB: Users Management
  // ═══════════════════════════════════════════════════════════════════
  function renderUsersTab() {
    return (
      <div className="space-y-5">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Search users..."
                className="w-full px-4 py-2 rounded-xl text-xs outline-none"
                style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
              />
            </div>
            {/* Role Filter */}
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs outline-none appearance-none cursor-pointer"
              style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
            {/* Status Filter */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs outline-none appearance-none cursor-pointer"
              style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={openNewUser}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
          >
            <span>＋</span> Add Member
          </motion.button>
        </div>

        {/* User List */}
        <div className="space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-2xl">
              <span className="text-5xl">👥</span>
              <p className="text-sm mt-4" style={{ color: mutedColor }}>No users found</p>
            </div>
          ) : (
            filteredUsers.map((user, i) => (
              <motion.div key={user.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 rounded-2xl group transition-all"
                style={{
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  backdropFilter: 'blur(20px)',
                  opacity: user.is_active ? 1 : 0.6,
                }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${getTeamColor(user.team_id)}, ${getTeamColor(user.team_id)}99)` }}
                  >{user.full_name?.charAt(0)?.toUpperCase() || '?'}</div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{
                      background: user.is_active ? '#10b981' : '#ef4444',
                      borderColor: isDark ? '#1a1a2e' : '#fff',
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: textColor }}>{user.full_name}</p>
                    {user.id === currentUser?.id && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {user.phone && <span className="text-[10px]" style={{ color: mutedColor }}>📱 {user.phone}</span>}
                    {user.email && <span className="text-[10px]" style={{ color: mutedColor }}>✉️ {user.email}</span>}
                  </div>
                </div>

                {/* Team Badge */}
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                    style={{ background: `${getTeamColor(user.team_id)}15`, color: getTeamColor(user.team_id) }}
                  >{getTeamName(user.team_id)}</span>
                </div>

                {/* Role Badge */}
                <span className="text-[10px] px-2.5 py-1 rounded-full font-medium capitalize"
                  style={{
                    background: user.role === 'admin' ? 'rgba(139,92,246,0.12)' : 'rgba(6,182,212,0.12)',
                    color: user.role === 'admin' ? '#8b5cf6' : '#06b6d4',
                  }}
                >{user.role === 'admin' ? '🛡️ Admin' : 'Member'}</span>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <motion.button whileTap={{ scale: 0.9 }}
                    onClick={() => openEditUser(user)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: isDark ? '#2a2a3a' : '#e5e2f0' }}
                    title="Edit user"
                  >✏️</motion.button>
                  {user.id !== currentUser?.id && (
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => handleToggleUserStatus(user)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                      style={{ background: user.is_active ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)' }}
                      title={user.is_active ? 'Deactivate' : 'Reactivate'}
                    >{user.is_active ? '🚫' : '✅'}</motion.button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Summary */}
        <p className="text-[10px] text-center" style={{ color: mutedColor }}>
          Showing {filteredUsers.length} of {allUsers.length} users
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAB: System Overview
  // ═══════════════════════════════════════════════════════════════════
  function renderOverviewTab() {
    const statCards = [
      { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: '#8b5cf6', sub: `${stats.admins} admins` },
      { label: 'Active Users', value: stats.activeUsers, icon: '🟢', color: '#10b981', sub: `${stats.inactiveUsers} inactive` },
      { label: 'Teams', value: stats.totalTeams, icon: '🏢', color: '#06b6d4', sub: 'groups' },
      { label: 'Total Tasks', value: stats.totalTasks, icon: '✅', color: '#f59e0b', sub: `${stats.doneTasks} completed` },
      { label: 'In Progress', value: stats.inProgressTasks, icon: '⏳', color: '#3b82f6', sub: 'tasks' },
      { label: 'Total Leads', value: stats.totalLeads, icon: '🎯', color: '#ec4899', sub: 'CRM pipeline' },
    ];

    return (
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-4 text-center"
              style={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                backdropFilter: 'blur(20px)',
              }}
            >
              <span className="text-2xl">{stat.icon}</span>
              <p className="text-2xl font-bold mt-2" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[11px] font-semibold" style={{ color: textColor }}>{stat.label}</p>
              <p className="text-[9px] mt-0.5" style={{ color: mutedColor }}>{stat.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Task Status Breakdown */}
        <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${borderColor}`, backdropFilter: 'blur(20px)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>📊 Task Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'To Do', count: stats.todoTasks, color: '#6366f1', percent: stats.totalTasks ? Math.round((stats.todoTasks / stats.totalTasks) * 100) : 0 },
              { label: 'In Progress', count: stats.inProgressTasks, color: '#f59e0b', percent: stats.totalTasks ? Math.round((stats.inProgressTasks / stats.totalTasks) * 100) : 0 },
              { label: 'Done', count: stats.doneTasks, color: '#10b981', percent: stats.totalTasks ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0 },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs font-medium w-24" style={{ color: textColor }}>{item.label}</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: isDark ? '#1e1e2e' : '#e5e2f0' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.percent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}99)` }}
                  />
                </div>
                <span className="text-xs font-bold w-12 text-right" style={{ color: item.color }}>{item.count}</span>
                <span className="text-[10px] w-10 text-right" style={{ color: mutedColor }}>{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Members per Team */}
        <div className="rounded-2xl p-5" style={{ background: cardBg, border: `1px solid ${borderColor}`, backdropFilter: 'blur(20px)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>🏢 Members per Team</h3>
          <div className="space-y-3">
            {teams.map(team => {
              const count = getMemberCount(team.id);
              const maxCount = Math.max(...teams.map(t => getMemberCount(t.id)), 1);
              return (
                <div key={team.id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: team.color }} />
                  <span className="text-xs font-medium w-24 truncate" style={{ color: textColor }}>{team.name}</span>
                  <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: isDark ? '#1e1e2e' : '#e5e2f0' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxCount) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${team.color}, ${team.color}66)` }}
                    />
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{ color: team.color }}>{count}</span>
                </div>
              );
            })}
            {/* Unassigned */}
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: '#71717a' }} />
              <span className="text-xs font-medium w-24 truncate" style={{ color: mutedColor }}>Unassigned</span>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: isDark ? '#1e1e2e' : '#e5e2f0' }}>
                <motion.div initial={{ width: 0 }}
                  animate={{ width: `${(allUsers.filter(u => !u.team_id && u.is_active).length / Math.max(...teams.map(t => getMemberCount(t.id)), 1)) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #71717a, #71717a66)' }}
                />
              </div>
              <span className="text-xs font-bold w-10 text-right" style={{ color: '#71717a' }}>
                {allUsers.filter(u => !u.team_id && u.is_active).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAB: Admin Settings
  // ═══════════════════════════════════════════════════════════════════
  function renderSettingsTab() {
    return (
      <div className="space-y-5 max-w-xl">
        {/* Workspace */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: cardBg, border: `1px solid ${borderColor}`, backdropFilter: 'blur(20px)' }}>
          <h3 className="text-sm font-semibold" style={{ color: textColor }}>🏢 Workspace Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: textColor }}>Workspace Name</p>
                <p className="text-[11px]" style={{ color: mutedColor }}>SnehYoga Team CRM</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Active</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: textColor }}>Default Role for New Users</p>
                <p className="text-[11px]" style={{ color: mutedColor }}>New users who sign up get this role</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>Member</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: textColor }}>Self-Registration</p>
                <p className="text-[11px]" style={{ color: mutedColor }}>Anyone with name + phone can join</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>Enabled</span>
            </div>
          </div>
        </div>

        {/* Database Info */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: cardBg, border: `1px solid ${borderColor}`, backdropFilter: 'blur(20px)' }}>
          <h3 className="text-sm font-semibold" style={{ color: textColor }}>🗄️ Database</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: textColor }}>Backend</p>
                <p className="text-[11px]" style={{ color: mutedColor }}>Supabase (PostgreSQL)</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: textColor }}>Realtime</p>
                <p className="text-[11px]" style={{ color: mutedColor }}>Tasks, Leads, Messages, Notifications</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Active</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: textColor }}>RLS Policies</p>
                <p className="text-[11px]" style={{ color: mutedColor }}>Open for internal team use</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>Open</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(244,63,94,0.03)', border: '1px solid rgba(244,63,94,0.15)' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#f43f5e' }}>⚠️ Danger Zone</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: textColor }}>Export All Data</p>
                <p className="text-[11px]" style={{ color: mutedColor }}>Download all workspace data as JSON</p>
              </div>
              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.1)' }}>Export</button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: textColor }}>Reset Workspace</p>
                <p className="text-[11px]" style={{ color: mutedColor }}>Delete all data and start fresh</p>
              </div>
              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.1)' }}>Reset</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
