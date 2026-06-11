'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { useState } from 'react';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView() {
  const { theme, events, tasks } = useAppStore();
  const isDark = theme === 'dark';

  const allEvents = [
    ...events.map(e => ({ ...e, type: 'event', isCompleted: false })),
    ...tasks
      .filter(t => t.due_date) // Only show tasks that explicitly have a due date
      .map(t => ({
        id: t.id,
        title: t.title,
        start_time: t.due_date as string,
        end_time: t.due_date as string,
        type: 'task',
        color: t.status === 'done' ? '#10b981' : (t.priority === 'urgent' ? '#f43f5e' : '#8b5cf6'),
        isCompleted: t.status === 'done'
    }))
  ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const borderColor = isDark ? '#2a2a3a' : '#e5e2f0';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const today = new Date();

  const calendarDays: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];
  
  // Previous month's days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }
  
  // Current month's days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true,
    });
  }
  
  // Next month's days to complete the grid (usually up to 35 or 42 cells)
  const totalCells = calendarDays.length > 35 ? 42 : 35;
  let nextMonthDay = 1;
  while (calendarDays.length < totalCells) {
    calendarDays.push({
      day: nextMonthDay++,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }

  const getEventsForDate = (y: number, m: number, d: number) => {
    return allEvents.filter(e => {
      const date = new Date(e.start_time);
      return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d;
    });
  };

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>Calendar</h1>
          <p className="text-xs mt-1" style={{ color: mutedColor }}>{allEvents.length} items scheduled</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={goToToday} 
            className="px-4 py-2 text-xs font-semibold rounded-xl transition-colors"
            style={{ border: `1px solid ${borderColor}`, color: textColor, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }}
          >
            Today
          </button>
          <div className="flex rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(255,255,255,0.6)', border: `1px solid ${borderColor}` }}>
            {['month', 'week'].map(v => (
              <button key={v} onClick={() => setView(v as 'month' | 'week')} className="px-4 py-2 text-xs font-medium capitalize" style={{
                background: view === v ? 'rgba(139,92,246,0.15)' : 'transparent', color: view === v ? '#a855f7' : mutedColor,
              }}>{v}</button>
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-primary text-xs">＋ Add Event</motion.button>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="glass-card p-0 overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor }}>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={prev} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: textColor }}>←</motion.button>
          <h2 className="text-lg font-semibold" style={{ color: textColor }}>{monthName}</h2>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={next} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: textColor }}>→</motion.button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor }}>
          {daysOfWeek.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold py-3 uppercase tracking-wider border-r last:border-r-0" style={{ color: mutedColor, borderColor }}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, i) => {
            const dayEvents = getEventsForDate(cell.year, cell.month, cell.day);
            const isToday = cell.day === today.getDate() && cell.month === today.getMonth() && cell.year === today.getFullYear();
            return (
              <div
                key={i}
                className="min-h-[130px] p-1.5 transition-colors group relative border-r border-b"
                style={{
                  background: isDark ? 'rgba(15,15,22,0.4)' : '#ffffff',
                  borderColor,
                  opacity: cell.isCurrentMonth ? 1 : 0.6
                }}
              >
                <div className="flex justify-end mb-1">
                  <span 
                    className={`text-xs font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'text-white' : ''}`} 
                    style={{ 
                      background: isToday ? '#3b82f6' : 'transparent', // Google Calendar blue
                      color: isToday ? '#ffffff' : textColor 
                    }}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {dayEvents.slice(0, 4).map(e => (
                    <motion.div 
                      layoutId={`event-${e.id}-${cell.day}-${cell.month}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={e.id} 
                      className="text-[10px] px-2 py-1 rounded-[4px] truncate font-medium shadow-sm cursor-pointer" 
                      style={{ 
                        background: e.color || '#3b82f6', 
                        color: '#ffffff'
                      }}
                    >
                      <span className={e.isCompleted ? 'line-through opacity-80' : ''}>{e.title}</span>
                    </motion.div>
                  ))}
                  {dayEvents.length > 4 && <span className="text-[10px] font-bold px-2 hover:underline cursor-pointer" style={{ color: mutedColor }}>{dayEvents.length - 4} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>📅 Upcoming Events & Tasks</h3>
        <div className="space-y-3">
          {allEvents.map((e, idx) => (
            <motion.div 
              key={e.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ x: 6, scale: 1.01 }} 
              className="flex items-center gap-4 py-3 px-4 rounded-xl cursor-pointer shadow-sm border border-transparent hover:border-purple-500/20" 
              style={{ background: isDark ? 'rgba(26,26,37,0.4)' : 'rgba(255,255,255,0.4)' }}
            >
              <div className="w-1.5 h-10 rounded-full" style={{ background: e.color || '#8b5cf6', opacity: e.isCompleted ? 0.5 : 1 }} />
              <div className="flex items-center justify-center w-8 h-8 rounded-full shadow-sm text-sm" style={{ background: `${e.color || '#8b5cf6'}15`, color: e.color || '#8b5cf6' }}>
                {e.type === 'task' ? (e.isCompleted ? '✓' : '📋') : '📅'}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${e.isCompleted ? 'line-through opacity-60' : ''}`} style={{ color: textColor }}>{e.title}</p>
                <p className="text-[11px] font-medium" style={{ color: mutedColor }}>
                  {new Date(e.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} 
                  {e.start_time.includes('T') && ` · ${new Date(e.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full capitalize font-bold" style={{ background: `${e.color || '#8b5cf6'}15`, color: e.color || '#8b5cf6', border: `1px solid ${e.color || '#8b5cf6'}30` }}>{e.type}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
