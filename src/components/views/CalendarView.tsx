'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { useState } from 'react';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView() {
  const { theme, events } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 13));
  const [view, setView] = useState<'month' | 'week'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      const d = new Date(e.startTime);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>Calendar</h1>
          <p className="text-xs mt-1" style={{ color: mutedColor }}>{events.length} events scheduled</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(255,255,255,0.6)', border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}` }}>
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
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-5">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={prev} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: textColor }}>←</motion.button>
          <h2 className="text-lg font-semibold" style={{ color: textColor }}>{monthName}</h2>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={next} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: textColor }}>→</motion.button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold py-2" style={{ color: mutedColor }}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <motion.div
                key={i}
                whileHover={day ? { scale: 1.02 } : {}}
                className="min-h-[90px] p-2 rounded-xl cursor-pointer transition-all"
                style={{
                  background: isToday ? 'rgba(139,92,246,0.1)' : day ? (isDark ? 'rgba(26,26,37,0.3)' : 'rgba(255,255,255,0.3)') : 'transparent',
                  border: isToday ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                }}
              >
                {day && (
                  <>
                    <span className={`text-xs font-medium ${isToday ? 'text-purple-400' : ''}`} style={{ color: isToday ? undefined : textColor }}>{day}</span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map(e => (
                        <div key={e.id} className="text-[9px] px-1.5 py-0.5 rounded-md truncate" style={{ background: `${e.color}20`, color: e.color }}>{e.title}</div>
                      ))}
                      {dayEvents.length > 2 && <span className="text-[9px]" style={{ color: mutedColor }}>+{dayEvents.length - 2} more</span>}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>📅 Upcoming Events</h3>
        <div className="space-y-3">
          {events.map(e => (
            <motion.div key={e.id} whileHover={{ x: 4 }} className="flex items-center gap-4 py-3 px-4 rounded-xl cursor-pointer" style={{ background: isDark ? 'rgba(26,26,37,0.4)' : 'rgba(255,255,255,0.4)' }}>
              <div className="w-1 h-10 rounded-full" style={{ background: e.color || '#8b5cf6' }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: textColor }}>{e.title}</p>
                <p className="text-[11px]" style={{ color: mutedColor }}>
                  {new Date(e.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {new Date(e.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full capitalize" style={{ background: `${e.color}15`, color: e.color }}>{e.type}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
