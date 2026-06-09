'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import * as dataService from '@/lib/dataService';
import { DbAttendance } from '@/lib/supabase';

function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default function AttendanceView() {
  const { theme, teamMembers } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  
  const [attendance, setAttendance] = useState<DbAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const fetchAttendanceData = async (date: string) => {
    setLoading(true);
    try {
      const data = await dataService.fetchAttendance(date);
      setAttendance(data);
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
    
    let workingMs = 0;
    if (checkInTime) {
      const end = checkOutTime || now;
      workingMs = Math.max(0, end.getTime() - checkInTime.getTime());
    }
    
    let isLate = false;
    let lateMinutes = 0;
    if (checkInTime) {
      const officeStart = new Date(checkInTime);
      officeStart.setHours(10, 0, 0, 0);
      if (checkInTime > officeStart) {
        isLate = true;
        lateMinutes = Math.floor((checkInTime.getTime() - officeStart.getTime()) / 60000);
      }
    }
    
    if (!record) status = 'absent';

    return { member, record, status, checkInTime, checkOutTime, workingMs, isLate, lateMinutes };
  });

  const filteredList = teamAttendance.filter(t => {
    if (search && !t.member.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== 'all' && t.status !== filter) return false;
    return true;
  });

  const totalEmployees = teamMembers.length;
  const presentCount = teamAttendance.filter(t => ['present', 'late', 'on_break'].includes(t.status)).length;
  const absentCount = teamAttendance.filter(t => t.status === 'absent').length;
  const lateCount = teamAttendance.filter(t => t.isLate).length;
  const checkedOutCount = teamAttendance.filter(t => t.status === 'checked_out').length;

  const handleAction = async (userId: string, action: 'check_in' | 'check_out' | 'break' | 'resume' | 'absent') => {
    try {
      if (action === 'check_in') {
        await dataService.checkIn(userId);
      } else if (action === 'check_out') {
        await dataService.checkOut(userId);
      } else if (action === 'break') {
        await dataService.updateAttendanceStatus(userId, 'on_break');
      } else if (action === 'resume') {
        await dataService.updateAttendanceStatus(userId, 'present');
      } else if (action === 'absent') {
        await dataService.updateAttendanceStatus(userId, 'absent');
      }
      await fetchAttendanceData(selectedDate);
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
    }
  };

  const exportCsv = () => {
    const headers = ['Name', 'Role', 'Status', 'Check In', 'Check Out', 'Working Hours', 'Late (Mins)'];
    const rows = teamAttendance.map(t => [
      t.member.full_name,
      t.member.role,
      t.status.replace('_', ' '),
      t.checkInTime ? t.checkInTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-',
      t.checkOutTime ? t.checkOutTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-',
      formatDuration(t.workingMs),
      t.isLate ? t.lateMinutes.toString() : '0'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <span className="badge badge-low">🟢 Present</span>;
      case 'late': return <span className="badge badge-medium">🟠 Late</span>;
      case 'on_break': return <span className="badge badge-medium" style={{ background: '#fef3c7', color: '#d97706' }}>🟡 On Break</span>;
      case 'checked_out': return <span className="badge badge-urgent">🔴 Checked Out</span>;
      case 'absent': return <span className="badge" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: mutedColor }}>⚫ Absent</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: textColor }}>Attendance Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: mutedColor }}>{displayDateStr}</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={exportCsv} className="btn-primary text-xs" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: textColor }}>
            ⬇️ Export CSV
          </motion.button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Team', value: totalEmployees, color: '#3b82f6' },
          { label: 'Present Today', value: presentCount, color: '#10b981' },
          { label: 'Absent Today', value: absentCount, color: '#71717a' },
          { label: 'Late Arrivals', value: lateCount, color: '#f59e0b' },
          { label: 'Checked Out', value: checkedOutCount, color: '#f43f5e' },
        ].map(stat => (
          <motion.div key={stat.label} whileHover={{ y: -2 }} className="glass-card p-5 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-3xl font-bold mb-2" style={{ color: stat.color }}>{stat.value}</span>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: mutedColor }}>{stat.label}</span>
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
            placeholder="Search team member..." 
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

      {/* Table */}
      <div className="glass-card overflow-hidden overflow-x-auto shadow-sm">
        <div className="grid grid-cols-[1.5fr,1fr,1fr,1fr,1fr,1.5fr] gap-4 px-6 py-4 border-b text-xs font-semibold min-w-[900px]" style={{ color: mutedColor, borderColor: isDark ? '#2a2a3a' : '#e5e2f0', background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
          <span>Member</span><span>Check In</span><span>Check Out</span><span>Working Hrs</span><span>Status</span><span>Actions</span>
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
                  className="grid grid-cols-[1.5fr,1fr,1fr,1fr,1fr,1.5fr] gap-4 px-6 py-4 items-center min-w-[900px] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>
                      {t.member.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: textColor }}>{t.member.full_name}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: mutedColor }}>{t.member.role}</p>
                    </div>
                  </div>
                  
                  <div className="text-sm" style={{ color: textColor }}>
                    {t.checkInTime ? (
                      <div className="flex flex-col gap-1 items-start">
                        <span>{t.checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {t.isLate && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-500">+{t.lateMinutes}m Late</span>}
                      </div>
                    ) : <span className="opacity-50">—</span>}
                  </div>
                  
                  <div className="text-sm" style={{ color: textColor }}>
                    {t.checkOutTime ? t.checkOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="opacity-50">—</span>}
                  </div>
                  
                  <div className="text-sm font-mono font-medium" style={{ color: t.checkInTime && !t.checkOutTime ? '#06b6d4' : textColor }}>
                    {t.workingMs > 0 ? (
                      <div className="flex items-center gap-2">
                        {formatDuration(t.workingMs)}
                        {t.checkInTime && !t.checkOutTime && t.status !== 'on_break' && <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>}
                      </div>
                    ) : <span className="opacity-50">—</span>}
                  </div>
                  
                  <div>
                    {getStatusBadge(t.status)}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <>
                        {(!t.checkInTime || t.status === 'absent') && (
                          <button onClick={() => handleAction(t.member.id, 'check_in')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                            Check In
                          </button>
                        )}
                        {t.checkInTime && !t.checkOutTime && (
                          <>
                            <button onClick={() => handleAction(t.member.id, t.status === 'on_break' ? 'resume' : 'break')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors">
                              {t.status === 'on_break' ? 'Resume' : 'Break'}
                            </button>
                            <button onClick={() => handleAction(t.member.id, 'check_out')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors">
                              Check Out
                            </button>
                          </>
                        )}
                        {!t.checkInTime && t.status !== 'absent' && (
                          <button onClick={() => handleAction(t.member.id, 'absent')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20 transition-colors">
                            Mark Absent
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
