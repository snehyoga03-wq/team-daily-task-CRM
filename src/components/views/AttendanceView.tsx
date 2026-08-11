'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import * as dataService from '@/lib/dataService';
import { DbAttendance, DbAttendanceLog } from '@/lib/supabase';

function formatDuration(ms: number) {
  if (ms < 0) return '0h 0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default function AttendanceView() {
  const { theme, teamMembers, tasks } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  
  const [attendance, setAttendance] = useState<DbAttendance[]>([]);
  const [breakLogs, setBreakLogs] = useState<DbAttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('casual');
  const [leaveCategory, setLeaveCategory] = useState<'planned' | 'short_notice' | 'emergency'>('planned');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [shortNoticeReason, setShortNoticeReason] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [plannedWork, setPlannedWork] = useState('');
  const [examUrl, setExamUrl] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [myLeaveRequests, setMyLeaveRequests] = useState<any[]>([]);

  const fetchMyLeaveData = async () => {
    if (!currentUser) return;
    try {
      const requests = await dataService.fetchLeaveRequests();
      setMyLeaveRequests((requests || []).filter(r => r.user_id === currentUser.id));
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    }
  };

  useEffect(() => {
    if (currentUser) fetchMyLeaveData();
  }, [currentUser]);

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmittingLeave(true);
    setLeaveError(null);
    try {
      await dataService.submitLeaveRequest({
        user_id: currentUser.id,
        leave_type: leaveType as any,
        category: leaveCategory,
        start_date: leaveStartDate,
        end_date: leaveEndDate,
        reason: leaveReason,
        short_notice_reason: leaveCategory === 'short_notice' ? shortNoticeReason : null,
        emergency_reason: leaveCategory === 'emergency' ? emergencyReason : null,
        planned_work: leaveCategory === 'planned' ? plannedWork : null,
        exam_timetable_url: leaveType === 'exam' ? examUrl : null,
      });
      await fetchMyLeaveData();
      setLeaveModalOpen(false);
    } catch (err: any) {
      setLeaveError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const fetchAttendanceData = async (date: string) => {
    setLoading(true);
    try {
      const [data, logs] = await Promise.all([
        dataService.fetchAttendance(date),
        dataService.fetchBreakLogs(date)
      ]);
      setAttendance(data);
      setBreakLogs(logs || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData(selectedDate);
  }, [selectedDate]);

  const displayDateStr = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' });

  const teamAttendance = teamMembers.map(member => {
    const record = attendance.find(a => a.user_id === member.id);
    let status = record ? record.status : 'absent';
    let checkInTime = record?.check_in ? new Date(record.check_in) : null;
    let checkOutTime = record?.check_out ? new Date(record.check_out) : null;
    
    // Calculate breakMs dynamically from attendance_logs
    let breakMs = 0; 
    const memberLogs = breakLogs.filter(log => log.user_id === member.id);
    memberLogs.forEach(log => {
      const start = new Date(log.started_at);
      const end = log.ended_at ? new Date(log.ended_at) : now;
      breakMs += Math.max(0, end.getTime() - start.getTime());
    });
    
    let workingMs = 0;

    if (checkInTime) {
      const end = checkOutTime || now;
      workingMs = Math.max(0, end.getTime() - checkInTime.getTime() - breakMs);
    }
    
    let isLate = false;
    let lateMinutes = 0;
    let fineAmount = record?.fine_amount || 0;
    if (checkInTime) {
      const officeStart = new Date(checkInTime);
      officeStart.setHours(9, 45, 0, 0); // 9:45 AM grace period cutoff
      if (checkInTime > officeStart) {
        isLate = true;
        lateMinutes = Math.floor((checkInTime.getTime() - officeStart.getTime()) / 60000);
        if (!fineAmount) fineAmount = Math.max(0, lateMinutes * 1.0);
      }
    }
    
    if (!record) status = 'absent';

    const userTasks = tasks.filter(t => t.assignee_id === member.id);
    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter(t => t.status === 'done').length;
    const pendingTasks = totalTasks - completedTasks;

    return { 
      member, 
      record, 
      status, 
      checkInTime, 
      checkOutTime, 
      workingMs, 
      breakMs, 
      isLate, 
      lateMinutes,
      fineAmount,
      totalTasks,
      completedTasks,
      pendingTasks,
      // Using HR Profile data for the UI
      department: member.department || 'General', 
      designation: member.designation || (member.role === 'admin' ? 'Manager' : 'Employee'),
      shift: member.shift || 'Morning Shift'
    };
  });

  const filteredList = teamAttendance.filter(t => {
    if (search && !t.member.full_name.toLowerCase().includes(search.toLowerCase()) && 
        !t.department.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== 'all' && t.status !== filter) return false;
    return true;
  });

  // Calculate Summary metrics
  const totalEmployees = teamMembers.length;
  const presentCount = teamAttendance.filter(t => ['present', 'late', 'on_break'].includes(t.status)).length;
  const absentCount = teamAttendance.filter(t => t.status === 'absent').length;
  const lateCount = teamAttendance.filter(t => t.isLate).length;
  const onBreakCount = teamAttendance.filter(t => t.status === 'on_break').length;
  const checkedOutCount = teamAttendance.filter(t => t.status === 'checked_out').length;
  
  let totalWorkingMs = 0;
  teamAttendance.forEach(t => totalWorkingMs += t.workingMs);
  const avgWorkingMs = presentCount > 0 ? totalWorkingMs / presentCount : 0;

  const handleAction = async (userId: string, action: 'check_in' | 'check_out' | 'break' | 'resume' | 'absent') => {
    try {
      if (action === 'check_in') {
        await dataService.checkIn(userId);
      } else if (action === 'check_out') {
        await dataService.checkOut(userId);
      } else if (action === 'break') {
        await dataService.startBreak(userId);
      } else if (action === 'resume') {
        await dataService.endBreak(userId);
      } else if (action === 'absent') {
        await dataService.updateAttendanceStatus(userId, 'absent');
      }
      await fetchAttendanceData(selectedDate);
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
    }
  };

  const exportCsv = () => {
    const headers = ['Employee ID', 'Name', 'Department', 'Designation', 'Shift', 'Status', 'Check In', 'Check Out', 'Break Time', 'Working Hours', 'Late (Mins)'];
    const rows = teamAttendance.map(t => [
      t.member.id.substring(0,8),
      t.member.full_name,
      t.department,
      t.designation,
      t.shift,
      t.status.replace('_', ' '),
      t.checkInTime ? t.checkInTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-',
      t.checkOutTime ? t.checkOutTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-',
      formatDuration(t.breakMs),
      formatDuration(t.workingMs),
      t.isLate ? t.lateMinutes.toString() : '0'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Daily_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">🟢 Present</span>;
      case 'late': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">🟠 Late</span>;
      case 'on_break': return <span className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: '#fef3c7', color: '#d97706' }}>🟡 On Break (Max 45m)</span>;
      case 'checked_out': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">🔴 Checked Out</span>;
      case 'absent': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-gray-500/10 text-gray-500">⚫ Absent</span>;
      case 'half_day': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">🟣 Half Day</span>;
      case 'wfh': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">🏠 WFH</span>;
      case 'company_wfh': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">🏢 Company WFH</span>;
      case 'weekly_off': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500">💤 Weekly Off</span>;
      case 'holiday': return <span className="px-2 py-1 rounded text-[10px] font-bold bg-pink-500/10 text-pink-500">🎉 Holiday</span>;
      default: return <span className="px-2 py-1 rounded text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: textColor }}>Daily Attendance Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: mutedColor }}>{displayDateStr} • Daily Operations</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={() => setLeaveModalOpen(true)} 
            className="btn-primary text-xs font-bold px-4 py-2 flex items-center gap-2 shadow-md"
          >
            <span>🏖️ Apply for Leave / WFH</span>
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={exportCsv} className="btn-primary text-xs" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: textColor }}>
            ⬇️ Export CSV
          </motion.button>
        </div>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
        {[
          { label: 'Total Team', value: totalEmployees, color: '#3b82f6' },
          { label: 'Present', value: presentCount, color: '#10b981' },
          { label: 'Absent', value: absentCount, color: '#71717a' },
          { label: 'Late', value: lateCount, color: '#f59e0b' },
          { label: 'On Break', value: onBreakCount, color: '#d97706' },
          { label: 'Checked Out', value: checkedOutCount, color: '#f43f5e' },
          { label: 'Avg Hrs', value: formatDuration(avgWorkingMs), color: '#8b5cf6' },
        ].map(stat => (
          <motion.div key={stat.label} whileHover={{ y: -2 }} className="glass-card p-4 flex flex-col items-center justify-center text-center shadow-sm rounded-xl">
            <span className="text-2xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: mutedColor }}>{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl glass-card">
        <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
          <input 
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="input-field max-w-xs text-sm"
          />
          <input 
            type="text" 
            placeholder="Search Name or Dept..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="input-field max-w-xs text-sm" 
          />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field max-w-xs text-sm">
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="on_break">On Break</option>
            <option value="checked_out">Checked Out</option>
            <option value="absent">Absent</option>
          </select>
        </div>
      </div>

      {/* Advanced Employee Table */}
      <div className="glass-card overflow-x-auto shadow-sm">
        <div className="grid grid-cols-[2fr,1.5fr,1.2fr,1fr,1.5fr] min-w-[720px] gap-4 px-6 py-4 border-b text-xs font-semibold" style={{ color: mutedColor, borderColor: isDark ? '#2a2a3a' : '#e5e2f0', background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
          <span>Employee Information</span>
          <span>Time Log</span>
          <span>Productivity</span>
          <span>Status</span>
          <span>Today's Actions</span>
        </div>
        
        {loading ? (
          <div className="p-12 text-center" style={{ color: mutedColor }}>
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            Loading attendance data...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center" style={{ color: mutedColor }}>No records found matching criteria.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: isDark ? 'rgba(42,42,58,0.5)' : 'rgba(229,226,240,0.5)' }}>
            <AnimatePresence>
              {filteredList.map((t, i) => (
                <motion.div 
                  key={t.member.id} 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[2fr,1.5fr,1.2fr,1fr,1.5fr] min-w-[720px] gap-4 px-6 py-4 items-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative"
                >
                  {/* Active Indicator Line */}
                  {t.checkInTime && !t.checkOutTime && t.status !== 'on_break' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r"></div>
                  )}

                  {/* Employee Info */}
                  <div className="flex items-center gap-3 pl-2">
                    <div className="relative">
                      {t.member.avatar_url ? (
                        <img src={t.member.avatar_url} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                      ) : (
                        <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>
                          {t.member.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                      {t.checkInTime && !t.checkOutTime && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-emerald-500"></span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2" style={{ color: textColor }}>
                        {t.member.full_name}
                      </p>
                      <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: mutedColor }}>
                        {t.department} • {t.designation} • {t.shift}
                      </p>
                    </div>
                  </div>
                  
                  {/* Time Log */}
                  <div className="text-xs space-y-1" style={{ color: textColor }}>
                    <div className="flex justify-between items-center max-w-[140px]">
                      <span style={{ color: mutedColor }}>In:</span>
                      <span className="font-medium">{t.checkInTime ? t.checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center max-w-[140px]">
                      <span style={{ color: mutedColor }}>Out:</span>
                      <span className="font-medium">{t.checkOutTime ? t.checkOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    </div>
                    {(t.isLate || t.fineAmount > 0) && (
                      <div className="flex justify-between items-center max-w-[140px]">
                        <span style={{ color: mutedColor }}>Late Fine:</span>
                        <span className="font-bold text-rose-500">{t.lateMinutes > 0 ? `${t.lateMinutes}m ` : ''}(₹{t.fineAmount})</span>
                      </div>
                    )}
                    {t.record?.ot_hours && t.record.ot_hours > 0 ? (
                      <div className="flex justify-between items-center max-w-[140px]">
                        <span style={{ color: mutedColor }}>OT:</span>
                        <span className="font-bold text-emerald-500">⏱️ {t.record.ot_hours} hrs</span>
                      </div>
                    ) : null}
                  </div>
                  
                  {/* Productivity */}
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between items-center max-w-[140px]">
                      <span style={{ color: mutedColor }}>Working:</span>
                      <span className="font-mono font-bold" style={{ color: t.checkInTime && !t.checkOutTime ? '#06b6d4' : textColor }}>
                        {t.workingMs > 0 ? formatDuration(t.workingMs) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center max-w-[140px]">
                      <span style={{ color: mutedColor }}>Break:</span>
                      <span className="font-mono font-medium" style={{ color: textColor }}>
                        {t.breakMs > 0 ? formatDuration(t.breakMs) : '0h 0m'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center max-w-[140px] pt-1 border-t border-black/5 dark:border-white/5 text-[10px]">
                      <span style={{ color: mutedColor }}>Tasks:</span>
                      <span className="font-semibold text-blue-500" title={`Completed: ${t.completedTasks}, Pending: ${t.pendingTasks}, Total: ${t.totalTasks}`}>
                        ✅ {t.completedTasks}/{t.totalTasks} ({t.pendingTasks} pnd)
                      </span>
                    </div>
                  </div>
                  
                  {/* Status */}
                  <div>
                    {getStatusBadge(t.status)}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isToday && (
                      <>
                        {(!t.checkInTime || t.status === 'absent') && (
                          <button onClick={() => handleAction(t.member.id, 'check_in')} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors shadow-sm">
                            Check In
                          </button>
                        )}
                        {t.checkInTime && !t.checkOutTime && (
                          <>
                            <button onClick={() => handleAction(t.member.id, t.status === 'on_break' ? 'resume' : 'break')} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors shadow-sm">
                              {t.status === 'on_break' ? 'Resume Work' : 'Start Break'}
                            </button>
                            <button onClick={() => handleAction(t.member.id, 'check_out')} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors shadow-sm">
                              Check Out
                            </button>
                          </>
                        )}
                        {!t.checkInTime && t.status !== 'absent' && (
                          <button onClick={() => handleAction(t.member.id, 'absent')} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-gray-500/10 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20 transition-colors">
                            Mark Absent
                          </button>
                        )}
                      </>
                    )}
                    {!isToday && <span className="text-[10px]" style={{ color: mutedColor }}>Historical Record</span>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 🏖️ MY LEAVE REQUESTS & BALANCES PANEL (FOR ALL EMPLOYEES) */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
          <div>
            <h3 className="font-bold text-base" style={{ color: textColor }}>🏖️ My Leave Balances & Submitted Applications</h3>
            <p className="text-xs mt-0.5" style={{ color: mutedColor }}>Monthly Credit: 1.5 Days • Max Accumulation Cap: 3.0 Days</p>
          </div>
          <button
            onClick={() => setLeaveModalOpen(true)}
            className="btn-primary text-xs font-bold px-3 py-1.5 shadow-sm"
          >
            ➕ New Leave / WFH Request
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <span className="text-[10px] uppercase font-bold text-purple-500 block">Accrued Leave Balance</span>
            <span className="text-xl font-bold text-purple-600 dark:text-purple-400">1.5 / 3.0 Days</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <span className="text-[10px] uppercase font-bold text-blue-500 block">Approved Leaves (This Month)</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {myLeaveRequests.filter(r => r.status === 'approved').length} Days
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-[10px] uppercase font-bold text-amber-500 block">Pending Level 1/2 Approvals</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {myLeaveRequests.filter(r => r.status === 'pending' || r.status === 'dept_head_approved').length} Requests
            </span>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-2 pt-2">
          {myLeaveRequests.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: mutedColor }}>No leave or WFH applications submitted yet.</p>
          ) : (
            myLeaveRequests.map(req => (
              <div key={req.id} className="p-3 rounded-xl border flex justify-between items-center text-xs" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
                <div>
                  <span className="font-bold capitalize text-purple-500">{req.leave_type} Leave</span> ({req.category || 'planned'})
                  <p className="text-[11px] mt-0.5" style={{ color: mutedColor }}>📅 {req.start_date} to {req.end_date} • {req.reason}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={`px-2 py-0.5 rounded font-bold uppercase ${req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : req.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {req.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── LEAVE APPLICATION MODAL (ACCESSIBLE TO ALL EMPLOYEES) ─── */}
      <AnimatePresence>
        {leaveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass-card p-6 rounded-2xl shadow-2xl relative border overflow-y-auto max-h-[90vh]"
              style={{ background: isDark ? '#14141f' : '#ffffff', borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
                <h3 className="text-lg font-bold" style={{ color: textColor }}>🏖️ Apply for Leave / WFH</h3>
                <button onClick={() => setLeaveModalOpen(false)} className="text-gray-500 font-bold">✕</button>
              </div>

              {leaveError && <div className="mb-3 p-3 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-bold">⚠️ {leaveError}</div>}

              <form onSubmit={handleSubmitLeaveRequest} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>Notice Category</label>
                    <select value={leaveCategory} onChange={e => setLeaveCategory(e.target.value as any)} className="input-field w-full text-xs">
                      <option value="planned">📅 Planned (3+ Days Notice)</option>
                      <option value="short_notice">⚡ Short Notice</option>
                      <option value="emergency">🚨 Emergency (Today Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>Leave Type</label>
                    <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="input-field w-full text-xs font-bold">
                      <option value="casual">Casual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="birthday">Birthday Leave</option>
                      <option value="marriage">Marriage Leave (7 Days)</option>
                      <option value="bereavement">Bereavement Leave (4 Days)</option>
                      <option value="emergency">Emergency Leave</option>
                      <option value="lwp">Leave Without Pay (LWP)</option>
                      <option value="wfh">Work From Home (WFH)</option>
                      <option value="exam">Exam Leave (Interns Only)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>Start Date</label>
                    <input type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} required className="input-field w-full text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>End Date</label>
                    <input type="date" value={leaveEndDate} onChange={e => setLeaveEndDate(e.target.value)} required className="input-field w-full text-xs" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: textColor }}>Reason</label>
                  <textarea rows={2} value={leaveReason} onChange={e => setLeaveReason(e.target.value)} required placeholder="Reason for leave request..." className="input-field w-full text-xs" />
                </div>

                {leaveCategory === 'short_notice' && (
                  <div>
                    <label className="block text-xs font-bold mb-1 text-amber-500">Short Notice Reason *</label>
                    <input type="text" value={shortNoticeReason} onChange={e => setShortNoticeReason(e.target.value)} required className="input-field w-full text-xs" />
                  </div>
                )}

                {leaveCategory === 'emergency' && (
                  <div>
                    <label className="block text-xs font-bold mb-1 text-rose-500">Emergency Trigger Reason *</label>
                    <input type="text" value={emergencyReason} onChange={e => setEmergencyReason(e.target.value)} required className="input-field w-full text-xs" />
                  </div>
                )}

                {leaveCategory === 'planned' && (
                  <div>
                    <label className="block text-xs font-bold mb-1 text-cyan-500">Planned Work Coverage Summary *</label>
                    <input type="text" value={plannedWork} onChange={e => setPlannedWork(e.target.value)} required placeholder="Summary of coverage during absence..." className="input-field w-full text-xs" />
                  </div>
                )}

                {leaveType === 'exam' && (
                  <div>
                    <label className="block text-xs font-bold mb-1 text-indigo-500">Exam Timetable Document Link / URL *</label>
                    <input type="url" value={examUrl} onChange={e => setExamUrl(e.target.value)} required placeholder="https://..." className="input-field w-full text-xs" />
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button type="button" onClick={() => setLeaveModalOpen(false)} className="w-1/2 py-2.5 rounded-xl border text-xs font-semibold" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0', color: textColor }}>Cancel</button>
                  <button type="submit" disabled={submittingLeave} className="w-1/2 btn-primary py-2.5 text-xs font-bold shadow-md">{submittingLeave ? 'Submitting...' : 'Submit Request'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
