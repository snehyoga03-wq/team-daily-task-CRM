'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';

export default function NotificationsView() {
  const { theme, notifications, markNotificationRead } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const typeIcons: Record<string, string> = { task: '✅', crm: '💼', webinar: '🎥', mention: '💬', deadline: '⏰', announcement: '📢' };
  const typeColors: Record<string, string> = { task: '#10b981', crm: '#8b5cf6', webinar: '#06b6d4', mention: '#f59e0b', deadline: '#f43f5e', announcement: '#ec4899' };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>Notifications</h1>
          <p className="text-xs mt-1" style={{ color: mutedColor }}>{notifications.filter(n => !n.is_read).length} unread</p>
        </div>
        <button className="text-xs font-medium" style={{ color: '#8b5cf6' }} onClick={() => notifications.forEach(n => markNotificationRead(n.id))}>Mark all as read</button>
      </div>
      <div className="space-y-2">
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl">🔔</span>
            <p className="text-sm mt-3" style={{ color: mutedColor }}>No notifications yet</p>
          </div>
        )}
        {notifications.map((n, i) => (
          <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            whileHover={{ x: 4 }} onClick={() => markNotificationRead(n.id)}
            className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all"
            style={{
              background: n.is_read ? 'transparent' : (isDark ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.04)'),
              border: `1px solid ${n.is_read ? 'transparent' : 'rgba(139,92,246,0.1)'}`,
            }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${typeColors[n.type] || '#8b5cf6'}15` }}>
              {typeIcons[n.type] || '📌'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: textColor }}>{n.title}</p>
              <p className="text-xs mt-0.5" style={{ color: mutedColor }}>{n.message}</p>
              <p className="text-[10px] mt-1" style={{ color: mutedColor }}>
                {new Date(n.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {!n.is_read && <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
