'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { weeklyProductivity, monthlyRevenue, focusSessionsData, pipelineData } from '@/lib/mockData';

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function AnalyticsView() {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const tooltipStyle = { background: isDark ? '#1a1a25' : '#fff', border: 'none', borderRadius: 12, fontSize: 12 };

  const attendanceData = [
    { day: 'Mon', present: 7, absent: 1 },
    { day: 'Tue', present: 8, absent: 0 },
    { day: 'Wed', present: 6, absent: 2 },
    { day: 'Thu', present: 8, absent: 0 },
    { day: 'Fri', present: 7, absent: 1 },
  ];

  const conversionData = [
    { week: 'W1', rate: 12 }, { week: 'W2', rate: 18 }, { week: 'W3', rate: 15 },
    { week: 'W4', rate: 22 }, { week: 'W5', rate: 28 }, { week: 'W6', rate: 25 },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: textColor }}>Analytics Dashboard</h1>
        <p className="text-xs mt-1" style={{ color: mutedColor }}>Comprehensive team and business performance insights</p>
      </div>

      {/* Summary Stats */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tasks Completed', value: '142', delta: '+18%', icon: '✅', color: '#10b981' },
          { label: 'Focus Hours', value: '86.5h', delta: '+12%', icon: '🧘', color: '#06b6d4' },
          { label: 'Leads Converted', value: '28', delta: '+25%', icon: '🎯', color: '#8b5cf6' },
          { label: 'Revenue', value: '₹1.95L', delta: '+8%', icon: '💰', color: '#f59e0b' },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ y: -3 }} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{s.icon}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${s.color}15`, color: s.color }}>{s.delta}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: textColor }}>{s.value}</p>
            <p className="text-[11px]" style={{ color: mutedColor }}>{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>📊 Task Completion Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyProductivity}>
              <defs><linearGradient id="atg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="day" tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="tasks" stroke="#8b5cf6" fill="url(#atg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={item} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>🧘 Focus Time Analytics</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={focusSessionsData}>
              <XAxis dataKey="date" tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="minutes" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={item} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>📋 Attendance Overview</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendanceData}>
              <XAxis dataKey="day" tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="present" fill="#10b981" radius={[6, 6, 0, 0]} stackId="a" />
              <Bar dataKey="absent" fill="#f43f5e" radius={[6, 6, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={item} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>🎯 CRM Conversion Rate</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={conversionData}>
              <XAxis dataKey="week" tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Rate']} />
              <Line type="monotone" dataKey="rate" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Revenue */}
      <motion.div variants={item} className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>💰 Revenue vs Target</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyRevenue}>
            <XAxis dataKey="month" tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: mutedColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString()}`, '']} />
            <Bar dataKey="revenue" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            <Bar dataKey="target" fill={isDark ? '#2a2a3a' : '#e5e2f0'} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}
