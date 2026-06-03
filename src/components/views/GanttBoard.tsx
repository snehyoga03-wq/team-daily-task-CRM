'use client';

import { useAppStore, Task } from '@/lib/store';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { format, addDays, subDays, eachDayOfInterval, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';

export default function GanttBoard({ filteredTasks }: { filteredTasks: Task[] }) {
  const { theme, setSelectedTaskId } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const borderColor = isDark ? 'rgba(42,42,58,0.5)' : 'rgba(229,226,240,0.5)';

  const [currentDate, setCurrentDate] = useState(new Date());

  // Generate a timeline of 30 days (15 days before, 15 days after current date)
  const timelineStart = subDays(currentDate, 15);
  const timelineEnd = addDays(currentDate, 15);
  const days = eachDayOfInterval({ start: timelineStart, end: timelineEnd });

  const priorityColors = { urgent: '#f43f5e', high: '#f97316', medium: '#f59e0b', low: '#10b981' };

  // Filter tasks that have at least a start_date or due_date
  const ganttTasks = filteredTasks.filter(t => t.start_date || t.due_date).sort((a, b) => {
    const aStart = a.start_date ? new Date(a.start_date).getTime() : new Date(a.due_date!).getTime();
    const bStart = b.start_date ? new Date(b.start_date).getTime() : new Date(b.due_date!).getTime();
    return aStart - bStart;
  });

  return (
    <div className="glass-card overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(subDays(currentDate, 7))} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5">◀</button>
          <span className="text-sm font-bold" style={{ color: textColor }}>{format(currentDate, 'MMM yyyy')}</span>
          <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5">▶</button>
          <button onClick={() => setCurrentDate(new Date())} className="ml-2 px-3 py-1 text-xs rounded-lg border transition-colors" style={{ borderColor, color: textColor }}>Today</button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header Row (Dates) */}
          <div className="flex border-b" style={{ borderColor }}>
            <div className="w-[250px] flex-shrink-0 p-3 border-r font-semibold text-xs flex items-center" style={{ borderColor, color: mutedColor }}>
              Task Name
            </div>
            <div className="flex-1 flex">
              {days.map(day => {
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <div key={day.toString()} className="flex-1 min-w-[40px] border-r text-center py-2 flex flex-col items-center justify-center relative" style={{ borderColor }}>
                    {isToday && <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />}
                    <span className="text-[10px] uppercase font-bold" style={{ color: isToday ? '#3b82f6' : mutedColor }}>{format(day, 'EEEEE')}</span>
                    <span className="text-xs font-semibold" style={{ color: isToday ? '#3b82f6' : textColor }}>{format(day, 'd')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Rows */}
          {ganttTasks.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: mutedColor }}>No tasks with dates assigned.</div>
          ) : (
            <div className="relative">
              {ganttTasks.map((task, idx) => {
                // Calculate position and width
                let tStart = task.start_date ? new Date(task.start_date) : new Date(task.due_date!);
                let tEnd = task.due_date ? new Date(task.due_date) : new Date(task.start_date!);
                
                // If it ends before it starts, swap them
                if (tEnd < tStart) {
                  const temp = tStart;
                  tStart = tEnd;
                  tEnd = temp;
                }

                // If completely outside timeline, we still render the row but the bar might be out of bounds
                const startDiff = differenceInDays(tStart, timelineStart);
                const duration = differenceInDays(tEnd, tStart) + 1;
                
                const leftPercent = Math.max(0, (startDiff / 31) * 100);
                const widthPercent = Math.min(100 - leftPercent, (duration / 31) * 100);
                
                // Calculate dependency lines (simplified: just list them in the row for now)
                const dependsOnTitles = task.depends_on && task.depends_on.length > 0
                  ? task.depends_on.map(depId => filteredTasks.find(t => t.id === depId)?.title).filter(Boolean).join(', ')
                  : null;

                return (
                  <div key={task.id} className="flex border-b group hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor }}>
                    {/* Fixed Task Name Column */}
                    <div className="w-[250px] flex-shrink-0 p-3 border-r flex flex-col justify-center" style={{ borderColor }}>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: priorityColors[task.priority] }} />
                        <span onClick={() => setSelectedTaskId(task.id)} className="text-sm font-semibold truncate cursor-pointer hover:underline" style={{ color: textColor }}>{task.title}</span>
                      </div>
                      {dependsOnTitles && (
                        <span className="text-[9px] mt-1 truncate" style={{ color: '#f43f5e' }}>Blocks: {dependsOnTitles}</span>
                      )}
                    </div>
                    
                    {/* Timeline Grid Row */}
                    <div className="flex-1 flex relative min-h-[48px]">
                      {/* Grid lines */}
                      {days.map(day => (
                        <div key={day.toString()} className="flex-1 min-w-[40px] border-r" style={{ borderColor }} />
                      ))}
                      
                      {/* Task Bar */}
                      {startDiff > -duration && startDiff < 31 && (
                        <motion.div 
                          initial={{ opacity: 0, scaleX: 0.9 }}
                          animate={{ opacity: 1, scaleX: 1 }}
                          onClick={() => setSelectedTaskId(task.id)}
                          className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md cursor-pointer shadow-sm flex items-center px-2 truncate text-[10px] font-bold text-white z-10"
                          style={{ 
                            left: `${Math.max(0, (startDiff / 31) * 100)}%`, 
                            width: `${Math.min(100 - Math.max(0, (startDiff / 31) * 100), (duration / 31) * 100)}%`,
                            background: task.status === 'done' ? '#10b981' : priorityColors[task.priority],
                            opacity: task.status === 'done' ? 0.6 : 1
                          }}
                        >
                          {task.status === 'done' ? '✓ ' : ''}{task.title}
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
