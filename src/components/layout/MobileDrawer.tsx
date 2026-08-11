'use client';

import { useAppStore, View } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';

const navItems: { id: View; label: string; icon: string; category?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'tasks', label: 'Tasks', icon: '✅' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'crm', label: 'CRM Pipeline', icon: '💼' },
  { id: 'leads', label: 'Leads Directory', icon: '🎯' },
  { id: 'team', label: 'Team Members', icon: '👥' },
  { id: 'attendance', label: 'Attendance', icon: '📋' },
  { id: 'focus', label: 'Focus Mode', icon: '🧘' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'chat', label: 'Team Chat', icon: '💬' },
  { id: 'ai', label: 'AI Assistant', icon: '🤖' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function MobileDrawer() {
  const {
    activeView,
    setActiveView,
    theme,
    toggleTheme,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    setSearchOpen,
    setQuickAddOpen,
    notifications,
  } = useAppStore();

  const { currentUser, logout } = useAuthStore();
  const isDark = theme === 'dark';
  const isAdmin = currentUser?.role === 'admin';
  const isHr = currentUser?.role === 'hr' || isAdmin;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const dynamicNavItems: { id: View; label: string; icon: string }[] = [
    ...navItems.filter((item) => item.id !== 'settings'),
    ...(isHr ? [{ id: 'hrms' as View, label: 'HR Management', icon: '🏢' }] : []),
    ...(isAdmin ? [{ id: 'admin' as View, label: 'Admin Panel', icon: '🛡️' }] : []),
    ...navItems.filter((item) => item.id === 'settings'),
  ];

  const userInitial = currentUser?.full_name?.charAt(0)?.toUpperCase() || '?';

  return (
    <AnimatePresence>
      {mobileDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
          />

          {/* Slide-over Sheet */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="fixed left-0 top-0 bottom-0 z-[70] w-[290px] max-w-[85vw] flex flex-col shadow-2xl lg:hidden overflow-hidden"
            style={{
              background: isDark ? 'rgba(10,10,15,0.98)' : 'rgba(255,255,255,0.98)',
              borderRight: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`,
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header / Logo */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-md"
                  style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}
                >
                  🧘
                </div>
                <div>
                  <h2 className="font-bold text-sm gradient-text">SnehYoga CRM</h2>
                  <p className="text-[10px]" style={{ color: isDark ? '#71717a' : '#6b6880' }}>
                    Internal Team Hub
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-colors hover:bg-purple-500/10"
                style={{ color: isDark ? '#a1a1aa' : '#6b6880' }}
              >
                ✕
              </button>
            </div>

            {/* User Profile Card */}
            <div className="p-4 border-b" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
              <div
                className="p-3 rounded-2xl flex items-center gap-3 border shadow-sm"
                style={{
                  background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(248,247,255,0.8)',
                  borderColor: isDark ? '#2a2a3a' : '#e5e2f0',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}
                >
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-xs truncate"
                    style={{ color: isDark ? '#e4e4e7' : '#1e1b2e' }}
                  >
                    {currentUser?.full_name || 'Team Member'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-500">
                      {currentUser?.role || 'Member'}
                    </span>
                    {currentUser?.phone && (
                      <span
                        className="text-[10px] truncate"
                        style={{ color: isDark ? '#71717a' : '#6b6880' }}
                      >
                        {currentUser.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-2 gap-2 p-3 border-b" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setSearchOpen(true);
                }}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all"
                style={{
                  background: isDark ? 'rgba(26,26,37,0.5)' : 'rgba(255,255,255,0.8)',
                  borderColor: isDark ? '#2a2a3a' : '#e5e2f0',
                  color: isDark ? '#e4e4e7' : '#1e1b2e',
                }}
              >
                <span>🔍 Search</span>
              </button>
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setQuickAddOpen(true);
                }}
                className="btn-primary flex items-center justify-center gap-1.5 p-2.5 text-xs font-semibold shadow-sm"
              >
                <span>＋ Quick Add</span>
              </button>
            </div>

            {/* Navigation Items List */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              <p
                className="text-[10px] font-bold uppercase tracking-wider px-3 mb-1"
                style={{ color: isDark ? '#71717a' : '#6b6880' }}
              >
                Navigation Menu
              </p>

              {dynamicNavItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive ? 'bg-purple-500/15 text-purple-500 font-bold' : ''
                    }`}
                    style={{
                      color: isActive ? '#a855f7' : isDark ? '#a1a1aa' : '#6b6880',
                      background: isActive
                        ? isDark
                          ? 'rgba(168,85,247,0.15)'
                          : 'rgba(147,51,234,0.1)'
                        : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>

                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                        {unreadCount}
                      </span>
                    )}

                    {isActive && (
                      <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-purple-500 to-cyan-500" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Footer Options */}
            <div
              className="p-3 border-t space-y-2"
              style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}
            >
              <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: isDark ? 'rgba(26,26,37,0.4)' : 'rgba(0,0,0,0.02)' }}>
                <span className="text-xs font-medium" style={{ color: isDark ? '#a1a1aa' : '#6b6880' }}>
                  {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </span>
                <button
                  onClick={toggleTheme}
                  className="px-3 py-1 rounded-lg text-xs font-bold border"
                  style={{
                    background: isDark ? '#2a2a3a' : '#e5e2f0',
                    borderColor: isDark ? '#3a3a4a' : '#d5d2e0',
                    color: isDark ? '#ffffff' : '#1e1b2e',
                  }}
                >
                  Switch
                </button>
              </div>

              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors border border-rose-500/20"
              >
                🚪 Log Out
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
