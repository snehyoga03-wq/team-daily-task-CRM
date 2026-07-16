'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { weeklyProductivity } from '@/lib/mockData';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function DashboardView() {
  const { theme, tasks, leads, teamMembers } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';

  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  const newLeads = leads.filter(l => l.status === 'new_lead').length;

  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const userName = currentUser?.full_name?.split(' ')[0] || 'Team';

  const stats = [
    { label: 'Total Tasks', value: String(tasks.length), sub: `${doneTasks} completed`, icon: '✅', color: '#8b5cf6', delta: '' },
    { label: 'Pending', value: String(todoTasks), sub: `${urgentTasks} urgent`, icon: '⏳', color: '#f59e0b', delta: '' },
    { label: 'Focus Hours', value: '—', sub: 'Start a session', icon: '🧘', color: '#06b6d4', delta: '' },
    { label: 'CRM Leads', value: String(leads.length), sub: `${newLeads} new`, icon: '🎯', color: '#10b981', delta: '' },
    { label: 'Team', value: String(teamMembers.length), sub: 'members', icon: '👥', color: '#ec4899', delta: '' },
    { label: 'Done Rate', value: tasks.length > 0 ? `${Math.round((doneTasks / tasks.length) * 100)}%` : '—', sub: 'completion', icon: '📈', color: '#22c55e', delta: '' },
  ];

  // Use real tasks from DB for "today's tasks"
  const todaysTasks = tasks.slice(0, 6).map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    time: '',
    done: t.status === 'done',
  }));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Greeting */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold" style={{ color: textColor }}>{greeting}, {userName} 🧘‍♀️</h1>
        <p className="text-sm mt-1" style={{ color: mutedColor }}>Here&apos;s your productivity overview for today</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <motion.div key={i} whileHover={{ y: -3, scale: 1.02 }} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{s.icon}</span>
              {s.delta && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${s.color}20`, color: s.color }}>{s.delta}</span>}
            </div>
            <p className="text-xl font-bold" style={{ color: textColor }}>{s.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: mutedColor }}>{s.label}</p>
            <p className="text-[10px]" style={{ color: s.color }}>{s.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-5">
        {/* Productivity Chart */}
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>📊 Weekly Productivity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyProductivity}>
              <defs>
                <linearGradient id="gradTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFocus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: isDark ? '#1a1a25' : '#fff', border: 'none', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="tasks" stroke="#8b5cf6" fill="url(#gradTasks)" strokeWidth={2} />
              <Area type="monotone" dataKey="focus" stroke="#06b6d4" fill="url(#gradFocus)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-5">
        {/* Today's Tasks */}
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>✅ Today&apos;s Tasks</h3>
          <div className="space-y-2">
            {todaysTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: isDark ? 'rgba(26,26,37,0.4)' : 'rgba(255,255,255,0.4)' }}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] ${t.done ? 'bg-green-500 border-green-500 text-white' : ''}`} style={{ borderColor: t.done ? undefined : '#8b5cf6' }}>
                  {t.done && '✓'}
                </div>
                <span className={`text-xs flex-1 ${t.done ? 'line-through' : ''}`} style={{ color: t.done ? mutedColor : textColor }}>{t.title}</span>
                <span className={`badge badge-${t.priority}`}>{t.priority}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

    </motion.div>
  );
}
