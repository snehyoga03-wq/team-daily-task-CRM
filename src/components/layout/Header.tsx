'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';

export default function Header() {
  const { theme, toggleTheme, searchOpen, setSearchOpen, setQuickAddOpen, notifications, toggleRightPanel } = useAppStore();
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const isDark = theme === 'dark';

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
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm cursor-pointer"
        style={{
          background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(255,255,255,0.6)',
          border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`,
          color: isDark ? '#71717a' : '#6b6880',
          minWidth: 280,
        }}
      >
        <span>🔍</span>
        <span>Search tasks, leads, people...</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-md" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0' }}>⌘K</span>
      </motion.button>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Add */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setQuickAddOpen(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <span>＋</span>
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
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}
        >
          🧘‍♀️
        </motion.div>
      </div>
    </header>
  );
}
