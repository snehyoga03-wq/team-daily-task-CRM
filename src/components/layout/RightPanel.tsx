'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { mockTeamMembers, mockEvents } from '@/lib/mockData';

export default function RightPanel() {
  const { theme, rightPanelOpen, notifications } = useAppStore();
  const isDark = theme === 'dark';

  if (!rightPanelOpen) return null;

  const upcomingEvents = mockEvents.slice(0, 3);
  const recentActivity = [
    { id: 1, text: 'Arjun closed lead "Rohit Verma"', time: '2m ago', icon: '🎯' },
    { id: 2, text: 'Priya published new Instagram reel', time: '15m ago', icon: '📱' },
    { id: 3, text: 'Task "Sales Report" completed', time: '1h ago', icon: '✅' },
    { id: 4, text: 'New lead from webinar signup', time: '2h ago', icon: '💼' },
    { id: 5, text: 'Kavya resolved 5 support tickets', time: '3h ago', icon: '🌸' },
  ];

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="hidden lg:block w-[300px] flex-shrink-0 border-l overflow-y-auto h-[calc(100vh-57px)]"
      style={{
        background: isDark ? 'rgba(10,10,15,0.5)' : 'rgba(248,247,255,0.5)',
        borderColor: isDark ? '#2a2a3a' : '#e5e2f0',
      }}
    >
      <div className="p-4 space-y-5">
        {/* Productivity Score */}
        <div className="stat-card text-center">
          <p className="text-xs font-medium mb-2" style={{ color: isDark ? '#71717a' : '#6b6880' }}>Today&apos;s Productivity</p>
          <div className="relative inline-block">
            <svg width="90" height="90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke={isDark ? '#2a2a3a' : '#e5e2f0'} strokeWidth="6" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#grad)" strokeWidth="6" strokeDasharray="264" strokeDashoffset="66" strokeLinecap="round" transform="rotate(-90 50 50)" />
              <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#9333ea" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient></defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold gradient-text">75%</span>
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: '#10b981' }}>↑ 12% from yesterday</p>
        </div>

        {/* Reminders */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: isDark ? '#71717a' : '#6b6880' }}>🔔 Reminders</h3>
          <div className="space-y-2">
            {notifications.filter(n => !n.isRead).slice(0, 3).map(n => (
              <div key={n.id} className="pipeline-card p-3">
                <p className="text-xs font-medium" style={{ color: isDark ? '#e4e4e7' : '#1e1b2e' }}>{n.title}</p>
                <p className="text-[11px] mt-1" style={{ color: isDark ? '#71717a' : '#6b6880' }}>{n.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: isDark ? '#71717a' : '#6b6880' }}>📅 Upcoming</h3>
          <div className="space-y-2">
            {upcomingEvents.map(e => (
              <div key={e.id} className="pipeline-card p-3 flex items-start gap-3">
                <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: e.color || '#8b5cf6' }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: isDark ? '#e4e4e7' : '#1e1b2e' }}>{e.title}</p>
                  <p className="text-[11px]" style={{ color: isDark ? '#71717a' : '#6b6880' }}>
                    {new Date(e.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: isDark ? '#71717a' : '#6b6880' }}>⚡ Activity</h3>
          <div className="space-y-2">
            {recentActivity.map(a => (
              <div key={a.id} className="flex items-start gap-2 py-2">
                <span className="text-sm flex-shrink-0">{a.icon}</span>
                <div>
                  <p className="text-xs" style={{ color: isDark ? '#e4e4e7' : '#1e1b2e' }}>{a.text}</p>
                  <p className="text-[10px]" style={{ color: isDark ? '#71717a' : '#6b6880' }}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Online */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: isDark ? '#71717a' : '#6b6880' }}>👥 Team Online</h3>
          <div className="flex flex-wrap gap-2">
            {mockTeamMembers.filter(m => m.status === 'online').map(m => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs" style={{
                background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(255,255,255,0.6)',
                border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`,
                color: isDark ? '#e4e4e7' : '#1e1b2e',
              }}>
                <span>{m.avatar}</span>
                <span>{m.name.split(' ')[0]}</span>
                <span className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
