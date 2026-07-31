'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import * as dataService from '@/lib/dataService';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';

function formatDuration(ms: number) {
  if (!ms || ms <= 0) return '0h 0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function formatHoursNumber(ms: number) {
  if (!ms || ms <= 0) return 0;
  return Number((ms / (1000 * 60 * 60)).toFixed(1));
}

const COLORS = {
  present: '#10b981',
  late: '#f59e0b',
  half_day: '#eab308',
  absent: '#f43f5e',
  leave: '#a855f7',
  on_break: '#06b6d4',
  checked_out: '#3b82f6',
};

export default function HRManagementView() {
  const { theme, teamMembers, tasks } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const borderColor = isDark ? '#2a2a3a' : '#e5e2f0';
  const cardBg = isDark ? 'rgba(24, 24, 35, 0.7)' : 'rgba(255, 255, 255, 0.8)';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'history' | 'leave' | 'holidays' | 'policy'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Data state
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [latePolicy, setLatePolicy] = useState<any>(null);

  // Employee Detail view state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState('all');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().substring(0, 7)); // e.g. "2026-07"
  const [empAttendanceHistory, setEmpAttendanceHistory] = useState<any[]>([]);
  const [loadingEmpHistory, setLoadingEmpHistory] = useState(false);
  const [empTableStatusFilter, setEmpTableStatusFilter] = useState('all');

  // History Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');

  // Edit / Add Attendance Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null); // null if creating new
  const [editUserId, setEditUserId] = useState('');
  const [editDate, setEditDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [editStatus, setEditStatus] = useState<string>('present');
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  // Fetch individual employee history when selectedEmployeeId changes
  useEffect(() => {
    if (!selectedEmployeeId) {
      setEmpAttendanceHistory([]);
      return;
    }
    async function fetchEmpData() {
      setLoadingEmpHistory(true);
      try {
        const history = await dataService.fetchUserAttendanceHistory(selectedEmployeeId!);
        setEmpAttendanceHistory(history);
      } catch (err) {
        console.error('Failed to load employee history', err);
        setEmpAttendanceHistory(allAttendance.filter(a => a.user_id === selectedEmployeeId));
      } finally {
        setLoadingEmpHistory(false);
      }
    }
    fetchEmpData();
  }, [selectedEmployeeId, allAttendance]);

  // Open Edit Modal Helper
  const handleOpenEditModal = (record?: any, defaultUserId?: string) => {
    setSaveError(null);
    if (record) {
      setEditingRecord(record);
      setEditUserId(record.user_id || record.user?.id || '');
      setEditDate(record.date || new Date().toISOString().split('T')[0]);
      setEditStatus(record.status || 'present');
      setEditCheckIn(record.check_in ? new Date(record.check_in).toTimeString().substring(0, 5) : '09:30');
      setEditCheckOut(record.check_out ? new Date(record.check_out).toTimeString().substring(0, 5) : '18:00');
      setEditNotes(record.notes || '');
    } else {
      setEditingRecord(null);
      setEditUserId(defaultUserId || selectedEmployeeId || (teamMembers[0]?.id || ''));
      setEditDate(new Date().toISOString().split('T')[0]);
      setEditStatus('present');
      setEditCheckIn('09:30');
      setEditCheckOut('18:00');
      setEditNotes('');
    }
    setEditModalOpen(true);
  };

  // Handle Save Attendance
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId || !editDate) {
      setSaveError('Please select an employee and date.');
      return;
    }
    setSavingAttendance(true);
    setSaveError(null);

    try {
      // Build ISO check_in and check_out strings if provided
      let checkInIso = null;
      let checkOutIso = null;

      if (editCheckIn && editStatus !== 'absent' && editStatus !== 'leave') {
        checkInIso = new Date(`${editDate}T${editCheckIn}:00`).toISOString();
      }
      if (editCheckOut && editStatus !== 'absent' && editStatus !== 'leave') {
        checkOutIso = new Date(`${editDate}T${editCheckOut}:00`).toISOString();
      }

      const payload: any = {
        user_id: editUserId,
        date: editDate,
        status: editStatus,
        check_in: checkInIso,
        check_out: checkOutIso,
        notes: editNotes || null,
      };

      let updatedRow: any;
      if (editingRecord?.id) {
        updatedRow = await dataService.updateAttendanceRecord(editingRecord.id, payload);
      } else {
        updatedRow = await dataService.createAttendanceRecord(payload);
      }

      // Attach user object to updatedRow if missing
      if (!updatedRow.user) {
        const userObj = teamMembers.find(m => m.id === editUserId);
        if (userObj) updatedRow.user = userObj;
      }

      // Refresh memory states
      setAllAttendance(prev => {
        const index = prev.findIndex(a => a.id === updatedRow.id || (a.user_id === editUserId && a.date === editDate));
        if (index >= 0) {
          const newArr = [...prev];
          newArr[index] = updatedRow;
          return newArr;
        }
        return [updatedRow, ...prev];
      });

      if (selectedEmployeeId === editUserId) {
        setEmpAttendanceHistory(prev => {
          const index = prev.findIndex(a => a.id === updatedRow.id || (a.user_id === editUserId && a.date === editDate));
          if (index >= 0) {
            const newArr = [...prev];
            newArr[index] = updatedRow;
            return newArr;
          }
          return [updatedRow, ...prev];
        });
      }

      setEditModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save attendance:', err);
      setSaveError(err.message || 'Failed to save attendance record.');
    } finally {
      setSavingAttendance(false);
    }
  };

  // Compute Dashboard Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysAttendance = allAttendance.filter(a => a.date === todayStr);
  
  const presentToday = todaysAttendance.filter(a => ['present', 'late', 'on_break', 'checked_out'].includes(a.status)).length;
  const absentToday = Math.max(0, teamMembers.length - presentToday);
  const lateToday = todaysAttendance.filter(a => a.status === 'late').length;
  const halfDayToday = todaysAttendance.filter(a => a.status === 'half_day').length;
  const leaveToday = todaysAttendance.filter(a => a.status === 'leave').length;

  // Selected Employee computed details
  const selectedEmp = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return teamMembers.find(m => m.id === selectedEmployeeId) || null;
  }, [selectedEmployeeId, teamMembers]);

  // Selected Employee Month Attendance Data
  const empMonthData = useMemo(() => {
    if (!selectedEmployeeId) return { filteredLogs: [], stats: {} as any, chartData: [], pieData: [] };
    
    // Filter history by month if selectedMonth != 'all'
    const logs = empAttendanceHistory.filter(a => {
      if (selectedMonth === 'all') return true;
      return a.date?.startsWith(selectedMonth);
    });

    const presentCount = logs.filter(a => ['present', 'checked_out'].includes(a.status)).length;
    const lateCount = logs.filter(a => a.status === 'late').length;
    const halfDayCount = logs.filter(a => a.status === 'half_day').length;
    const absentCount = logs.filter(a => a.status === 'absent').length;
    const leaveCount = logs.filter(a => a.status === 'leave').length;

    let totalWorkingMs = 0;
    logs.forEach(a => {
      if (a.check_in && a.check_out) {
        const diff = new Date(a.check_out).getTime() - new Date(a.check_in).getTime();
        if (diff > 0) totalWorkingMs += diff;
      }
    });

    const totalRecordedDays = logs.length;
    const effectiveDaysWorked = presentCount + lateCount + (halfDayCount * 0.5);
    const attendanceRate = totalRecordedDays > 0 ? ((effectiveDaysWorked / totalRecordedDays) * 100).toFixed(1) : '100';
    const punctualityScore = (presentCount + lateCount) > 0 ? ((presentCount / (presentCount + lateCount)) * 100).toFixed(1) : '100';
    const avgMs = (presentCount + lateCount + halfDayCount) > 0 ? totalWorkingMs / (presentCount + lateCount + halfDayCount) : 0;

    // Daily Work Hours Bar Chart Data
    const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    const chartData = sortedLogs.slice(-30).map(a => {
      let hours = 0;
      if (a.check_in && a.check_out) {
        hours = formatHoursNumber(new Date(a.check_out).getTime() - new Date(a.check_in).getTime());
      }
      return {
        date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: hours,
        status: a.status,
      };
    });

    // Pie chart distribution
    const pieData = [
      { name: 'Present', value: presentCount, color: COLORS.present },
      { name: 'Late', value: lateCount, color: COLORS.late },
      { name: 'Half Day', value: halfDayCount, color: COLORS.half_day },
      { name: 'Absent', value: absentCount, color: COLORS.absent },
      { name: 'Leave', value: leaveCount, color: COLORS.leave },
    ].filter(d => d.value > 0);

    return {
      filteredLogs: logs,
      stats: {
        presentCount,
        lateCount,
        halfDayCount,
        absentCount,
        leaveCount,
        totalWorkingMs,
        totalHoursFormatted: formatDuration(totalWorkingMs),
        avgDailyHours: formatDuration(avgMs),
        attendanceRate,
        punctualityScore,
        totalRecordedDays
      },
      chartData,
      pieData
    };
  }, [selectedEmployeeId, empAttendanceHistory, selectedMonth]);

  // Selected Employee Leave Requests
  const empLeaveRequests = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return leaveRequests.filter(r => r.user_id === selectedEmployeeId || r.user?.id === selectedEmployeeId);
  }, [selectedEmployeeId, leaveRequests]);

  // Selected Employee Tasks
  const empTasks = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return tasks.filter(t => t.assignee_id === selectedEmployeeId);
  }, [selectedEmployeeId, tasks]);

  const empCompletedTasks = empTasks.filter(t => t.status === 'done').length;

  // Chart Data for general dashboard
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
        Present: dayData.filter(a => ['present', 'late', 'checked_out'].includes(a.status)).length,
        Late: dayData.filter(a => a.status === 'late').length,
        HalfDay: dayData.filter(a => a.status === 'half_day').length,
      };
    });
  }, [allAttendance]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set<string>();
    teamMembers.forEach(m => {
      if (m.department) depts.add(m.department);
      if ((m as any).role) depts.add((m as any).role);
    });
    return Array.from(depts);
  }, [teamMembers]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold gradient-text bg-gradient-to-r from-blue-600 to-indigo-600">
            HR Management System
          </h1>
          <p className="text-sm mt-1" style={{ color: mutedColor }}>
            Comprehensive Human Resources Dashboard, Employee Directory & Attendance Override Controls
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenEditModal(null)}
            className="btn-primary text-xs px-4 py-2.5 flex items-center gap-2 shadow-md"
          >
            <span>➕ Log / Override Attendance</span>
          </button>
          {selectedEmployeeId && (
            <button
              onClick={() => setSelectedEmployeeId(null)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-sm"
              style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: textColor }}
            >
              ← Back to Employee Directory
            </button>
          )}
        </div>
      </div>

      {/* Tabs - Hidden when viewing individual employee details */}
      {!selectedEmployeeId && (
        <div className="flex gap-2 border-b overflow-x-auto pb-1" style={{ borderColor }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'employees', label: '👥 Employees' },
            { id: 'history', label: '📅 Full History' },
            { id: 'leave', label: '🏖️ Leave Management' },
            { id: 'holidays', label: '🎉 Holidays' },
            { id: 'policy', label: '⏱️ Late Policy' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedEmployeeId(null);
              }}
              className={`px-4 py-3 text-sm font-semibold transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'text-blue-500 font-bold' : ''}`}
              style={{ color: activeTab !== tab.id ? mutedColor : undefined }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="hr-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center" style={{ color: mutedColor }}>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Loading HR data...
        </div>
      ) : selectedEmployeeId ? (
        /* ─── INDIVIDUAL EMPLOYEE DETAILED DASHBOARD & ANALYTICS VIEW ─── */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Top Employee Profile Banner */}
          <div className="glass-card p-6 relative overflow-hidden shadow-md" style={{ background: cardBg }}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-3xl shadow-lg uppercase">
                    {selectedEmp?.avatar_url ? (
                      <img src={selectedEmp.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      selectedEmp?.full_name?.substring(0, 2) || 'EMP'
                    )}
                  </div>
                  {/* Today's status badge */}
                  {(() => {
                    const todayRecord = todaysAttendance.find(a => a.user_id === selectedEmployeeId);
                    const status = todayRecord?.status || 'absent';
                    return (
                      <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 ${
                        status === 'present' || status === 'checked_out' ? 'bg-emerald-500' :
                        status === 'late' ? 'bg-amber-500' :
                        status === 'half_day' ? 'bg-yellow-500' :
                        status === 'leave' ? 'bg-purple-500' :
                        'bg-rose-500'
                      }`} title={`Today's Status: ${status}`} />
                    );
                  })()}
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold" style={{ color: textColor }}>{selectedEmp?.full_name}</h2>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500">
                      {selectedEmp?.role || 'Employee'}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: mutedColor }}>
                    {selectedEmp?.department ? `${selectedEmp.department} Department • ` : ''}
                    📧 {selectedEmp?.email || 'No email registered'} {selectedEmp?.phone ? `• 📞 ${selectedEmp.phone}` : ''}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: mutedColor }}>
                    <span>⭐ Level {selectedEmp?.level || 1} ({selectedEmp?.xp_points || 0} XP)</span>
                    <span>🔥 {selectedEmp?.streak_days || 0} Day Streak</span>
                    <span>📅 Joined {selectedEmp?.created_at ? new Date(selectedEmp.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Month Selector Filter */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-black/5 dark:bg-white/5 p-3 rounded-2xl">
                <label className="text-xs font-semibold" style={{ color: mutedColor }}>Select Period:</label>
                <input
                  type="month"
                  value={selectedMonth === 'all' ? '' : selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value || 'all')}
                  className="input-field text-xs py-1.5 px-3 rounded-xl"
                />
                <button
                  onClick={() => setSelectedMonth('all')}
                  className={`px-3 py-1.5 text-xs rounded-xl transition-all ${selectedMonth === 'all' ? 'bg-blue-500 text-white font-bold' : 'bg-transparent text-gray-500'}`}
                >
                  All Time
                </button>
              </div>
            </div>
          </div>

          {loadingEmpHistory ? (
            <div className="p-12 text-center" style={{ color: mutedColor }}>
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              Calculating employee analytics...
            </div>
          ) : (
            <>
              {/* Detailed KPI Analysis Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-3">
                {[
                  { label: 'Present Days', value: empMonthData.stats.presentCount, icon: '🟢', color: 'emerald' },
                  { label: 'Absent Days', value: empMonthData.stats.absentCount, icon: '🔴', color: 'rose' },
                  { label: 'Half Days', value: empMonthData.stats.halfDayCount, icon: '🟡', color: 'amber' },
                  { label: 'Late Marks', value: empMonthData.stats.lateCount, icon: '🟠', color: 'orange' },
                  { label: 'Leave Days', value: empMonthData.stats.leaveCount, icon: '🏖️', color: 'purple' },
                  { label: 'Total Hours', value: empMonthData.stats.totalHoursFormatted, icon: '⏱️', color: 'cyan', sub: `Avg: ${empMonthData.stats.avgDailyHours}` },
                  { label: 'Attendance %', value: `${empMonthData.stats.attendanceRate}%`, icon: '📈', color: 'blue' },
                  { label: 'Punctuality', value: `${empMonthData.stats.punctualityScore}%`, icon: '🎯', color: 'indigo' },
                  { label: 'Total Tasks', value: empTasks.length, icon: '📋', color: 'blue' },
                  { label: 'Completed', value: empCompletedTasks, icon: '✅', color: 'emerald' },
                  { label: 'Pending', value: empTasks.length - empCompletedTasks, icon: '⏳', color: 'amber' },
                ].map((stat, i) => (
                  <motion.div key={i} whileHover={{ y: -2 }} className="glass-card p-4 relative overflow-hidden shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xl">{stat.icon}</span>
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: mutedColor }}>{stat.label}</p>
                      <h3 className="text-xl font-extrabold mt-1" style={{ color: textColor }}>{stat.value}</h3>
                    </div>
                    {stat.sub && (
                      <p className="text-[10px] mt-2 pt-1 border-t" style={{ borderColor, color: mutedColor }}>{stat.sub}</p>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Visual Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Work Hours Trend Chart */}
                <div className="glass-card p-5 shadow-sm lg:col-span-2">
                  <h3 className="font-semibold mb-4 text-sm flex items-center justify-between" style={{ color: textColor }}>
                    <span>📊 Daily Work Hours Timeline</span>
                    <span className="text-xs font-normal" style={{ color: mutedColor }}>Showing recent recorded days</span>
                  </h3>
                  <div className="h-64">
                    {empMonthData.chartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs" style={{ color: mutedColor }}>
                        No attendance records found for selected period.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={empMonthData.chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                          <XAxis dataKey="date" stroke={mutedColor} fontSize={11} />
                          <YAxis stroke={mutedColor} fontSize={11} unit="h" />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: isDark ? '#1e1b2e' : '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                            formatter={(value: any) => [`${value} hours`, 'Worked']}
                          />
                          <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Status Breakdown Pie Chart */}
                <div className="glass-card p-5 shadow-sm">
                  <h3 className="font-semibold mb-4 text-sm" style={{ color: textColor }}>🍩 Attendance Distribution</h3>
                  <div className="h-64">
                    {empMonthData.pieData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs" style={{ color: mutedColor }}>
                        No data available.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={empMonthData.pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {empMonthData.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Task Performance & Leave History Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Leave History */}
                <div className="glass-card p-5 shadow-sm">
                  <h3 className="font-semibold mb-3 text-sm flex items-center justify-between" style={{ color: textColor }}>
                    <span>🏖️ Leave Applications History</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 font-bold">
                      {empLeaveRequests.length} Total
                    </span>
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {empLeaveRequests.length === 0 ? (
                      <p className="text-xs py-4 text-center" style={{ color: mutedColor }}>No leave applications filed.</p>
                    ) : (
                      empLeaveRequests.map(req => (
                        <div key={req.id} className="p-3 rounded-xl border flex justify-between items-center text-xs" style={{ borderColor }}>
                          <div>
                            <span className="font-bold capitalize">{req.leave_type} Leave</span>
                            <p className="text-[11px] mt-0.5" style={{ color: mutedColor }}>
                              {req.start_date} to {req.end_date} • {req.reason}
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                            req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                            req.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Employee Task Overview */}
                <div className="glass-card p-5 shadow-sm">
                  <h3 className="font-semibold mb-3 text-sm flex items-center justify-between" style={{ color: textColor }}>
                    <span>✅ Assigned Tasks Overview</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
                      {empTasks.length} Tasks
                    </span>
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1" style={{ color: textColor }}>
                        <span>Completion Rate</span>
                        <span>{empTasks.length > 0 ? Math.round((empCompletedTasks / empTasks.length) * 100) : 0}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                          style={{ width: `${empTasks.length > 0 ? (empCompletedTasks / empTasks.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2">
                      <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                        <p className="text-[10px] font-semibold" style={{ color: mutedColor }}>TOTAL</p>
                        <p className="text-base font-extrabold" style={{ color: textColor }}>{empTasks.length}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-500/10">
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">DONE</p>
                        <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{empCompletedTasks}</p>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-500/10">
                        <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">PENDING</p>
                        <p className="text-base font-extrabold text-amber-600 dark:text-amber-400">{empTasks.length - empCompletedTasks}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Day-by-Day Attendance Log Table for Selected Employee */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-4">
                  <div>
                    <h3 className="font-bold text-base" style={{ color: textColor }}>📅 Detailed Attendance Log</h3>
                    <p className="text-xs" style={{ color: mutedColor }}>Showing day-by-day check-in, check-out and work durations</p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select 
                      value={empTableStatusFilter} 
                      onChange={e => setEmpTableStatusFilter(e.target.value)} 
                      className="input-field text-xs py-1.5 px-3"
                    >
                      <option value="all">All Statuses</option>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="half_day">Half Day</option>
                      <option value="absent">Absent</option>
                      <option value="leave">Leave</option>
                    </select>

                    <button 
                      onClick={() => handleOpenEditModal(null, selectedEmployeeId!)}
                      className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap"
                    >
                      ➕ Add Entry
                    </button>
                  </div>
                </div>

                <div className="glass-card overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b" style={{ borderColor, color: mutedColor }}>
                        <th className="p-4 font-semibold">Date</th>
                        <th className="p-4 font-semibold">Day</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold">Check In</th>
                        <th className="p-4 font-semibold">Check Out</th>
                        <th className="p-4 font-semibold">Work Hours</th>
                        <th className="p-4 font-semibold">Notes / Reason</th>
                        <th className="p-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: isDark ? 'rgba(42,42,58,0.5)' : 'rgba(229,226,240,0.5)' }}>
                      {empMonthData.filteredLogs
                        .filter(record => empTableStatusFilter === 'all' || record.status === empTableStatusFilter)
                        .map((record) => {
                          const dateObj = new Date(record.date);
                          const checkIn = record.check_in ? new Date(record.check_in) : null;
                          const checkOut = record.check_out ? new Date(record.check_out) : null;
                          const workingMs = checkIn && checkOut ? checkOut.getTime() - checkIn.getTime() : 0;

                          return (
                            <tr key={record.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                              <td className="p-4 font-medium" style={{ color: textColor }}>{dateObj.toLocaleDateString()}</td>
                              <td className="p-4" style={{ color: mutedColor }}>{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  record.status === 'present' || record.status === 'checked_out' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                  record.status === 'late' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                  record.status === 'half_day' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                                  record.status === 'leave' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                                  'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                }`}>
                                  {record.status?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-4" style={{ color: textColor }}>
                                {checkIn ? checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                              <td className="p-4" style={{ color: textColor }}>
                                {checkOut ? checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                              <td className="p-4 font-mono" style={{ color: textColor }}>
                                {workingMs > 0 ? formatDuration(workingMs) : '-'}
                              </td>
                              <td className="p-4 text-xs max-w-xs truncate" style={{ color: mutedColor }}>
                                {record.notes || '-'}
                              </td>
                              <td className="p-4">
                                <button 
                                  onClick={() => handleOpenEditModal(record)}
                                  className="text-blue-500 font-semibold hover:underline text-xs flex items-center gap-1"
                                >
                                  ✏️ Edit Record
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {empMonthData.filteredLogs.length === 0 && (
                    <div className="p-8 text-center" style={{ color: mutedColor }}>
                      No attendance logs recorded for this period.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
      ) : (
        /* ─── MAIN TABS CONTENT ─── */
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* 📊 DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Interactive KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Clickable Total Employees Card */}
                  <motion.div 
                    whileHover={{ y: -3, scale: 1.02 }} 
                    onClick={() => setActiveTab('employees')}
                    className="glass-card p-5 relative overflow-hidden shadow-sm cursor-pointer border-2 border-blue-500/30 hover:border-blue-500 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: mutedColor }}>Total Employees</p>
                        <h3 className="text-2xl font-bold text-blue-500">{teamMembers.length}</h3>
                      </div>
                      <span className="text-2xl group-hover:scale-110 transition-transform">👥</span>
                    </div>
                    <p className="text-[10px] text-blue-500 font-semibold mt-2 flex items-center gap-1">
                      Click to view directory & dashboards →
                    </p>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} className="glass-card p-5 relative overflow-hidden shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: mutedColor }}>Present Today</p>
                        <h3 className="text-2xl font-bold text-emerald-500">{presentToday}</h3>
                      </div>
                      <span className="text-2xl">🟢</span>
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} className="glass-card p-5 relative overflow-hidden shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: mutedColor }}>Absent Today</p>
                        <h3 className="text-2xl font-bold text-rose-500">{absentToday}</h3>
                      </div>
                      <span className="text-2xl">🔴</span>
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} className="glass-card p-5 relative overflow-hidden shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: mutedColor }}>Late Today</p>
                        <h3 className="text-2xl font-bold text-amber-500">{lateToday}</h3>
                      </div>
                      <span className="text-2xl">🟠</span>
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} className="glass-card p-5 relative overflow-hidden shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: mutedColor }}>Half Day Today</p>
                        <h3 className="text-2xl font-bold text-yellow-500">{halfDayToday}</h3>
                      </div>
                      <span className="text-2xl">🟡</span>
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ y: -2 }} className="glass-card p-5 relative overflow-hidden shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: mutedColor }}>On Leave Today</p>
                        <h3 className="text-2xl font-bold text-purple-500">{leaveToday}</h3>
                      </div>
                      <span className="text-2xl">🏖️</span>
                    </div>
                  </motion.div>
                </div>

                {/* Charts & Quick Access */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          <Line type="monotone" dataKey="HalfDay" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-card p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold mb-2" style={{ color: textColor }}>👥 Quick Employee Directory Overview</h3>
                      <p className="text-xs mb-4" style={{ color: mutedColor }}>
                        Click below to view full detailed dashboards and attendance history for any employee.
                      </p>
                      
                      <div className="space-y-2">
                        {teamMembers.slice(0, 4).map(member => {
                          const todayRecord = todaysAttendance.find(a => a.user_id === member.id);
                          const status = todayRecord?.status || 'absent';
                          const memberTasks = tasks.filter(t => t.assignee_id === member.id);
                          const totalT = memberTasks.length;
                          const doneT = memberTasks.filter(t => t.status === 'done').length;
                          const pendingT = totalT - doneT;

                          return (
                            <div 
                              key={member.id}
                              onClick={() => {
                                setSelectedEmployeeId(member.id);
                              }}
                              className="p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              style={{ borderColor }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 font-bold flex items-center justify-center text-xs uppercase">
                                  {member.full_name?.substring(0, 2) || 'EM'}
                                </div>
                                <div>
                                  <p className="font-semibold text-xs" style={{ color: textColor }}>{member.full_name}</p>
                                  <p className="text-[10px]" style={{ color: mutedColor }}>{member.role || member.department || 'Employee'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-500" title="Tasks: Completed / Total (Pending)">
                                  ✅ {doneT}/{totalT} ({pendingT} pending)
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  status === 'present' || status === 'checked_out' ? 'bg-emerald-500/10 text-emerald-500' :
                                  status === 'late' ? 'bg-amber-500/10 text-amber-500' :
                                  status === 'half_day' ? 'bg-yellow-500/10 text-yellow-500' :
                                  status === 'leave' ? 'bg-purple-500/10 text-purple-500' :
                                  'bg-rose-500/10 text-rose-500'
                                }`}>
                                  {status?.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-blue-500">→</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveTab('employees')}
                      className="w-full mt-4 py-2.5 rounded-xl bg-blue-500 text-white font-semibold text-xs hover:bg-blue-600 transition-colors"
                    >
                      View All {teamMembers.length} Employees & Dashboards
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 👥 EMPLOYEES DIRECTORY TAB */}
            {activeTab === 'employees' && (
              <div className="space-y-6">
                {/* Search & Filters Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                    <input
                      type="text"
                      placeholder="Search employee by name or email..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="input-field text-xs py-2 px-3 min-w-[240px]"
                    />

                    <select
                      value={employeeDeptFilter}
                      onChange={(e) => setEmployeeDeptFilter(e.target.value)}
                      className="input-field text-xs py-2 px-3"
                    >
                      <option value="all">All Departments / Roles</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>

                    <select
                      value={employeeStatusFilter}
                      onChange={(e) => setEmployeeStatusFilter(e.target.value)}
                      className="input-field text-xs py-2 px-3"
                    >
                      <option value="all">All Today's Statuses</option>
                      <option value="present">Present Today</option>
                      <option value="late">Late Today</option>
                      <option value="half_day">Half Day Today</option>
                      <option value="absent">Absent Today</option>
                      <option value="leave">On Leave Today</option>
                    </select>
                  </div>

                  <div className="text-xs font-semibold" style={{ color: mutedColor }}>
                    Showing {
                      teamMembers.filter(m => {
                        const matchSearch = !employeeSearch || 
                          m.full_name?.toLowerCase().includes(employeeSearch.toLowerCase()) || 
                          m.email?.toLowerCase().includes(employeeSearch.toLowerCase());
                        const matchDept = employeeDeptFilter === 'all' || 
                          m.department === employeeDeptFilter || 
                          m.role === employeeDeptFilter;
                        
                        const todayRecord = todaysAttendance.find(a => a.user_id === m.id);
                        const status = todayRecord?.status || 'absent';
                        const matchStatus = employeeStatusFilter === 'all' || status === employeeStatusFilter;
                        
                        return matchSearch && matchDept && matchStatus;
                      }).length
                    } of {teamMembers.length} Employees
                  </div>
                </div>

                {/* Employees Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {teamMembers
                    .filter(m => {
                      const matchSearch = !employeeSearch || 
                        m.full_name?.toLowerCase().includes(employeeSearch.toLowerCase()) || 
                        m.email?.toLowerCase().includes(employeeSearch.toLowerCase());
                      const matchDept = employeeDeptFilter === 'all' || 
                        m.department === employeeDeptFilter || 
                        m.role === employeeDeptFilter;
                      
                      const todayRecord = todaysAttendance.find(a => a.user_id === m.id);
                      const status = todayRecord?.status || 'absent';
                      const matchStatus = employeeStatusFilter === 'all' || status === employeeStatusFilter;

                      return matchSearch && matchDept && matchStatus;
                    })
                    .map(member => {
                      const todayRecord = todaysAttendance.find(a => a.user_id === member.id);
                      const status = todayRecord?.status || 'absent';

                      // Compute month quick attendance summary
                      const empMonthLogs = allAttendance.filter(a => a.user_id === member.id && a.date?.startsWith(selectedMonth));
                      const presentCount = empMonthLogs.filter(a => ['present', 'checked_out'].includes(a.status)).length;
                      const lateCount = empMonthLogs.filter(a => a.status === 'late').length;
                      const halfDayCount = empMonthLogs.filter(a => a.status === 'half_day').length;
                      const absentCount = empMonthLogs.filter(a => a.status === 'absent').length;

                      return (
                        <motion.div
                          key={member.id}
                          whileHover={{ y: -3 }}
                          className="glass-card p-5 shadow-sm flex flex-col justify-between relative overflow-hidden group"
                        >
                          <div>
                            {/* Member Header */}
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg uppercase shadow-sm">
                                  {member.avatar_url ? (
                                    <img src={member.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                                  ) : (
                                    member.full_name?.substring(0, 2) || 'EM'
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm" style={{ color: textColor }}>{member.full_name}</h4>
                                  <p className="text-xs" style={{ color: mutedColor }}>{member.role || 'Employee'}</p>
                                  {member.department && (
                                    <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-semibold mt-1">
                                      {member.department}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                status === 'present' || status === 'checked_out' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                status === 'late' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                status === 'half_day' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                                status === 'leave' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                                'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}>
                                {status?.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-1 text-xs mb-4" style={{ color: mutedColor }}>
                              <p className="truncate">📧 {member.email || 'No email'}</p>
                              <p>📞 {member.phone || 'No phone'}</p>
                            </div>

                            {/* Month Attendance Quick Stats */}
                            <div className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-black/5 dark:bg-white/5 text-center text-[10px] mb-2">
                              <div>
                                <p style={{ color: mutedColor }}>Present</p>
                                <p className="font-bold text-emerald-500">{presentCount}</p>
                              </div>
                              <div>
                                <p style={{ color: mutedColor }}>Late</p>
                                <p className="font-bold text-amber-500">{lateCount}</p>
                              </div>
                              <div>
                                <p style={{ color: mutedColor }}>Half Day</p>
                                <p className="font-bold text-yellow-500">{halfDayCount}</p>
                              </div>
                              <div>
                                <p style={{ color: mutedColor }}>Absent</p>
                                <p className="font-bold text-rose-500">{absentCount}</p>
                              </div>
                            </div>

                            {/* Task Breakdown Stats */}
                            {(() => {
                              const empMemberTasks = tasks.filter(t => t.assignee_id === member.id);
                              const empTotalTasks = empMemberTasks.length;
                              const empCompletedTasks = empMemberTasks.filter(t => t.status === 'done').length;
                              const empPendingTasks = empTotalTasks - empCompletedTasks;

                              return (
                                <div className="grid grid-cols-3 gap-1 p-2.5 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-center text-[10px] mb-4">
                                  <div>
                                    <p className="font-semibold text-blue-600 dark:text-blue-400">Total Tasks</p>
                                    <p className="font-extrabold text-sm text-blue-600 dark:text-blue-400">{empTotalTasks}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">Completed</p>
                                    <p className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">{empCompletedTasks}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-amber-600 dark:text-amber-400">Pending</p>
                                    <p className="font-extrabold text-sm text-amber-600 dark:text-amber-400">{empPendingTasks}</p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Actions Row */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setSelectedEmployeeId(member.id)}
                              className="py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-1"
                            >
                              <span>📊 Dashboard</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(null, member.id)}
                              className="py-2.5 rounded-xl border border-blue-500/40 text-blue-500 text-xs font-bold hover:bg-blue-500/10 transition-all flex items-center justify-center gap-1"
                            >
                              <span>✏️ Log Attendance</span>
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>

                {teamMembers.length === 0 && (
                  <div className="p-12 text-center glass-card" style={{ color: mutedColor }}>
                    No employees registered in the system yet.
                  </div>
                )}
              </div>
            )}

            {/* 📅 FULL HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl glass-card">
                  <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
                    <input 
                      type="text" 
                      placeholder="Search employee..." 
                      value={historySearch} 
                      onChange={e => setHistorySearch(e.target.value)} 
                      className="input-field max-w-xs text-sm" 
                    />
                    <select 
                      value={historyFilter} 
                      onChange={e => setHistoryFilter(e.target.value)} 
                      className="input-field max-w-xs text-sm"
                    >
                      <option value="all">All Statuses</option>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="half_day">Half Day</option>
                      <option value="absent">Absent</option>
                      <option value="leave">Leave</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => handleOpenEditModal(null)}
                    className="btn-primary text-xs px-3.5 py-2"
                  >
                    ➕ Override / Create Entry
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
                        <th className="p-4 font-semibold">Notes / Reason</th>
                        <th className="p-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: isDark ? 'rgba(42,42,58,0.5)' : 'rgba(229,226,240,0.5)' }}>
                      {allAttendance.filter(a => 
                        (historyFilter === 'all' || a.status === historyFilter) &&
                        (!historySearch || a.user?.full_name?.toLowerCase().includes(historySearch.toLowerCase()))
                      ).slice(0, 100).map((record) => {
                        const checkIn = record.check_in ? new Date(record.check_in) : null;
                        const checkOut = record.check_out ? new Date(record.check_out) : null;
                        const workingMs = checkIn && checkOut ? checkOut.getTime() - checkIn.getTime() : 0;
                        
                        return (
                          <tr key={record.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="p-4" style={{ color: textColor }}>{new Date(record.date).toLocaleDateString()}</td>
                            <td className="p-4 font-medium" style={{ color: textColor }}>{record.user?.full_name || 'Unknown'}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                record.status === 'present' || record.status === 'checked_out' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                record.status === 'late' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                record.status === 'half_day' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                                record.status === 'leave' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                                'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}>
                                {record.status?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4" style={{ color: textColor }}>{checkIn ? checkIn.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                            <td className="p-4" style={{ color: textColor }}>{checkOut ? checkOut.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                            <td className="p-4 font-mono" style={{ color: textColor }}>{workingMs > 0 ? formatDuration(workingMs) : '-'}</td>
                            <td className="p-4 text-xs max-w-xs truncate" style={{ color: mutedColor }}>{record.notes || '-'}</td>
                            <td className="p-4 flex items-center gap-3">
                              <button 
                                onClick={() => handleOpenEditModal(record)}
                                className="text-blue-500 font-semibold hover:underline text-xs"
                              >
                                ✏️ Edit
                              </button>
                              <button 
                                onClick={() => setSelectedEmployeeId(record.user_id || record.user?.id)}
                                className="text-gray-400 hover:text-blue-500 text-xs"
                              >
                                Dashboard →
                              </button>
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

            {/* 🏖️ LEAVE MANAGEMENT TAB */}
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
                          <p className="font-semibold text-sm" style={{ color: textColor }}>
                            {req.user?.full_name} 
                            <span className="text-xs bg-gray-500/20 px-2 py-0.5 rounded ml-2 capitalize">{req.leave_type} Leave</span>
                          </p>
                          <p className="text-xs mt-1" style={{ color: mutedColor }}>{req.start_date} to {req.end_date} • {req.reason}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          {req.status === 'pending' ? (
                            <>
                              <button 
                                onClick={async () => {
                                  try {
                                    await dataService.updateLeaveRequestStatus(req.id, 'approved', currentUser.id);
                                    setLeaveRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-emerald-600"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={async () => {
                                  try {
                                    await dataService.updateLeaveRequestStatus(req.id, 'rejected', currentUser.id);
                                    setLeaveRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r));
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="bg-rose-500 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-rose-600"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-bold uppercase" style={{ color: req.status === 'approved' ? '#10b981' : '#f43f5e' }}>
                              {req.status}
                            </span>
                          )}
                          <button 
                            onClick={() => setSelectedEmployeeId(req.user_id || req.user?.id)}
                            className="text-xs text-blue-500 hover:underline ml-2"
                          >
                            Dashboard
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 🎉 HOLIDAYS TAB */}
            {activeTab === 'holidays' && (
              <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold" style={{ color: textColor }}>Company Holidays ({new Date().getFullYear()})</h2>
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

            {/* ⏱️ LATE POLICY TAB */}
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

      {/* ─── EDIT / LOG ATTENDANCE MODAL ─── */}
      <AnimatePresence>
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass-card p-6 rounded-2xl shadow-2xl relative border"
              style={{ background: isDark ? '#14141f' : '#ffffff', borderColor }}
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor }}>
                <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: textColor }}>
                  <span>{editingRecord ? '✏️ Edit Attendance Record' : '➕ Log / Override Attendance'}</span>
                </h3>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 font-bold"
                >
                  ✕
                </button>
              </div>

              {saveError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
                  ⚠️ {saveError}
                </div>
              )}

              <form onSubmit={handleSaveAttendance} className="space-y-4">
                {/* Select Employee */}
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>Employee</label>
                  <select
                    value={editUserId}
                    onChange={e => setEditUserId(e.target.value)}
                    required
                    disabled={!!editingRecord}
                    className="input-field w-full text-xs"
                  >
                    <option value="" disabled>Select Employee</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.role || 'Employee'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    required
                    className="input-field w-full text-xs"
                  />
                </div>

                {/* Attendance Status */}
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>Attendance Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="input-field w-full text-xs font-bold"
                  >
                    <option value="present">🟢 Present</option>
                    <option value="half_day">🟡 Half Day</option>
                    <option value="late">🟠 Late</option>
                    <option value="absent">🔴 Absent</option>
                    <option value="leave">🏖️ On Leave</option>
                    <option value="on_break">☕ On Break</option>
                    <option value="checked_out">🔵 Checked Out</option>
                  </select>
                </div>

                {/* Check In & Check Out Times (only if not absent or on leave) */}
                {editStatus !== 'absent' && editStatus !== 'leave' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>Check In Time</label>
                      <input
                        type="time"
                        value={editCheckIn}
                        onChange={e => setEditCheckIn(e.target.value)}
                        className="input-field w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>Check Out Time</label>
                      <input
                        type="time"
                        value={editCheckOut}
                        onChange={e => setEditCheckOut(e.target.value)}
                        className="input-field w-full text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* HR Override Notes / Remarks */}
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>HR Notes / Reason for Override</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Approved half-day, updated timing, manual entry..."
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="w-1/2 py-2.5 rounded-xl border text-xs font-semibold"
                    style={{ borderColor, color: textColor }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAttendance}
                    className="w-1/2 btn-primary py-2.5 text-xs font-bold shadow-md flex items-center justify-center gap-2"
                  >
                    {savingAttendance ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      '💾 Save Attendance'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
