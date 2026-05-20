'use client';

import { useAppStore, View } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

const navItems: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'tasks', label: 'Tasks', icon: '✅' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'crm', label: 'CRM', icon: '💼' },
  { id: 'leads', label: 'Leads', icon: '🎯' },
  { id: 'team', label: 'Team', icon: '👥' },
  { id: 'attendance', label: 'Attendance', icon: '📋' },
  { id: 'focus', label: 'Focus Mode', icon: '🧘' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, toggleSidebar, theme, notifications } = useAppStore();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r overflow-hidden"
      style={{
        background: theme === 'dark' ? 'rgba(10,10,15,0.95)' : 'rgba(248,247,255,0.95)',
        borderColor: theme === 'dark' ? '#2a2a3a' : '#e5e2f0',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: theme === 'dark' ? '#2a2a3a' : '#e5e2f0' }}>
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}
        >
          🧘
        </motion.div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden">
              <h1 className="font-bold text-sm gradient-text whitespace-nowrap">SnehYoga CRM</h1>
              <p className="text-[10px] whitespace-nowrap" style={{ color: theme === 'dark' ? '#71717a' : '#6b6880' }}>Team Workspace</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveView(item.id)}
            className={`sidebar-item w-full relative ${activeView === item.id ? 'active' : ''}`}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <span className="text-lg flex-shrink-0">{item.icon}</span>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {item.id === 'notifications' && unreadCount > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            {activeView === item.id && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                style={{ background: 'linear-gradient(to bottom, #9333ea, #06b6d4)' }}
              />
            )}
          </motion.button>
        ))}
      </nav>

      {/* AI Button */}
      <div className="px-3 pb-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveView('ai')}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.15))',
            color: '#a855f7',
            border: '1px solid rgba(139,92,246,0.15)',
          }}
        >
          <span className="text-lg">🤖</span>
          {!sidebarCollapsed && <span>AI Assistant</span>}
        </motion.button>
      </div>

      {/* Collapse Button */}
      <div className="px-3 pb-4">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-2 rounded-lg text-xs"
          style={{ color: theme === 'dark' ? '#71717a' : '#6b6880' }}
        >
          {sidebarCollapsed ? '→' : '← Collapse'}
        </button>
      </div>
    </motion.aside>
  );
}
