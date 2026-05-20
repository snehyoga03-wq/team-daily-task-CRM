'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function SettingsView() {
  const { theme, toggleTheme } = useAppStore();
  const { currentUser, logout } = useAuthStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout();
      useAppStore.getState().setDataLoaded(false);
      window.location.reload();
    }
  };

  const sections = [
    {
      title: '👤 Account',
      items: [
        { label: 'Name', description: currentUser?.full_name || 'Not set', action: <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>🟢 Online</span> },
        { label: 'Phone', description: currentUser?.phone || 'Not set', action: null },
        { label: 'Role', description: currentUser?.role === 'admin' ? 'Administrator' : 'Team Member', action: <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: currentUser?.role === 'admin' ? '#8b5cf615' : '#06b6d415', color: currentUser?.role === 'admin' ? '#8b5cf6' : '#06b6d4' }}>{currentUser?.role}</span> },
        { label: 'XP Points', description: `${currentUser?.xp_points || 0} XP · Level ${currentUser?.level || 1}`, action: <span className="text-lg">🏆</span> },
      ],
    },
    {
      title: '🎨 Appearance',
      items: [
        { label: 'Theme', description: 'Switch between dark and light mode', action: <motion.button whileTap={{ scale: 0.95 }} onClick={toggleTheme} className="px-4 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(139,92,246,0.15)', color: '#a855f7' }}>{isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}</motion.button> },
        { label: 'Accent Color', description: 'Choose your accent color', action: <div className="flex gap-2">{['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ec4899'].map(c => <div key={c} className="w-6 h-6 rounded-full cursor-pointer border-2 border-transparent hover:border-white" style={{ background: c }} />)}</div> },
      ],
    },
    {
      title: '🔔 Notifications',
      items: [
        { label: 'Push Notifications', description: 'Enable browser push notifications', action: <Toggle /> },
        { label: 'Email Digests', description: 'Receive daily email summaries', action: <Toggle /> },
        { label: 'Sound Alerts', description: 'Play sounds for notifications', action: <Toggle defaultOn /> },
      ],
    },
    {
      title: '🔗 Integrations',
      items: [
        { label: 'WhatsApp Business', description: 'Connect WhatsApp for CRM', action: <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: '#10b98115', color: '#10b981' }}>Connected</span> },
        { label: 'Google Calendar', description: 'Sync calendar events', action: <button className="text-xs font-medium" style={{ color: '#8b5cf6' }}>Connect</button> },
        { label: 'Supabase', description: 'Database backend', action: <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: '#10b98115', color: '#10b981' }}>Connected</span> },
      ],
    },
    {
      title: '🏢 Workspace',
      items: [
        { label: 'Workspace Name', description: 'SnehYoga Team', action: <button className="text-xs font-medium" style={{ color: '#8b5cf6' }}>Edit</button> },
        { label: 'Data Export', description: 'Export all workspace data', action: <button className="text-xs font-medium" style={{ color: '#8b5cf6' }}>Export</button> },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold" style={{ color: textColor }}>Settings</h1>
        <p className="text-xs mt-1" style={{ color: mutedColor }}>Manage your workspace preferences</p>
      </div>
      {sections.map((section, si) => (
        <motion.div key={si} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>{section.title}</h3>
          <div className="space-y-4">
            {section.items.map((item, ii) => (
              <div key={ii} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium" style={{ color: textColor }}>{item.label}</p>
                  <p className="text-[11px]" style={{ color: mutedColor }}>{item.description}</p>
                </div>
                {item.action}
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Logout Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleLogout}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: 'rgba(244,63,94,0.1)',
          color: '#f43f5e',
          border: '1px solid rgba(244,63,94,0.2)',
        }}
      >
        🚪 Log Out
      </motion.button>
    </div>
  );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setOn(!on)}
      className="w-10 h-6 rounded-full relative transition-colors"
      style={{ background: on ? '#8b5cf6' : '#d1d5db' }}>
      <motion.div animate={{ x: on ? 18 : 2 }} className="w-4 h-4 rounded-full bg-white absolute top-1" />
    </motion.button>
  );
}
