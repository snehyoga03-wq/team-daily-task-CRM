'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import * as dataService from '@/lib/dataService';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default function HRManagementView() {
  const { theme, teamMembers } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const borderColor = isDark ? '#2a2a3a' : '#e5e2f0';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'leave' | 'holidays' | 'policy'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Data state
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [latePolicy, setLatePolicy] = useState<any>(null);

  // Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');

  useEffect(() => {
    async function loadHRData() {
      setLoading(true);
      try {
        const [attendanceData, holidaysData, leaveData, policyData] = await Promise.all([
          dataService.fetchAllAttendanceData(),
          dataService.fetchHolidays(),
          dataService.fetchLeaveRequests(),
          dataService.fetchLatePolicySettings(),
        ]);
        setAllAttendance(attendanceData || []);
        setHolidays(holidaysData || []);
        setLeaveRequests(leaveData || []);
        setLatePolicy(policyData);
      } catch (err) {
        console.error('Error loading HR data', err);
      } finally {
        setLoading(false);
      }
    }
    loadHRData();
  }, []);

  // Compute Dashboard Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysAttendance = allAttendance.filter(a => a.date === todayStr);
  
  const presentToday = todaysAttendance.filter(a => ['present', 'late', 'on_break'].includes(a.status)).length;
  const absentToday = teamMembers.length - presentToday;
  const lateToday = todaysAttendance.filter(a => a.status === 'late').length;
  const leaveToday = todaysAttendance.filter(a => a.status === 'leave').length;

  // Chart Data Mockup based on recent history
  const chartData = useMemo(() => {
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayData = allAttendance.filter(a => a.date === date);
      return {
        name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        Present: dayData.filter(a => ['present', 'late'].includes(a.status)).length,
        Late: dayData.filter(a => a.status === 'late').length,
      };
    });
  }, [allAttendance]);

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'hr') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <span className="text-6xl mb-4">🔒</span>
        <h2 className="text-xl font-bold" style={{ color: textColor }}>Access Denied</h2>
        <p style={{ color: mutedColor }}>You do not have permission to view the HR Management System.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold gradient-text bg-gradient-to-r from-blue-600 to-indigo-600">HR Management System</h1>
        <p className="text-sm mt-1" style={{ color: mutedColor }}>Comprehensive Human Resources Dashboard & Controls</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor }}>
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'history', label: '📅 Full History' },
          { id: 'leave', label: '🏖️ Leave Management' },
          { id: 'holidays', label: '🎉 Holidays' },
          { id: 'policy', label: '⏱️ Late Policy' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-semibold transition-all relative ${activeTab === tab.id ? 'text-blue-500' : ''}`}
            style={{ color: activeTab !== tab.id ? mutedColor : undefined }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="hr-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center" style={{ color: mutedColor }}>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Loading HR data...
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Employees', value: teamMembers.length, icon: '👥', color: 'blue' },
                    { label: 'Present Today', value: presentToday, icon: '🟢', color: 'emerald' },
                    { label: 'Absent Today', value: absentToday, icon: '🔴', color: 'rose' },
                    { label: 'Late Today', value: lateToday, icon: '🟠', color: 'amber' },
                    { label: 'On Leave', value: leaveToday, icon: '🏖️', color: 'purple' },
                    { label: 'Avg Working Hrs', value: '8h 15m', icon: '⏱️', color: 'cyan' },
                  ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ y: -2 }} className="glass-card p-5 relative overflow-hidden shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: mutedColor }}>{stat.label}</p>
                          <h3 className="text-2xl font-bold" style={{ color: textColor }}>{stat.value}</h3>
                        </div>
                        <span className="text-2xl">{stat.icon}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-card p-5 shadow-sm">
                    <h3 className="font-semibold mb-4" style={{ color: textColor }}>7-Day Attendance Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                          <XAxis dataKey="name" stroke={mutedColor} fontSize={12} />
                          <YAxis stroke={mutedColor} fontSize={12} />
                          <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1e1b2e' : '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend />
                          <Line type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="Late" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-card p-5 shadow-sm">
                    <h3 className="font-semibold mb-4" style={{ color: textColor }}>Department Breakdown</h3>
                    <div className="h-64 flex items-center justify-center text-sm" style={{ color: mutedColor }}>
                      (Pie chart implementation pending department mapping)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl glass-card">
                  <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
                    <input type="text" placeholder="Search employee..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className="input-field max-w-xs text-sm" />
                    <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)} className="input-field max-w-xs text-sm">
                      <option value="all">All Statuses</option>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="absent">Absent</option>
                      <option value="leave">Leave</option>
                    </select>
                  </div>
                  <button className="btn-primary text-xs" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: textColor }}>
                    ⬇️ Export HR Report
                  </button>
                </div>

                <div className="glass-card overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b" style={{ borderColor, color: mutedColor }}>
                        <th className="p-4 font-semibold">Date</th>
                        <th className="p-4 font-semibold">Employee</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold">Check In</th>
                        <th className="p-4 font-semibold">Check Out</th>
                        <th className="p-4 font-semibold">Working Hrs</th>
                        <th className="p-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: isDark ? 'rgba(42,42,58,0.5)' : 'rgba(229,226,240,0.5)' }}>
                      {allAttendance.filter(a => 
                        (historyFilter === 'all' || a.status === historyFilter) &&
                        (!historySearch || a.user?.full_name?.toLowerCase().includes(historySearch.toLowerCase()))
                      ).slice(0, 50).map((record) => {
                        const checkIn = record.check_in ? new Date(record.check_in) : null;
                        const checkOut = record.check_out ? new Date(record.check_out) : null;
                        const workingMs = checkIn && checkOut ? checkOut.getTime() - checkIn.getTime() : 0;
                        
                        return (
                          <tr key={record.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="p-4" style={{ color: textColor }}>{new Date(record.date).toLocaleDateString()}</td>
                            <td className="p-4 font-medium" style={{ color: textColor }}>{record.user?.full_name || 'Unknown'}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                record.status === 'present' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                record.status === 'late' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                record.status === 'leave' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                                'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="p-4" style={{ color: textColor }}>{checkIn ? checkIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                            <td className="p-4" style={{ color: textColor }}>{checkOut ? checkOut.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                            <td className="p-4 font-mono" style={{ color: textColor }}>{workingMs > 0 ? formatDuration(workingMs) : '-'}</td>
                            <td className="p-4">
                              <button className="text-blue-500 hover:underline text-xs">Edit</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {allAttendance.length === 0 && (
                    <div className="p-8 text-center" style={{ color: mutedColor }}>No attendance history found.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'leave' && (
              <div className="glass-card p-6">
                <h2 className="text-xl font-bold mb-4" style={{ color: textColor }}>Leave Applications</h2>
                <div className="space-y-4">
                  {leaveRequests.length === 0 ? (
                    <div className="text-center py-8" style={{ color: mutedColor }}>No leave requests pending.</div>
                  ) : (
                    leaveRequests.map(req => (
                      <div key={req.id} className="p-4 rounded-xl border flex justify-between items-center" style={{ borderColor }}>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: textColor }}>{req.user?.full_name} <span className="text-xs bg-gray-500/20 px-2 py-0.5 rounded ml-2">{req.leave_type}</span></p>
                          <p className="text-xs mt-1" style={{ color: mutedColor }}>{req.start_date} to {req.end_date} • {req.reason}</p>
                        </div>
                        <div className="flex gap-2">
                          {req.status === 'pending' ? (
                            <>
                              <button className="bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-semibold">Approve</button>
                              <button className="bg-rose-500 text-white px-3 py-1.5 rounded text-xs font-semibold">Reject</button>
                            </>
                          ) : (
                            <span className="text-xs font-bold uppercase" style={{ color: req.status === 'approved' ? '#10b981' : '#f43f5e' }}>{req.status}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'holidays' && (
              <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold" style={{ color: textColor }}>Company Holidays (2026)</h2>
                  <button className="btn-primary text-sm px-4 py-2">➕ Add Holiday</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {holidays.map(h => (
                    <div key={h.id} className="p-4 rounded-xl border border-l-4" style={{ borderColor, borderLeftColor: h.type === 'public' ? '#3b82f6' : '#8b5cf6' }}>
                      <p className="text-xs font-bold uppercase mb-1" style={{ color: h.type === 'public' ? '#3b82f6' : '#8b5cf6' }}>{h.type}</p>
                      <h4 className="font-bold" style={{ color: textColor }}>{h.name}</h4>
                      <p className="text-sm mt-1" style={{ color: mutedColor }}>{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
                  ))}
                  {holidays.length === 0 && <p style={{ color: mutedColor }}>No holidays configured.</p>}
                </div>
              </div>
            )}

            {activeTab === 'policy' && (
              <div className="glass-card p-6 max-w-2xl">
                <h2 className="text-xl font-bold mb-6" style={{ color: textColor }}>Late Policy & Timings Settings</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <label className="text-sm font-semibold" style={{ color: textColor }}>Official Reporting Time</label>
                    <input type="time" disabled value={latePolicy?.reporting_time?.substring(0,5) || '09:30'} className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <label className="text-sm font-semibold" style={{ color: textColor }}>Grace Period (Minutes)</label>
                    <input type="number" disabled value={latePolicy?.grace_period_minutes || 15} className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <label className="text-sm font-semibold" style={{ color: textColor }}>Half Day Start Time</label>
                    <input type="time" disabled value={latePolicy?.half_day_start_time?.substring(0,5) || '12:00'} className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <label className="text-sm font-semibold" style={{ color: textColor }}>Max Allowed Late Marks / Month</label>
                    <input type="number" disabled value={latePolicy?.allowed_late_marks_per_month || 3} className="input-field" />
                  </div>
                  <div className="pt-4 mt-4 border-t" style={{ borderColor }}>
                    <button className="btn-primary w-full py-3 opacity-50 cursor-not-allowed">Save Policy Changes</button>
                    <p className="text-xs text-center mt-2" style={{ color: mutedColor }}>Form disabled in preview mode.</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
