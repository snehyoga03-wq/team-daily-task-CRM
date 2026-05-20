'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion } from 'framer-motion';

export default function Header() {
  const { theme, toggleTheme, searchOpen, setSearchOpen, setQuickAddOpen, notifications, toggleRightPanel } = useAppStore();
  const { currentUser } = useAuthStore();
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const isDark = theme === 'dark';
  const userInitial = currentUser?.full_name?.charAt(0)?.toUpperCase() || '?';

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b"
      style={{
        background: isDark ? 'rgba(10,10,15,0.8)' : 'rgba(248,247,255,0.8)',
        borderColor: isDark ? '#2a2a3a' : '#e5e2f0',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Search */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        onClick={() => setSearchOpen(!searchOpen)}
        className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-sm cursor-pointer flex-1 max-w-[200px] md:max-w-none md:min-w-[280px]"
        style={{
          background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(255,255,255,0.6)',
          border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`,
          color: isDark ? '#71717a' : '#6b6880',
        }}
      >
        <span>🔍</span>
        <span className="hidden sm:inline truncate">Search tasks, leads, people...</span>
        <span className="inline sm:hidden truncate">Search...</span>
        <span className="hidden md:block ml-auto text-xs px-2 py-0.5 rounded-md" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0' }}>⌘K</span>
      </motion.button>

      {/* Actions */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {/* Quick Add */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setQuickAddOpen(true)}
          className="btn-primary flex items-center justify-center gap-1 md:gap-2 text-sm w-9 h-9 md:w-auto !p-0 md:!px-4 md:!py-2"
        >
          <span className="text-lg md:text-base">＋</span>
          <span className="hidden md:inline">Quick Add</span>
        </motion.button>

        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{
            background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`,
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg relative"
          style={{
            background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`,
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </motion.button>

        {/* Right Panel Toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleRightPanel}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg hidden lg:flex"
          style={{
            background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`,
          }}
        >
          📋
        </motion.button>

        {/* User Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          onClick={() => useAppStore.getState().setActiveView('settings')}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}
          title={currentUser?.full_name || 'Profile'}
        >
          {userInitial}
        </motion.div>
      </div>
    </header>
  );
}
