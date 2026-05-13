'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { weeklyProductivity, monthlyRevenue, leadSources, pipelineData } from '@/lib/mockData';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function DashboardView() {
  const { theme, tasks } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';

  const stats = [
    { label: "Today's Tasks", value: '8', sub: '3 completed', icon: '✅', color: '#8b5cf6', delta: '+2' },
    { label: 'Pending Tasks', value: '12', sub: '4 urgent', icon: '⏳', color: '#f59e0b', delta: '-3' },
    { label: 'Focus Hours', value: '5.2h', sub: 'Today', icon: '🧘', color: '#06b6d4', delta: '+1.2' },
    { label: 'CRM Leads', value: '24', sub: '6 new today', icon: '🎯', color: '#10b981', delta: '+6' },
    { label: 'Team Online', value: '5/8', sub: 'Active now', icon: '👥', color: '#ec4899', delta: '' },
    { label: 'Productivity', value: '75%', sub: '↑ 12%', icon: '📈', color: '#22c55e', delta: '+12%' },
  ];

  const todaysTasks = [
    { id: 1, title: 'Follow up with webinar attendees', priority: 'urgent', time: '9:00 AM', done: false },
    { id: 2, title: 'WhatsApp broadcast campaign', priority: 'high', time: '10:00 AM', done: false },
    { id: 3, title: 'Design webinar landing page', priority: 'high', time: '11:00 AM', done: false },
    { id: 4, title: 'Team standup meeting', priority: 'medium', time: '10:30 AM', done: true },
    { id: 5, title: 'Review sales report', priority: 'medium', time: '2:00 PM', done: true },
    { id: 6, title: 'Customer support check-in', priority: 'low', time: '3:00 PM', done: true },
  ];

  const COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#6b7280'];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Greeting */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold" style={{ color: textColor }}>Good Morning, Sneha 🧘‍♀️</h1>
        <p className="text-sm mt-1" style={{ color: mutedColor }}>Here&apos;s your productivity overview for today</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

        {/* Revenue Chart */}
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>💰 Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyRevenue}>
              <XAxis dataKey="month" tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip contentStyle={{ background: isDark ? '#1a1a25' : '#fff', border: 'none', borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`₹${v.toLocaleString()}`, '']} />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="target" fill={isDark ? '#2a2a3a' : '#e5e2f0'} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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

        {/* Lead Sources */}
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>🎯 Lead Sources</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={leadSources} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="count">
                  {leadSources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: isDark ? '#1a1a25' : '#fff', border: 'none', borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {leadSources.slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-[11px]" style={{ color: mutedColor }}>{s.source} ({s.count})</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sales Pipeline */}
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>💼 Sales Pipeline</h3>
          <div className="space-y-3">
            {pipelineData.map((p, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: textColor }}>{p.stage}</span>
                  <span className="text-xs font-semibold" style={{ color: p.color }}>{p.count}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.count / 24) * 100}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t flex justify-between" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
            <span className="text-xs" style={{ color: mutedColor }}>Total Pipeline Value</span>
            <span className="text-sm font-bold gradient-text">₹4,32,923</span>
          </div>
        </motion.div>
      </div>

      {/* Team Leaderboard */}
      <motion.div variants={item} className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>🏆 Team Leaderboard</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: 'Sneha Sharma', avatar: '🧘‍♀️', xp: 4850, level: 12, streak: 45, tasks: 28 },
            { name: 'Ravi Kumar', avatar: '⚡', xp: 4200, level: 11, streak: 38, tasks: 24 },
            { name: 'Arjun Mehta', avatar: '🎯', xp: 3750, level: 10, streak: 30, tasks: 22 },
            { name: 'Meera Nair', avatar: '✨', xp: 3400, level: 9, streak: 20, tasks: 18 },
          ].map((m, i) => (
            <motion.div key={i} whileHover={{ y: -2 }} className="pipeline-card p-4 text-center relative overflow-hidden">
              {i === 0 && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #9333ea, #06b6d4)' }} />}
              <div className="text-xs font-bold mb-2" style={{ color: i === 0 ? '#f59e0b' : mutedColor }}>#{i + 1}</div>
              <div className="text-3xl mb-2">{m.avatar}</div>
              <p className="text-sm font-semibold" style={{ color: textColor }}>{m.name}</p>
              <p className="text-xs mt-1" style={{ color: '#8b5cf6' }}>{m.xp} XP · Level {m.level}</p>
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className="text-[10px]" style={{ color: mutedColor }}>🔥 {m.streak}d</span>
                <span className="text-[10px]" style={{ color: mutedColor }}>✅ {m.tasks}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
