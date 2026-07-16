'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore, cleanPhoneNumber } from '@/lib/auth';
import { useRequireAdmin } from '@/lib/useAdmin';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import * as dataService from '@/lib/dataService';
import { DbTeam, DbUser } from '@/lib/supabase';
import { getWhatsAppConfig, saveWhatsAppConfig, loadWhatsAppConfigRemote, saveWhatsAppConfigRemote, sendWhatsAppReminder, fetchWhatsAppTemplates, cleanTemplateName, WhatsAppConfig, WhatsAppTemplate } from '@/lib/whatsapp';



type AdminTab = 'teams' | 'users' | 'kpi' | 'overview' | 'settings';

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

  // ─── KPI Calculator & Tracker State ───────────────────────────────
  const [kpiPodcastsWeek, setKpiPodcastsWeek] = useState<number>(2);
  const [kpiPodcastsMonth, setKpiPodcastsMonth] = useState<number>(8);
  const [kpiSearch, setKpiSearch] = useState('');
  const [kpiTeamFilter, setKpiTeamFilter] = useState('all');
  const [kpiSortBy, setKpiSortBy] = useState<'score' | 'tasks' | 'reels'>('score');
  const [selectedKpiUser, setSelectedKpiUser] = useState<DbUser | null>(null);
  const [kpiViewMode, setKpiViewMode] = useState<'live' | 'guidelines'>('live');

  // ─── Modals ───────────────────────────────────────────────────────
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<DbTeam | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<DbUser | null>(null);
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState<DbTeam | null>(null);
  const [assigningUserId, setAssigningUserId] = useState<string>('');

  // ─── Form state ───────────────────────────────────────────────────
  const [teamForm, setTeamForm] = useState({ name: '', description: '', color: '#8b5cf6' });
  const [userForm, setUserForm] = useState({ full_name: '', phone: '', email: '', role: 'member', team_id: '', tag: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ─── WhatsApp Integration & Reminder Sandbox State ─────────────────
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>({
    accessToken: '',
    phoneId: '',
    templateName: 'daily_yoga_05',
    languageCode: 'en',
    enabled: true,
  });
  const [waShowToken, setWaShowToken] = useState(false);
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestMessage, setWaTestMessage] = useState("Reminder: Please complete your daily CRM tasks by 5:00 PM!");
  const [waTesting, setWaTesting] = useState(false);
  const [waTestResult, setWaTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [waSavedToast, setWaSavedToast] = useState(false);
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplate[]>([]);
  const [waFetchingTemplates, setWaFetchingTemplates] = useState(false);
  const [waTemplateError, setWaTemplateError] = useState<string | null>(null);
  const [waNoParams, setWaNoParams] = useState(false);



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
      loadWhatsAppConfigRemote().then(cfg => {
        setWaConfig(cfg);
      });
      if (currentUser?.phone) {
        setWaTestPhone(currentUser.phone);
      }
    }
  }, [isAdmin, loadAllUsers, loadTeams, currentUser]);


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
      if (selectedTeamForMembers?.id === teamId) {
        setSelectedTeamForMembers(null);
      }
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

  const handleAssignUserToTeam = async () => {
    if (!assigningUserId || !selectedTeamForMembers) return;
    setLoading(true);
    try {
      await dataService.updateUser(assigningUserId, { team_id: selectedTeamForMembers.id });
      await loadAllUsers();
      const members = await dataService.fetchTeamMembers();
      setTeamMembers(members);
      setAssigningUserId('');
    } catch (err) {
      console.error('Failed to assign user to team:', err);
    }
    setLoading(false);
  };

  const handleRemoveFromTeam = async (user: DbUser) => {
    if (!confirm(`Remove ${user.full_name} from this team?`)) return;
    setLoading(true);
    try {
      await dataService.updateUser(user.id, { team_id: null });
      await loadAllUsers();
      const members = await dataService.fetchTeamMembers();
      setTeamMembers(members);
    } catch (err) {
      console.error('Failed to remove user from team:', err);
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
      const cleanPhone = cleanPhoneNumber(userForm.phone);
      await dataService.createUser({
        full_name: userForm.full_name.trim(),
        phone: cleanPhone,
        email: userForm.email.trim() || null,
        role: userForm.role,
        team_id: userForm.team_id || null,
        tag: userForm.tag.trim() || null,
        xp_points: 0,
        level: 1,
        streak_days: 0,
        is_active: true,
      });
      await loadAllUsers();
      const members = await dataService.fetchTeamMembers();
      setTeamMembers(members);
      setUserForm({ full_name: '', phone: '', email: '', role: 'member', team_id: '', tag: '' });
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
      const updates: Record<string, any> = {
        full_name: userForm.full_name.trim(),
        email: userForm.email.trim() || null,
        role: userForm.role,
        team_id: userForm.team_id || null,
        tag: userForm.tag.trim() || null,
      };
      if (userForm.phone.trim()) {
        updates.phone = cleanPhoneNumber(userForm.phone);
      }
      await dataService.updateUser(editingUser.id, updates);
      await loadAllUsers();
      const members = await dataService.fetchTeamMembers();
      setTeamMembers(members);
      setEditingUser(null);
      setShowUserModal(false);
      setUserForm({ full_name: '', phone: '', email: '', role: 'member', team_id: '', tag: '' });
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
      tag: user.tag || '',
    });
    setShowUserModal(true);
  };

  const openNewUser = () => {
    setEditingUser(null);
    setUserForm({ full_name: '', phone: '', email: '', role: 'member', team_id: '', tag: '' });
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

  // ─── User-Wise KPI Calculation Logic ──────────────────────────────
  const getUserKpiMetrics = (user: DbUser) => {
    const userTasks = tasks.filter(t => t.assignee_id === user.id);
    const totalTasks = userTasks.length;
    const doneTasks = userTasks.filter(t => t.status === 'done');
    const inProgressTasks = userTasks.filter(t => t.status === 'in_progress');
    const todoTasks = userTasks.filter(t => t.status === 'todo' || t.status === 'review');
    
    // Overdue calculation
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const overdueTasks = userTasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < todayStr);
    
    // Content / Reel calculation (checking title and tags)
    let completedReels = 0;
    let completedPodcasts = 0;
    
    doneTasks.forEach(t => {
      const titleLower = t.title.toLowerCase();
      const tagsLower = (t.tags || []).map(tag => tag.toLowerCase());
      
      if (titleLower.includes('podcast') || tagsLower.some(tag => tag.includes('podcast'))) {
        completedPodcasts += 1;
      } else if (titleLower.includes('reel') || titleLower.includes('video') || titleLower.includes('short') || tagsLower.some(tag => tag.includes('reel') || tag.includes('video'))) {
        completedReels += 1;
      } else {
        // General completed tasks count towards content output if they have content-related tags
        if (tagsLower.some(tag => tag.includes('content') || tag.includes('edit') || tag.includes('media'))) {
          completedReels += 1;
        }
      }
    });
    
    // Apply conversion rule: 1 Podcast = 4 Reels
    const effectiveReels = completedReels + (completedPodcasts * 4);
    const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;
    
    // Calculate KPI Efficiency Score (0 - 100%)
    const kpiScore = totalTasks === 0 && effectiveReels === 0 
      ? 0 
      : Math.min(100, Math.round((completionRate * 0.6) + Math.min(100, (effectiveReels / 6) * 40)));
    
    return {
      totalTasks,
      doneCount: doneTasks.length,
      inProgressCount: inProgressTasks.length,
      todoCount: todoTasks.length,
      overdueCount: overdueTasks.length,
      completedReels,
      completedPodcasts,
      effectiveReels,
      completionRate,
      kpiScore,
      userTasks,
      doneTasks,
      pendingTasks: [...inProgressTasks, ...todoTasks],
      overdueTasks,
    };
  };

  // ─── WhatsApp Handlers ─────────────────────────────────────────────
  const handleSaveWhatsAppConfig = () => {
    saveWhatsAppConfigRemote(waConfig);
    setWaSavedToast(true);
    setTimeout(() => setWaSavedToast(false), 3000);
  };


  const handleFetchTemplates = async () => {
    if (!waConfig.accessToken || !waConfig.phoneId) {
      setWaTemplateError('Please enter your WhatsApp Access Token and Phone Number ID first.');
      return;
    }
    setWaFetchingTemplates(true);
    setWaTemplateError(null);
    try {
      const res = await fetchWhatsAppTemplates(waConfig);
      setWaTemplates(res.templates || []);
    } catch (err: any) {
      setWaTemplateError(err.message || 'Failed to fetch templates from Meta Cloud API');
    }
    setWaFetchingTemplates(false);
  };

  const handleTestWhatsApp = async () => {

    if (!waTestPhone.trim()) {
      setWaTestResult({ success: false, message: 'Please enter a test recipient phone number (e.g. 919876543210)' });
      return;
    }
    setWaTesting(true);
    setWaTestResult(null);
    try {
      const res = await sendWhatsAppReminder(
        waTestPhone.trim(),
        waNoParams ? '' : (waTestMessage.trim() || 'Test reminder from CRM'),
        waConfig
      );

      setWaTestResult({
        success: true,
        message: `Template "${waConfig.templateName || 'daily_yoga_05'}" reminder sent successfully via Meta Cloud API!`,
        details: res,
      });
    } catch (err: any) {
      setWaTestResult({
        success: false,
        message: err.message || 'Failed to send WhatsApp reminder template',
      });
    }
    setWaTesting(false);
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
    { id: 'kpi', label: 'KPIs & Targets', icon: '🎯' },
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
      <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto" style={{ background: isDark ? 'rgba(30,30,45,0.5)' : 'rgba(240,238,250,0.7)' }}>
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all relative whitespace-nowrap"
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
          {activeTab === 'kpi' && renderKpiTab()}
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </motion.div>
      </AnimatePresence>

      {/* Team Modal */}
      <AnimatePresence>
        {showTeamModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
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
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
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
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
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
                <div>
                  <label className="text-[11px] font-medium block mb-1.5" style={{ color: mutedColor }}>User Tag / Member Code (e.g. SM-02)</label>
                  <input type="text" value={userForm.tag || ''} onChange={e => setUserForm({ ...userForm, tag: e.target.value })}
                    placeholder="e.g. SM-02, SM-03, SM-04"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-mono uppercase font-bold"
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
                  disabled={loading || !userForm.full_name.trim() || !userForm.phone.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
                >{loading ? '...' : (editingUser ? 'Save Changes' : 'Add Member')}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Selected User KPI & Task Breakdown Modal ───────────────── */}
      <AnimatePresence>
        {selectedKpiUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedKpiUser(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col overflow-hidden border"
              style={{ background: isDark ? '#181824' : '#ffffff', borderColor }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b flex-shrink-0" style={{ borderColor }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow"
                    style={{ background: `linear-gradient(135deg, ${getTeamColor(selectedKpiUser.team_id)}, ${getTeamColor(selectedKpiUser.team_id)}99)` }}
                  >
                    {selectedKpiUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2 flex-wrap" style={{ color: textColor }}>
                      <span>{selectedKpiUser.full_name}</span>
                      {selectedKpiUser.tag && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {selectedKpiUser.tag}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${getTeamColor(selectedKpiUser.team_id)}20`, color: getTeamColor(selectedKpiUser.team_id) }}>
                        {getTeamName(selectedKpiUser.team_id)}
                      </span>
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: mutedColor }}>
                      Level {selectedKpiUser.level || 1} • {selectedKpiUser.xp_points || 0} XP
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedKpiUser(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-colors hover:bg-gray-500/20"
                  style={{ color: mutedColor }}
                >✕</button>
              </div>

              {/* KPI Score Overview Bar */}
              {(() => {
                const m = getUserKpiMetrics(selectedKpiUser);
                return (
                  <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">KPI Score</p>
                        <p className="text-2xl font-black text-purple-400 mt-1">{m.kpiScore}%</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Done Tasks</p>
                        <p className="text-2xl font-black text-emerald-400 mt-1">{m.doneCount} / {m.totalTasks}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Content Output</p>
                        <p className="text-2xl font-black text-cyan-400 mt-1">{m.effectiveReels} Eq.</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Overdue</p>
                        <p className="text-2xl font-black text-rose-400 mt-1">{m.overdueCount}</p>
                      </div>
                    </div>

                    {/* Content Rules Summary */}
                    <div className="p-3.5 rounded-2xl border flex items-center justify-between text-xs" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor }}>
                      <span style={{ color: mutedColor }}>Reels Completed: <strong style={{ color: textColor }}>{m.completedReels}</strong></span>
                      <span style={{ color: mutedColor }}>Podcasts Completed: <strong style={{ color: textColor }}>{m.completedPodcasts}</strong> (x4 = {m.completedPodcasts * 4} reels)</span>
                    </div>

                    {/* Task Lists */}
                    <div className="space-y-4">
                      {/* Overdue Tasks List */}
                      {m.overdueTasks.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-extrabold text-rose-500 flex items-center gap-1.5 uppercase tracking-wider">
                            <span>⚠️ Overdue Tasks ({m.overdueTasks.length})</span>
                          </h4>
                          <div className="space-y-2">
                            {m.overdueTasks.map(t => (
                              <div key={t.id} className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between text-xs">
                                <div>
                                  <p className="font-bold text-rose-300">{t.title}</p>
                                  <p className="text-[10px] text-rose-400 mt-0.5">Due: {t.due_date} • {t.priority.toUpperCase()}</p>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">OVERDUE</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Active / Pending Tasks */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold flex items-center gap-1.5 uppercase tracking-wider" style={{ color: textColor }}>
                          <span>⏳ Active & Pending Tasks ({m.pendingTasks.length})</span>
                        </h4>
                        {m.pendingTasks.length === 0 ? (
                          <p className="text-xs italic py-2" style={{ color: mutedColor }}>No pending tasks assigned.</p>
                        ) : (
                          <div className="space-y-2">
                            {m.pendingTasks.map(t => (
                              <div key={t.id} className="p-3 rounded-xl border flex items-center justify-between text-xs" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderColor }}>
                                <div>
                                  <p className="font-semibold" style={{ color: textColor }}>{t.title}</p>
                                  <p className="text-[10px] mt-0.5" style={{ color: mutedColor }}>
                                    Status: <span className="uppercase font-bold text-amber-500">{t.status.replace('_', ' ')}</span> {t.due_date && `• Due: ${t.due_date}`}
                                  </p>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: `${borderColor}`, color: mutedColor }}>
                                  {t.priority}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Completed Tasks */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold text-emerald-500 flex items-center gap-1.5 uppercase tracking-wider">
                          <span>✅ Completed Tasks ({m.doneTasks.length})</span>
                        </h4>
                        {m.doneTasks.length === 0 ? (
                          <p className="text-xs italic py-2" style={{ color: mutedColor }}>No completed tasks yet.</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {m.doneTasks.map(t => {
                              const isPod = t.title.toLowerCase().includes('podcast') || t.tags?.some(tag => tag.toLowerCase().includes('podcast'));
                              const isReel = !isPod && (t.title.toLowerCase().includes('reel') || t.title.toLowerCase().includes('video') || t.tags?.some(tag => tag.toLowerCase().includes('reel') || tag.toLowerCase().includes('video')));
                              return (
                                <div key={t.id} className="p-3 rounded-xl border flex items-center justify-between text-xs opacity-80" style={{ background: isDark ? 'rgba(16,185,129,0.05)' : '#f0fdf4', borderColor: isDark ? 'rgba(16,185,129,0.2)' : '#bbf7d0' }}>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium line-through truncate" style={{ color: textColor }}>{t.title}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[10px] text-emerald-500 font-semibold">Done</span>
                                      {isPod && <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-400 font-bold">🎙️ Podcast (+4 Eq)</span>}
                                      {isReel && <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-400 font-bold">🎬 Reel</span>}
                                    </div>
                                  </div>
                                  <span className="text-emerald-500 font-bold text-sm ml-2">✓</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 border-t flex justify-end flex-shrink-0" style={{ borderColor }}>
                <button
                  onClick={() => setSelectedKpiUser(null)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
                >
                  Close Breakdown
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Selected Team Members & Management Modal ───────────────── */}
      <AnimatePresence>
        {selectedTeamForMembers && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedTeamForMembers(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          >
            {(() => {
              const currentTeam = teams.find(t => t.id === selectedTeamForMembers.id) || selectedTeamForMembers;
              const teamMembersList = allUsers.filter(u => u.team_id === currentTeam.id);
              const activeMembersCount = teamMembersList.filter(u => u.is_active).length;
              const availableUsersToAdd = allUsers.filter(u => u.team_id !== currentTeam.id && u.is_active);
              const teamTasksCount = tasks.filter(t => teamMembersList.some(m => m.id === t.assignee_id)).length;

              return (
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                  onClick={e => e.stopPropagation()}
                  className="w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col overflow-hidden border"
                  style={{ background: isDark ? '#181824' : '#ffffff', borderColor }}
                >
                  {/* Modal Header Banner */}
                  <div className="flex items-center justify-between pb-4 border-b flex-shrink-0" style={{ borderColor }}>
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${currentTeam.color}, ${currentTeam.color}99)` }}
                      >
                        {currentTeam.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold truncate" style={{ color: textColor }}>{currentTeam.name}</h3>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                            style={{ background: `${currentTeam.color}20`, color: currentTeam.color }}
                          >
                            Team
                          </span>
                        </div>
                        <p className="text-xs mt-1 truncate" style={{ color: mutedColor }}>
                          {currentTeam.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => openEditTeam(currentTeam)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                        style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: textColor }}
                      >
                        <span>✏️</span> <span className="hidden sm:inline">Edit Team</span>
                      </motion.button>
                      <button
                        onClick={() => setSelectedTeamForMembers(null)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-colors hover:bg-gray-500/20"
                        style={{ color: mutedColor }}
                      >✕</button>
                    </div>
                  </div>

                  {/* Stats Summary Bar */}
                  <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                    <div className="p-3 rounded-2xl border text-center" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderColor }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedColor }}>Total Members</p>
                      <p className="text-xl font-black mt-0.5" style={{ color: currentTeam.color }}>{teamMembersList.length}</p>
                    </div>
                    <div className="p-3 rounded-2xl border text-center" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderColor }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedColor }}>Active Members</p>
                      <p className="text-xl font-black text-emerald-500 mt-0.5">{activeMembersCount}</p>
                    </div>
                    <div className="p-3 rounded-2xl border text-center" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderColor }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedColor }}>Assigned Tasks</p>
                      <p className="text-xl font-black text-amber-500 mt-0.5">{teamTasksCount}</p>
                    </div>
                  </div>

                  {/* Add Member Bar */}
                  <div className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0"
                    style={{ background: isDark ? 'rgba(139,92,246,0.05)' : '#f5f3ff', borderColor: isDark ? 'rgba(139,92,246,0.2)' : '#ddd6fe' }}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm">➕</span>
                      <select
                        value={assigningUserId}
                        onChange={e => setAssigningUserId(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl text-xs outline-none cursor-pointer border"
                        style={{ background: isDark ? '#12121a' : '#ffffff', color: textColor, borderColor }}
                      >
                        <option value="">Assign existing user to team...</option>
                        {availableUsersToAdd.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name} ({u.role}) - {getTeamName(u.team_id)}</option>
                        ))}
                      </select>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleAssignUserToTeam}
                        disabled={!assigningUserId || loading}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40"
                        style={{ background: currentTeam.color }}
                      >
                        Assign
                      </motion.button>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setEditingUser(null);
                        setUserForm({ full_name: '', phone: '', email: '', role: 'member', team_id: currentTeam.id, tag: '' });
                        setShowUserModal(true);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
                      style={{ background: isDark ? '#1e1e2e' : '#fff', color: textColor, borderColor }}
                    >
                      <span>✨</span> New Member
                    </motion.button>
                  </div>

                  {/* Members List */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider flex items-center justify-between" style={{ color: mutedColor }}>
                      <span>Team Members ({teamMembersList.length})</span>
                      <span className="text-[10px] font-normal">Click actions to edit member right here</span>
                    </h4>

                    {teamMembersList.length === 0 ? (
                      <div className="text-center py-10 rounded-2xl border border-dashed" style={{ borderColor }}>
                        <span className="text-3xl">👥</span>
                        <p className="text-xs font-medium mt-2" style={{ color: mutedColor }}>No members in this team yet.</p>
                        <p className="text-[11px] mt-0.5" style={{ color: mutedColor }}>Use the box above to assign existing users or create a new member.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {teamMembersList.map(member => (
                          <div key={member.id}
                            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all hover:shadow-md"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                              borderColor,
                              opacity: member.is_active ? 1 : 0.6,
                            }}
                          >
                            {/* Member Info */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow"
                                  style={{ background: `linear-gradient(135deg, ${currentTeam.color}, ${currentTeam.color}88)` }}
                                >
                                  {member.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                  style={{
                                    background: member.is_active ? '#10b981' : '#ef4444',
                                    borderColor: isDark ? '#181824' : '#fff',
                                  }}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-bold truncate flex items-center gap-1.5" style={{ color: textColor }}>
                                    <span>{member.full_name}</span>
                                    {member.tag && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                        {member.tag}
                                      </span>
                                    )}
                                  </p>
                                  <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase"
                                    style={{
                                      background: member.role === 'admin' ? 'rgba(139,92,246,0.15)' : 'rgba(6,182,212,0.15)',
                                      color: member.role === 'admin' ? '#8b5cf6' : '#06b6d4',
                                    }}
                                  >
                                    {member.role === 'admin' ? '🛡️ Admin' : 'Member'}
                                  </span>
                                  {!member.is_active && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold">INACTIVE</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[11px] truncate flex-wrap" style={{ color: mutedColor }}>
                                  {member.phone && <span>📱 {member.phone}</span>}
                                  {member.email && <span>✉️ {member.email}</span>}
                                  <span>⭐ Level {member.level || 1} ({member.xp_points || 0} XP)</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions ("able to edit here itself") */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => openEditUser(member)}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                                style={{ background: isDark ? '#2a2a3a' : '#f1f5f9', color: textColor }}
                                title="Edit user details"
                              >
                                <span>✏️</span> <span className="hidden md:inline">Edit</span>
                              </motion.button>
                              
                              {member.id !== currentUser?.id && (
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleToggleUserStatus(member)}
                                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-colors"
                                  style={{ background: member.is_active ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)' }}
                                  title={member.is_active ? 'Deactivate' : 'Reactivate'}
                                >
                                  {member.is_active ? '🚫' : '✅'}
                                </motion.button>
                              )}

                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => handleRemoveFromTeam(member)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-colors text-rose-500 hover:bg-rose-500/10"
                                style={{ background: isDark ? 'rgba(244,63,94,0.05)' : '#fff1f2' }}
                                title="Remove from team"
                              >
                                ❌
                              </motion.button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="pt-3 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor }}>
                    <span className="text-xs" style={{ color: mutedColor }}>
                      💡 Tip: Removing a member unassigns them without deleting their profile.
                    </span>
                    <button
                      onClick={() => setSelectedTeamForMembers(null)}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-transform hover:scale-105"
                      style={{ background: currentTeam.color }}
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              );
            })()}
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
                onClick={() => setSelectedTeamForMembers(team)}
                className="rounded-2xl p-5 space-y-4 group cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg"
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
                      onClick={(e) => { e.stopPropagation(); openEditTeam(team); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{ background: isDark ? '#2a2a3a' : '#e5e2f0' }}
                    >✏️</motion.button>
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{ background: 'rgba(244,63,94,0.1)' }}
                    >🗑️</motion.button>
                  </div>
                </div>

                {/* Member Count */}
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor }}>
                  <div className="flex items-center gap-3">
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
                  <span className="text-[10px] font-semibold flex items-center gap-1 px-2 py-1 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" style={{ background: `${team.color}15`, color: team.color }}>
                    <span>👥</span> View & Edit
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate flex items-center gap-1.5" style={{ color: textColor }}>
                      <span>{user.full_name}</span>
                      {user.tag && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {user.tag}
                        </span>
                      )}
                    </p>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
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
  // TAB: Production KPIs & Output Targets
  // ═══════════════════════════════════════════════════════════════════
  function renderKpiTab() {
    const weeklyMinReels = Math.max(0, 30 - kpiPodcastsWeek * 4);
    const weeklyExpReels = Math.max(0, 36 - kpiPodcastsWeek * 4);
    const monthlyMinReels = Math.max(0, 120 - kpiPodcastsMonth * 4);
    const monthlyExpReels = Math.max(0, 144 - kpiPodcastsMonth * 4);

    // Filter and sort users for KPI tracking
    const trackedUsers = allUsers
      .filter(u => u.is_active)
      .filter(u => {
        if (kpiSearch && !u.full_name.toLowerCase().includes(kpiSearch.toLowerCase())) return false;
        if (kpiTeamFilter !== 'all' && u.team_id !== kpiTeamFilter) return false;
        return true;
      })
      .map(u => ({ user: u, metrics: getUserKpiMetrics(u) }))
      .sort((a, b) => {
        if (kpiSortBy === 'score') return b.metrics.kpiScore - a.metrics.kpiScore;
        if (kpiSortBy === 'tasks') return b.metrics.doneCount - a.metrics.doneCount;
        if (kpiSortBy === 'reels') return b.metrics.effectiveReels - a.metrics.effectiveReels;
        return 0;
      });

    // Calculate team summary stats
    const totalTeamTasks = allUsers.filter(u => u.is_active).reduce((acc, u) => acc + getUserKpiMetrics(u).totalTasks, 0);
    const totalTeamDone = allUsers.filter(u => u.is_active).reduce((acc, u) => acc + getUserKpiMetrics(u).doneCount, 0);
    const avgCompletion = totalTeamTasks > 0 ? Math.round((totalTeamDone / totalTeamTasks) * 100) : 0;
    const totalTeamReels = allUsers.filter(u => u.is_active).reduce((acc, u) => acc + getUserKpiMetrics(u).effectiveReels, 0);
    const topPerformer = trackedUsers.length > 0 ? trackedUsers[0] : null;

    return (
      <div className="space-y-6">
        {/* Top Header Toggle & Summary Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor }}>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: textColor }}>
              <span>🎯 User-Wise KPI & Content Output Dashboard</span>
            </h2>
            <p className="text-xs mt-0.5 max-w-xl" style={{ color: mutedColor }}>
              Real-time performance tracking for every team member based on task completion and the 1 Podcast = 4 Reels conversion rule.
            </p>
          </div>

          {/* Toggle Buttons */}
          <div className="flex p-1 rounded-2xl border self-stretch md:self-auto flex-shrink-0" style={{ background: isDark ? '#12121a' : '#f5f3ff', borderColor }}>
            <button
              onClick={() => setKpiViewMode('live')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                kpiViewMode === 'live' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>📊 Live User KPI Board</span>
            </button>
            <button
              onClick={() => setKpiViewMode('guidelines')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                kpiViewMode === 'guidelines' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>📖 SOP & Output Simulator</span>
            </button>
          </div>
        </div>

        {kpiViewMode === 'live' ? (
          <div className="space-y-6">
            {/* Team Performance Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-3xl border flex items-center gap-3.5 shadow-sm" style={{ background: cardBg, borderColor, backdropFilter: 'blur(20px)' }}>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl flex-shrink-0">👥</div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: mutedColor }}>Tracked Members</p>
                  <p className="text-xl font-black text-purple-400 mt-0.5">{allUsers.filter(u => u.is_active).length} Users</p>
                </div>
              </div>

              <div className="p-4 rounded-3xl border flex items-center gap-3.5 shadow-sm" style={{ background: cardBg, borderColor, backdropFilter: 'blur(20px)' }}>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl flex-shrink-0">🎯</div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: mutedColor }}>Avg Completion</p>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">{avgCompletion}%</p>
                </div>
              </div>

              <div className="p-4 rounded-3xl border flex items-center gap-3.5 shadow-sm" style={{ background: cardBg, borderColor, backdropFilter: 'blur(20px)' }}>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl flex-shrink-0">🎬</div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: mutedColor }}>Total Content Output</p>
                  <p className="text-xl font-black text-cyan-400 mt-0.5">{totalTeamReels} Reels Eq.</p>
                </div>
              </div>

              <div className="p-4 rounded-3xl border flex items-center gap-3.5 shadow-sm" style={{ background: cardBg, borderColor, backdropFilter: 'blur(20px)' }}>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl flex-shrink-0">🏆</div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: mutedColor }}>Top Performer</p>
                  <p className="text-sm font-black text-amber-400 mt-0.5 truncate">{topPerformer ? topPerformer.user.full_name : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border shadow-sm" style={{ background: cardBg, borderColor }}>
              <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
                <input
                  type="text"
                  value={kpiSearch}
                  onChange={e => setKpiSearch(e.target.value)}
                  placeholder="🔍 Search user KPI..."
                  className="w-full px-4 py-2 rounded-xl text-xs outline-none"
                  style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={kpiTeamFilter}
                  onChange={e => setKpiTeamFilter(e.target.value)}
                  className="px-3.5 py-2 rounded-xl text-xs outline-none appearance-none cursor-pointer font-medium"
                  style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                >
                  <option value="all">🏢 All Teams</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>

                <select
                  value={kpiSortBy}
                  onChange={e => setKpiSortBy(e.target.value as any)}
                  className="px-3.5 py-2 rounded-xl text-xs outline-none appearance-none cursor-pointer font-medium"
                  style={{ background: isDark ? '#12121a' : '#f5f3ff', color: textColor, border: `1px solid ${borderColor}` }}
                >
                  <option value="score">🔥 Sort by KPI Score</option>
                  <option value="tasks">✅ Sort by Completed Tasks</option>
                  <option value="reels">🎬 Sort by Content Output</option>
                </select>
              </div>
            </div>

            {/* User-Wise KPI Cards Grid */}
            {trackedUsers.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border" style={{ background: cardBg, borderColor }}>
                <span className="text-5xl">📊</span>
                <p className="text-sm font-semibold mt-3" style={{ color: textColor }}>No matching users found</p>
                <p className="text-xs mt-1" style={{ color: mutedColor }}>Try adjusting your search or team filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trackedUsers.map(({ user, metrics }, idx) => {
                  const teamColor = getTeamColor(user.team_id);
                  const isTop3 = idx < 3 && metrics.kpiScore > 0;
                  
                  // Score badge status
                  let scoreLabel = '⚡ On Target';
                  let scoreColor = '#3b82f6';
                  if (metrics.kpiScore >= 80 || metrics.completionRate >= 80) {
                    scoreLabel = '🔥 Top Tier';
                    scoreColor = '#10b981';
                  } else if (metrics.kpiScore < 40 && metrics.totalTasks > 0) {
                    scoreLabel = '⚠️ Needs Focus';
                    scoreColor = '#f43f5e';
                  }

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      whileHover={{ y: -4 }}
                      onClick={() => setSelectedKpiUser(user)}
                      className="rounded-3xl p-5 border flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden group transition-all shadow-sm"
                      style={{
                        background: cardBg,
                        borderColor: isTop3 ? teamColor : borderColor,
                        boxShadow: isTop3 ? `0 8px 25px -5px ${teamColor}25` : undefined,
                      }}
                    >
                      {/* Top Rank Badge if top 3 */}
                      {isTop3 && (
                        <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-2xl text-[10px] font-black text-white shadow-md flex items-center gap-1"
                          style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)` }}
                        >
                          <span>#{idx + 1} MVP</span>
                        </div>
                      )}

                      {/* User Header */}
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black text-white shadow"
                            style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}99)` }}
                          >
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2"
                            style={{ background: user.is_online ? '#10b981' : '#71717a', borderColor: isDark ? '#1e1e2e' : '#fff' }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm truncate flex items-center gap-1.5" style={{ color: textColor }}>
                            <span>{user.full_name}</span>
                            {user.tag && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                {user.tag}
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${teamColor}15`, color: teamColor }}>
                              {getTeamName(user.team_id)}
                            </span>
                            <span className="text-[10px]" style={{ color: mutedColor }}>• Lvl {user.level || 1}</span>
                          </div>
                        </div>
                      </div>

                      {/* KPI Score Progress Bar */}
                      <div className="p-3.5 rounded-2xl space-y-2 border" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(245,243,255,0.6)', borderColor }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold" style={{ color: textColor }}>KPI Completion Score</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${scoreColor}15`, color: scoreColor }}>
                              {scoreLabel}
                            </span>
                            <span className="text-sm font-black" style={{ color: scoreColor }}>{metrics.kpiScore}%</span>
                          </div>
                        </div>

                        <div className="h-2.5 rounded-full overflow-hidden w-full bg-gray-500/20">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${metrics.kpiScore}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}cc)` }}
                          />
                        </div>

                        <div className="flex justify-between text-[10px]" style={{ color: mutedColor }}>
                          <span>Task Success Rate: <strong style={{ color: textColor }}>{metrics.completionRate}%</strong></span>
                          <span>Assigned: <strong style={{ color: textColor }}>{metrics.totalTasks}</strong></span>
                        </div>
                      </div>

                      {/* Task & Content Breakdown Grid */}
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-sm font-black text-emerald-400">{metrics.doneCount}</p>
                          <p className="text-[9px] font-semibold uppercase text-emerald-500/80">Done</p>
                        </div>
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <p className="text-sm font-black text-amber-400">{metrics.inProgressCount + metrics.todoCount}</p>
                          <p className="text-[9px] font-semibold uppercase text-amber-500/80">Pending</p>
                        </div>
                        <div className={`p-2 rounded-xl border ${metrics.overdueCount > 0 ? 'bg-rose-500/15 border-rose-500/30' : 'bg-blue-500/10 border-blue-500/20'}`}>
                          <p className={`text-sm font-black ${metrics.overdueCount > 0 ? 'text-rose-400 animate-pulse' : 'text-blue-400'}`}>
                            {metrics.overdueCount > 0 ? `⚠️ ${metrics.overdueCount}` : '0'}
                          </p>
                          <p className={`text-[9px] font-semibold uppercase ${metrics.overdueCount > 0 ? 'text-rose-400' : 'text-blue-500/80'}`}>Overdue</p>
                        </div>
                      </div>

                      {/* Content Output Strip (Reels / Podcasts) */}
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t" style={{ borderColor }}>
                        <div className="flex items-center gap-2" style={{ color: mutedColor }}>
                          <span>🎬 <strong style={{ color: textColor }}>{metrics.completedReels}</strong> Reels</span>
                          <span>•</span>
                          <span>🎙️ <strong style={{ color: textColor }}>{metrics.completedPodcasts}</strong> Podcasts</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-purple-400">
                          ⚡ {metrics.effectiveReels} Eq.
                        </span>
                      </div>

                      {/* View Button on Hover */}
                      <button className="w-full py-2 rounded-xl text-xs font-bold transition-all bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 border border-purple-500/20 flex items-center justify-center gap-1 mt-1">
                        <span>🔍 Inspect Task Breakdown →</span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Existing Guidelines & Simulator view */
          <div className="space-y-6">
            {/* Banner Section */}
            <div className="rounded-3xl p-6 relative overflow-hidden" style={{
              background: isDark ? 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.15))' : 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.08))',
              border: `1px solid ${isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)'}`,
            }}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎯</span>
                    <h2 className="text-lg font-bold" style={{ color: textColor }}>Production KPI & Output Guidelines</h2>
                  </div>
                  <p className="text-xs max-w-2xl leading-relaxed" style={{ color: mutedColor }}>
                    Set benchmarks and track expected content output for editors. Standard targets balance Reels and Podcast edits with automatic workload conversion rules.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3.5 py-2 rounded-2xl self-stretch md:self-auto justify-center">
                  <span className="text-xs font-bold text-purple-400">⚡ Conversion Rule: 1 Podcast = 4 Reels</span>
                </div>
              </div>
            </div>

            {/* Target Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Daily Card */}
              <motion.div whileHover={{ y: -3 }} className="rounded-3xl p-5 space-y-4" style={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                backdropFilter: 'blur(20px)',
              }}>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-cyan-500/10 text-cyan-400 text-lg">
                    🌅
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Daily Benchmark
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: mutedColor }}>Expected Output</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-cyan-400">6 reels</span>
                  </div>
                </div>
                <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor }}>
                  <span style={{ color: mutedColor }}>Minimum Required:</span>
                  <span className="font-bold text-cyan-500">6 reels</span>
                </div>
              </motion.div>

              {/* Weekly Card */}
              <motion.div whileHover={{ y: -3 }} className="rounded-3xl p-5 space-y-4" style={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                backdropFilter: 'blur(20px)',
              }}>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-purple-500/10 text-purple-400 text-lg">
                    📅
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Weekly Target
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: mutedColor }}>Expected Output</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-purple-400">36 reels</span>
                    <span className="text-xs" style={{ color: mutedColor }}>or 2 podcasts</span>
                  </div>
                </div>
                <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor }}>
                  <span style={{ color: mutedColor }}>Minimum Required:</span>
                  <span className="font-bold text-purple-500">30 reels / 2 podcasts</span>
                </div>
              </motion.div>

              {/* Monthly Card */}
              <motion.div whileHover={{ y: -3 }} className="rounded-3xl p-5 space-y-4" style={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                backdropFilter: 'blur(20px)',
              }}>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 text-lg">
                    🗓️
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Monthly Target
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: mutedColor }}>Expected Output</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-emerald-400">144 reels</span>
                    <span className="text-xs" style={{ color: mutedColor }}>or 8 podcasts</span>
                  </div>
                </div>
                <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor }}>
                  <span style={{ color: mutedColor }}>Minimum Required:</span>
                  <span className="font-bold text-emerald-500">120 reels / 8 podcasts</span>
                </div>
              </motion.div>
            </div>

            {/* Dynamic Calculator & Conversion Simulator */}
            <div className="rounded-3xl p-6 space-y-6" style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              backdropFilter: 'blur(20px)',
            }}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b" style={{ borderColor }}>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: textColor }}>
                    <span>🧮 Dynamic Reel & Podcast Target Simulator</span>
                  </h3>
                  <p className="text-xs mt-1" style={{ color: mutedColor }}>
                    Important: If anyone edits podcasts in a week, then the reel count will adjust accordingly (1 podcast = 4 reels).
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  💡 Live Adjustment Calculator
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Simulator */}
                <div className="p-5 rounded-2xl space-y-4" style={{ background: isDark ? 'rgba(20,20,30,0.5)' : 'rgba(245,243,255,0.6)', border: `1px solid ${borderColor}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: textColor }}>📅 Weekly Podcast Adjustment</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400">{kpiPodcastsWeek} Podcasts</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px]" style={{ color: mutedColor }}>
                      <span>Podcasts Completed:</span>
                      <span className="font-bold text-purple-400">{kpiPodcastsWeek} (equals {kpiPodcastsWeek * 4} reels)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="7"
                      value={kpiPodcastsWeek}
                      onChange={e => setKpiPodcastsWeek(parseInt(e.target.value) || 0)}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px]" style={{ color: mutedColor }}>
                      <span>0 podcasts</span>
                      <span>7 podcasts</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl space-y-2" style={{ background: isDark ? 'rgba(139,92,246,0.1)' : '#fff', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium" style={{ color: mutedColor }}>Your Weekly Minimum Target:</span>
                      <span className="font-bold text-purple-400">{weeklyMinReels} reels + {kpiPodcastsWeek} podcasts</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]" style={{ color: mutedColor }}>
                      <span>Expected Target:</span>
                      <span>{weeklyExpReels} reels + {kpiPodcastsWeek} podcasts</span>
                    </div>
                  </div>
                  <p className="text-[11px] italic" style={{ color: mutedColor }}>
                    * Example: If you complete 2 podcasts in a week, then your weekly minimum reel target becomes 22 reels + 2 podcasts.
                  </p>
                </div>

                {/* Monthly Simulator */}
                <div className="p-5 rounded-2xl space-y-4" style={{ background: isDark ? 'rgba(20,20,30,0.5)' : 'rgba(245,243,255,0.6)', border: `1px solid ${borderColor}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: textColor }}>🗓️ Monthly Podcast Adjustment</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400">{kpiPodcastsMonth} Podcasts</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px]" style={{ color: mutedColor }}>
                      <span>Podcasts Completed:</span>
                      <span className="font-bold text-emerald-400">{kpiPodcastsMonth} (equals {kpiPodcastsMonth * 4} reels)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={kpiPodcastsMonth}
                      onChange={e => setKpiPodcastsMonth(parseInt(e.target.value) || 0)}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px]" style={{ color: mutedColor }}>
                      <span>0 podcasts</span>
                      <span>30 podcasts</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl space-y-2" style={{ background: isDark ? 'rgba(16,185,129,0.1)' : '#fff', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium" style={{ color: mutedColor }}>Your Monthly Minimum Target:</span>
                      <span className="font-bold text-emerald-400">{monthlyMinReels} reels + {kpiPodcastsMonth} podcasts</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]" style={{ color: mutedColor }}>
                      <span>Expected Target:</span>
                      <span>{monthlyExpReels} reels + {kpiPodcastsMonth} podcasts</span>
                    </div>
                  </div>
                  <p className="text-[11px] italic" style={{ color: mutedColor }}>
                    * Example: If you complete 8 podcasts in a month, then your monthly minimum reel target becomes 88 reels + 8 podcasts.
                  </p>
                </div>
              </div>
            </div>

            {/* Daily Report SOP Guidelines Card */}
            <div className="rounded-3xl p-6 space-y-5 relative overflow-hidden" style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              backdropFilter: 'blur(20px)',
            }}>
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📋</span>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: textColor }}>Daily Report & Planned Tasks SOP</h3>
                    <p className="text-xs" style={{ color: mutedColor }}>Standard operating procedure for daily updates by content editors</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Mandatory Checklist
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-400 flex-shrink-0 text-sm">
                    1️⃣
                  </div>
                  <div>
                    <h4 className="text-xs font-bold mb-1" style={{ color: textColor }}>Mention Daily Reels in Planned Tasks</h4>
                    <p className="text-xs leading-relaxed" style={{ color: mutedColor }}>
                      In the daily report, under <strong className="text-cyan-400 font-semibold">Planned Tasks</strong>, make sure you mention your <strong className="text-cyan-400 font-semibold">6 reels</strong> for the day.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-400 flex-shrink-0 text-sm">
                    2️⃣
                  </div>
                  <div>
                    <h4 className="text-xs font-bold mb-1" style={{ color: textColor }}>Podcasts Mentioned at Start</h4>
                    <p className="text-xs leading-relaxed" style={{ color: mutedColor }}>
                      If you have a podcast assigned on that day, mention it <strong className="text-purple-400 font-semibold">at the very start</strong> of your Planned Tasks.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400 flex-shrink-0 text-sm">
                    3️⃣
                  </div>
                  <div>
                    <h4 className="text-xs font-bold mb-1" style={{ color: textColor }}>End of Day Flexibility</h4>
                    <p className="text-xs leading-relaxed" style={{ color: mutedColor }}>
                      Any changes, reassignments, or schedule shifts during working hours can be <strong className="text-amber-400 font-semibold">updated at the end of the day</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${borderColor}` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 flex-shrink-0 text-sm">
                    4️⃣
                  </div>
                  <div>
                    <h4 className="text-xs font-bold mb-1.5" style={{ color: textColor }}>Mandatory Status Breakdown</h4>
                    <div className="space-y-1 text-xs" style={{ color: mutedColor }}>
                      <div className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold">✓</span> <strong style={{ color: textColor }}>What you completed</strong></div>
                      <div className="flex items-center gap-1.5"><span className="text-amber-400 font-bold">✗</span> <strong style={{ color: textColor }}>What you couldn’t complete</strong></div>
                      <div className="flex items-center gap-1.5"><span className="text-rose-400 font-bold">💬</span> <strong style={{ color: textColor }}>Reason</strong> if any reel or podcast is not completed</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Format Preview */}
              <div className="p-4 rounded-2xl space-y-2" style={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(240,238,250,0.8)', border: `1px dashed ${borderColor}` }}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400">📝 Sample Daily Report Template</p>
                <div className="font-mono text-xs space-y-1" style={{ color: textColor }}>
                  <p className="font-semibold text-cyan-400">📌 Planned Tasks:</p>
                  <p>• [Podcast] Client Interview Ep. 42 (At the start)</p>
                  <p>• 6 Reels editing (Daily target)</p>
                  <p className="font-semibold text-emerald-400 mt-2">✅ Completed:</p>
                  <p>• 1 Podcast (Ep. 42) + 4 Reels completed</p>
                  <p className="font-semibold text-rose-400 mt-2">⏳ Could not complete & Reason:</p>
                  <p>• 2 Reels pending – Reason: Waiting for b-roll assets and client feedback.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAB: Admin Settings
  // ═══════════════════════════════════════════════════════════════════
  function renderSettingsTab() {
    const isWaConnected = Boolean(waConfig.accessToken || process.env.NEXT_PUBLIC_WHATSAPP_CONFIGURED);
    return (
      <div className="space-y-6 max-w-4xl">
        {/* ─── Meta WhatsApp Business Cloud API Integration & Reminder Setup ─── */}
        <div
          className="rounded-3xl p-6 space-y-6 shadow-xl relative overflow-hidden"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.04), rgba(30,30,45,0.85))'
              : 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(240,253,244,0.95), #ffffff)',
            border: isDark ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(16,185,129,0.3)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b" style={{ borderColor: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.2)' }}>
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                }}
              >
                💬
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold" style={{ color: textColor }}>
                    Meta WhatsApp Business Cloud API Integration
                  </h3>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm"
                    style={{
                      background: isWaConnected ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: isWaConnected ? '#10b981' : '#f59e0b',
                      border: isWaConnected ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.3)',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: isWaConnected ? '#10b981' : '#f59e0b' }} />
                    {isWaConnected ? 'API Connected & Ready' : 'Credentials Needed'}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: mutedColor }}>
                  Configure your WhatsApp Access Token & Template to send automated task reminders to team members
                </p>
              </div>
            </div>
            {waSavedToast && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-500 shadow-md flex items-center gap-1.5"
              >
                <span>✅ Settings Saved!</span>
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: API Configuration */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                <span>🔑 Step 1: Cloud API Credentials & Template</span>
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: textColor }}>
                    WhatsApp Access Token *
                  </label>
                  <div className="relative">
                    <input
                      type={waShowToken ? 'text' : 'password'}
                      value={waConfig.accessToken}
                      onChange={e => setWaConfig({ ...waConfig, accessToken: e.target.value })}
                      placeholder="EAA... (Meta Graph API Permanent or Temporary Token)"
                      className="w-full pl-3.5 pr-20 py-2.5 rounded-xl text-xs font-mono outline-none transition-all"
                      style={{
                        background: isDark ? 'rgba(15,23,42,0.7)' : '#ffffff',
                        color: textColor,
                        border: `1px solid ${borderColor}`,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setWaShowToken(!waShowToken)}
                      className="absolute right-2 top-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
                        color: mutedColor,
                      }}
                    >
                      {waShowToken ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: mutedColor }}>
                    Found in your Meta Developers App &gt; WhatsApp &gt; API Setup
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold block mb-1" style={{ color: textColor }}>
                      Phone Number ID *
                    </label>
                    <input
                      type="text"
                      value={waConfig.phoneId}
                      onChange={e => setWaConfig({ ...waConfig, phoneId: e.target.value })}
                      placeholder="e.g. 1046892348..."
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none"
                      style={{
                        background: isDark ? 'rgba(15,23,42,0.7)' : '#ffffff',
                        color: textColor,
                        border: `1px solid ${borderColor}`,
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold block mb-1" style={{ color: textColor }}>
                      WABA ID (For Fetching Templates)
                    </label>
                    <input
                      type="text"
                      value={waConfig.wabaId || ''}
                      onChange={e => setWaConfig({ ...waConfig, wabaId: e.target.value })}
                      placeholder="WhatsApp Business Account ID"
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none"
                      style={{
                        background: isDark ? 'rgba(15,23,42,0.7)' : '#ffffff',
                        color: textColor,
                        border: `1px solid ${borderColor}`,
                      }}
                    />
                  </div>
                </div>


                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-[11px] font-semibold" style={{ color: textColor }}>
                      WhatsApp Approved Template Name *
                    </label>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleFetchTemplates}
                      disabled={waFetchingTemplates}
                      className="px-3 py-1 rounded-lg text-[10px] font-extrabold text-white shadow transition-all flex items-center gap-1.5"
                      style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
                    >
                      {waFetchingTemplates ? (
                        <>
                          <span className="animate-spin">⏳</span> Fetching Meta Templates...
                        </>
                      ) : (
                        <>
                          <span>🔄 Fetch My Meta Templates</span>
                        </>
                      )}
                    </motion.button>
                  </div>

                  {waTemplateError && (
                    <div className="p-2.5 rounded-xl text-[11px] bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
                      ⚠️ {waTemplateError}
                    </div>
                  )}

                  {waTemplates.length > 0 && (
                    <div className="p-3 rounded-xl border space-y-1.5" style={{ background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(240,253,244,0.8)', borderColor: 'rgba(16,185,129,0.3)' }}>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
                        ✅ Select from your Meta Approved Templates ({waTemplates.length} found)
                      </label>
                      <select
                        onChange={e => {
                          const selected = waTemplates.find(t => t.name === e.target.value);
                          if (selected) {
                            setWaConfig({
                              ...waConfig,
                              templateName: cleanTemplateName(selected.name),
                              languageCode: selected.language || 'en_US',
                            });
                            const bodyComp = selected.components?.find((c: any) => c.type === 'BODY' || c.type === 'body');
                            const matches = bodyComp?.text?.match(/\{\{\d+\}\}/g);
                            const count = matches ? matches.length : 0;
                            setWaNoParams(count === 0);
                          }
                        }}

                        value={waConfig.templateName}
                        className="w-full px-3 py-2 rounded-lg text-xs font-mono font-bold outline-none border cursor-pointer"
                        style={{
                          background: isDark ? '#0f172a' : '#ffffff',
                          color: textColor,
                          borderColor: 'rgba(16,185,129,0.4)',
                        }}
                      >
                        <option value="">-- Choose an Approved Template --</option>
                        {waTemplates.map(t => (
                          <option key={`${t.id || t.name}-${t.language}`} value={t.name}>
                            {t.name} ({t.language}) [{t.status}]
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <input
                    type="text"
                    value={waConfig.templateName}
                    onChange={e => setWaConfig({ ...waConfig, templateName: e.target.value })}
                    placeholder="e.g. hello_world"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono outline-none font-semibold"
                    style={{
                      background: isDark ? 'rgba(15,23,42,0.7)' : '#ffffff',
                      color: textColor,
                      border: `1px solid ${borderColor}`,
                    }}
                  />
                  <p className="text-[10px] mt-1" style={{ color: mutedColor }}>
                    Active Template: <code className="text-emerald-500 font-bold">{cleanTemplateName(waConfig.templateName)}</code> • Language: <code className="text-emerald-500 font-bold">{waConfig.languageCode || 'en'}</code>
                  </p>
                </div>


                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={waConfig.enabled}
                      onChange={e => setWaConfig({ ...waConfig, enabled: e.target.checked })}
                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold" style={{ color: textColor }}>
                      Enable Automated Task Due Reminders
                    </span>
                  </label>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveWhatsAppConfig}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-transform hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >
                    💾 Save Credentials
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Sandbox & Live Reminder Tester */}
            <div
              className="p-5 rounded-2xl border space-y-4 flex flex-col justify-between"
              style={{
                background: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.7)',
                borderColor: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.25)',
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                    <span>🚀 Step 2: Live Reminder Sandbox & Test</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                    Sandbox
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold block mb-1" style={{ color: textColor }}>
                    Test Recipient WhatsApp Number (with country code)
                  </label>
                  <input
                    type="tel"
                    value={waTestPhone}
                    onChange={e => setWaTestPhone(e.target.value)}
                    placeholder="e.g. 919876543210"
                    className="w-full px-3.5 py-2.2 rounded-xl text-xs font-mono outline-none"
                    style={{
                      background: isDark ? '#0f172a' : '#ffffff',
                      color: textColor,
                      border: `1px solid ${borderColor}`,
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold" style={{ color: textColor }}>
                      Template Parameter Text ({'{{1}}'})
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold cursor-pointer select-none px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <input
                        type="checkbox"
                        checked={waNoParams}
                        onChange={e => setWaNoParams(e.target.checked)}
                        className="rounded accent-emerald-500 w-3.5 h-3.5"
                      />
                      <span>0 Parameters (Fixed Template)</span>
                    </label>
                  </div>

                  {waNoParams ? (
                    <div className="p-3 rounded-xl border text-[11px] bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-medium flex items-center gap-2">
                      <span>⚡</span>
                      <span>
                        Fixed template selected (e.g. <code>hello_world</code>). No variables (<code>components</code>) will be sent so Meta doesn't throw a parameter mismatch error.
                      </span>
                    </div>
                  ) : (
                    <textarea
                      rows={2}
                      value={waTestMessage}
                      onChange={e => setWaTestMessage(e.target.value)}
                      placeholder="Reminder message text sent inside template variable"
                      className="w-full px-3.5 py-2 rounded-xl text-xs outline-none resize-none"
                      style={{
                        background: isDark ? '#0f172a' : '#ffffff',
                        color: textColor,
                        border: `1px solid ${borderColor}`,
                      }}
                    />
                  )}
                </div>


                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleTestWhatsApp}
                  disabled={waTesting || !waTestPhone.trim()}
                  className="w-full py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #0d9488)',
                  }}
                >
                  {waTesting ? (
                    <>
                      <span className="animate-spin">⏳</span> Sending Test via Meta Cloud API...
                    </>
                  ) : (
                    <>
                      <span>📲 Send Live WhatsApp Reminder Test</span>
                    </>
                  )}
                </motion.button>

                {/* API Result Feedback Box */}
                {waTestResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-xl text-xs border ${
                      waTestResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-medium'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{waTestResult.success ? '✅' : '⚠️'}</span>
                      <div className="min-w-0 flex-1">
                        <p>{waTestResult.message}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Live WhatsApp Chat Mockup Preview Bubble */}
              <div
                className="p-3.5 rounded-2xl space-y-2 mt-3"
                style={{
                  background: isDark ? '#0b141a' : '#eae6df',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                <div className="flex items-center justify-between text-[10px]" style={{ color: isDark ? '#8696a0' : '#667781' }}>
                  <span className="font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Live Chat Preview
                  </span>
                  <span>WhatsApp Business</span>
                </div>

                <div
                  className="p-3 rounded-2xl rounded-tl-none max-w-[92%] shadow-sm space-y-1 relative"
                  style={{
                    background: isDark ? '#005c4b' : '#dcf8c6',
                    color: isDark ? '#e9edef' : '#111b21',
                  }}
                >
                  <p className="text-[11px] leading-relaxed font-medium">
                    {waTestMessage || 'Reminder: Please complete your daily CRM tasks!'}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[9px] opacity-75">
                    <span>Just now</span>
                    <span className="text-cyan-300 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
