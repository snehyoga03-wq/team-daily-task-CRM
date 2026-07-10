'use client';

import { useAppStore, Task } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import * as dataService from '@/lib/dataService';
import TaskDetailModal from '@/components/modals/TaskDetailModal';
import GanttBoard from './GanttBoard';

const statusConfig = {
  todo: { label: 'To Do', color: '#8b5cf6', icon: '📋' },
  in_progress: { label: 'In Progress', color: '#06b6d4', icon: '🔄' },
  review: { label: 'Review', color: '#f59e0b', icon: '👀' },
  done: { label: 'Done', color: '#10b981', icon: '✅' },
};

const priorityColors = { urgent: '#f43f5e', high: '#f97316', medium: '#f59e0b', low: '#10b981' };

export default function TasksView() {
  const { theme, tasks, taskView, setTaskView, updateTask, setQuickAddOpen, setSelectedTaskId, teams } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [taskScope, setTaskScope] = useState<'my_tasks' | 'team_tasks'>('my_tasks');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getTaskState = (task: Task) => {
    const isCompleted = task.status === 'done';
    let isOverdue = false;
    let isDueToday = false;
    let daysDelayed = 0;
    
    if (!isCompleted && task.due_date) {
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        isOverdue = true;
        daysDelayed = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      } else if (dueDate.getTime() === today.getTime()) {
        isDueToday = true;
      }
    }
    return { isCompleted, isOverdue, isDueToday, daysDelayed };
  };

  const filteredTasks = tasks.filter(t => {
    // Scope filter
    if (taskScope === 'my_tasks') {
      if (t.assignee_id !== currentUser?.id) return false;
    } else {
      if (selectedTeamId !== 'all') {
        const matchesTeam = t.team_id === selectedTeamId || t.assignee?.team_id === selectedTeamId;
        if (!matchesTeam) return false;
      }
    }

    if (selectedDate) {
      const pattern = (t.recurrence_pattern || '').toLowerCase();
      const tags = (t.tags || []).map(tag => tag.toLowerCase());
      const title = (t.title || '').toLowerCase();
      
      const isDaily = pattern === 'daily' || tags.includes('daily') || title.includes('daily') || title.includes('standup');
      const isWeekly = pattern === 'weekly' || tags.includes('weekly') || title.includes('weekly');
      const isMonthly = pattern === 'monthly' || tags.includes('monthly') || title.includes('monthly');
      
      if (isDaily) {
        // Daily tasks occur every single day! Always include them when viewing any date.
        return true;
      }
      
      const state = getTaskState(t);
      
      if (!t.due_date) {
        // Show tasks without a due date until they are completed
        return !state.isCompleted;
      }
      
      // Compare string prefix first to avoid timezone offset shifts (e.g. UTC vs IST)
      if (t.due_date.slice(0, 10) === selectedDate.slice(0, 10)) {
        return true;
      }
      
      const tDate = new Date(t.due_date);
      const sDate = new Date(selectedDate);

      // If task is overdue and NOT completed, show it on today's view or any selected view that is after its due date
      // This rolls over uncompleted tasks to the next day
      if (!state.isCompleted && tDate < sDate) {
        return true;
      }
      
      if (isMonthly) {
        // Show monthly tasks if they fall in the same month and year as the selected date
        if (tDate.getFullYear() !== sDate.getFullYear() || tDate.getMonth() !== sDate.getMonth()) {
          return false;
        }
      } else if (isWeekly) {
        // Show weekly tasks if they fall within the same calendar week as the selected date
        const getWeekStart = (d: Date) => {
          const date = new Date(d);
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          return new Date(date.setDate(diff)).setHours(0, 0, 0, 0);
        };
        if (getWeekStart(tDate) !== getWeekStart(sDate)) {
          return false;
        }
      } else {
        // Normal task: must match exact year, month, and day
        if (
          tDate.getFullYear() !== sDate.getFullYear() ||
          tDate.getMonth() !== sDate.getMonth() ||
          tDate.getDate() !== sDate.getDate()
        ) {
          return false;
        }
      }
    }

    if (filter === 'all') return true;
    if (filter === 'planned') return t.tags?.some(tag => tag.toLowerCase() === 'planned');
    if (filter === 'unplanned') return t.tags?.some(tag => tag.toLowerCase() === 'unplanned');
    if (['urgent', 'high', 'medium', 'low'].includes(filter)) return t.priority === filter;
    
    const state = getTaskState(t);
    if (filter === 'completed') return state.isCompleted;
    if (filter === 'overdue') return state.isOverdue;
    if (filter === 'due_today') return state.isDueToday;
    return true;
  });

  const overdueCount = tasks.filter(t => getTaskState(t).isOverdue).length;

  const sortedFilteredTasks = [...filteredTasks].sort((a, b) => {
    // completed tasks at the bottom
    const aCompleted = a.status === 'done';
    const bCompleted = b.status === 'done';
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
    
    // newly created at the top
    const aCreated = new Date(a.created_at || 0).getTime();
    const bCreated = new Date(b.created_at || 0).getTime();
    return bCreated - aCreated;
  });

  const views = ['kanban', 'list', 'gantt'] as const;

  const handleDragStart = (taskId: string) => setDraggedTask(taskId);
  const handleDrop = async (status: Task['status']) => {
    if (draggedTask) {
      const taskId = draggedTask;
      setDraggedTask(null);
      updateTask(taskId, { status });
      try {
        await dataService.updateTask(taskId, { status });
      } catch (err) {
        console.error('Failed to update task on drop', err);
      }
    }
  };
  
  const handleMarkComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const updates = { status: 'done' } as Partial<Task>;
    updateTask(task.id, updates);
    try {
      await dataService.updateTask(task.id, updates);
    } catch (err) {
      console.error('Failed to mark task complete', err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>Task Management</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.1)', color: '#a855f7' }}>Total: {tasks.length}</span>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.1)', color: '#10b981' }}>Done: {tasks.filter(t => t.status === 'done').length}</span>
            {overdueCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: isDark ? 'rgba(244,63,94,0.1)' : 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>Overdue: {overdueCount}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View Switcher */}
          <div className="flex rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(255,255,255,0.6)', border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}` }}>
            {views.map(v => (
              <button key={v} onClick={() => setTaskView(v)} className="px-4 py-2 text-xs font-medium transition-all" style={{
                background: taskView === v ? 'rgba(139,92,246,0.15)' : 'transparent',
                color: taskView === v ? '#a855f7' : mutedColor,
              }}>
                {v === 'kanban' ? '▦ Kanban' : v === 'list' ? '☰ List' : '📊 Gantt'}
              </button>
            ))}
          </div>
          
          {/* Scope Switcher */}
          <div className="flex items-center gap-2">
            <select value={taskScope} onChange={e => {
              setTaskScope(e.target.value as 'my_tasks' | 'team_tasks');
              if (e.target.value === 'team_tasks' && selectedTeamId === 'all' && teams.length > 0) {
                // Keep 'all' or select first team
              }
            }} className="input-field py-2 text-xs font-semibold" style={{ width: 'auto', background: isDark ? '#1e1b2e' : '#f8f7fa' }}>
              <option value="my_tasks">👤 My Task</option>
              <option value="team_tasks">👥 Select Team</option>
            </select>
            
            {taskScope === 'team_tasks' && (
              <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} className="input-field py-2 text-xs" style={{ width: 'auto' }}>
                <option value="all">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Filter */}
          <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field py-2 text-xs" style={{ width: 'auto' }}>
            <optgroup label="Views">
              <option value="all">All Tasks</option>
              <option value="due_today">Due Today</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </optgroup>
            <optgroup label="Plan Type">
              <option value="planned">📅 Planned</option>
              <option value="unplanned">⚡ Unplanned</option>
            </optgroup>
            <optgroup label="Priority">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </optgroup>
          </select>
          
          {/* Date Filter */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="input-field py-1.5 text-xs"
              style={{ width: 'auto' }}
              title="Filter by due date (defaults to today)"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="px-2 py-1 rounded-lg text-xs font-bold transition-colors hover:bg-purple-500/20"
                style={{ color: mutedColor }}
                title="Clear date filter (show all dates)"
              >
                ✕
              </button>
            )}
          </div>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedTaskId('new')} className="btn-primary text-xs">
            ＋ Add Task
          </motion.button>
        </div>
      </div>

      {/* Kanban Board */}
      {taskView === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
          {(Object.keys(statusConfig) as Task['status'][]).map(status => {
            const config = statusConfig[status];
            const columnTasks = sortedFilteredTasks.filter(t => t.status === status);
            return (
              <div
                key={status}
                className="kanban-column flex-shrink-0"
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(status)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span className="text-sm font-semibold" style={{ color: textColor }}>{config.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${config.color}20`, color: config.color }}>{columnTasks.length}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {columnTasks.map(task => {
                      const state = getTaskState(task);
                      let cardStyle = {};
                      if (state.isCompleted) {
                        cardStyle = { borderColor: '#10b981', background: isDark ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.1)' };
                      } else if (state.isOverdue) {
                        cardStyle = { borderColor: '#f43f5e', background: isDark ? 'rgba(244, 63, 94, 0.05)' : 'rgba(244, 63, 94, 0.1)' };
                      } else if (state.isDueToday) {
                        cardStyle = { borderColor: '#f97316' };
                      }

                      return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="task-card cursor-pointer relative group"
                        style={cardStyle}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2 pr-6">
                          <span className="text-sm font-medium leading-snug" style={{ color: textColor }}>{task.title}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: priorityColors[task.priority] }} />
                          </div>
                        </div>

                        {!state.isCompleted && (
                          <button 
                            onClick={(e) => handleMarkComplete(task, e)}
                            className="absolute top-3 right-3 w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-500 hover:border-green-500 hover:text-white text-transparent"
                            title="Mark Complete"
                          >
                            ✓
                          </button>
                        )}
                        {state.isCompleted && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
                            ✓
                          </div>
                        )}

                        {state.isOverdue && (
                          <div className="mb-2">
                            <span className="text-[10px] px-2 py-0.5 rounded text-white bg-rose-500 font-semibold">
                              Delayed by {state.daysDelayed} {state.daysDelayed === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        )}
                        {task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.tags.some(t => t.toLowerCase() === 'unplanned') ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">⚡ Unplanned</span>
                            ) : task.tags.some(t => t.toLowerCase() === 'planned') ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-500 border border-purple-500/30">📅 Planned</span>
                            ) : null}
                            {task.tags.filter(t => t.toLowerCase() !== 'planned' && t.toLowerCase() !== 'unplanned').slice(0, 3).map(tag => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: mutedColor }}>{tag}</span>
                            ))}
                          </div>
                        )}
                        {(task.subtasks || []).length > 0 && (
                          <div className="mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0' }}>
                                <div className="h-full rounded-full" style={{ width: `${((task.subtasks || []).filter(s => s.is_completed).length / (task.subtasks || []).length) * 100}%`, background: config.color }} />
                              </div>
                              <span className="text-[10px]" style={{ color: mutedColor }}>{(task.subtasks || []).filter(s => s.is_completed).length}/{(task.subtasks || []).length}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {task.assignee && <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}>{task.assignee.full_name?.charAt(0)}</span>}
                            {task.due_date && !state.isCompleted && <span className="text-[10px]" style={{ color: mutedColor }}>📅 {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                            {state.isCompleted && task.completed_at && <span className="text-[10px] text-green-500 font-medium">✅ {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                          </div>
                        </div>
                      </motion.div>
                    );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {taskView === 'list' && (
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-[1fr,100px,100px,120px,80px] gap-4 px-5 py-3 border-b text-xs font-semibold" style={{ color: mutedColor, borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
            <span>Task</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due</span>
          </div>
          {sortedFilteredTasks.map(task => (
            <motion.div key={task.id} onClick={() => setSelectedTaskId(task.id)} whileHover={{ background: isDark ? 'rgba(139,92,246,0.04)' : 'rgba(139,92,246,0.03)' }} className="grid grid-cols-[1fr,100px,100px,120px,80px] gap-4 px-5 py-3 border-b items-center cursor-pointer" style={{ borderColor: isDark ? 'rgba(42,42,58,0.5)' : 'rgba(229,226,240,0.5)' }}>
              <span className="text-sm" style={{ color: textColor }}>{task.title}</span>
              <span className="text-[10px] px-2 py-1 rounded-full text-center font-medium" style={{ background: `${statusConfig[task.status].color}15`, color: statusConfig[task.status].color }}>{statusConfig[task.status].label}</span>
              <span className={`badge badge-${task.priority} text-center`}>{task.priority}</span>
              <span className="text-xs flex items-center gap-1" style={{ color: mutedColor }}>{task.assignee ? task.assignee.full_name?.split(' ')[0] : '—'}</span>
              <span className="text-[11px]" style={{ color: mutedColor }}>{task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Gantt View */}
      {taskView === 'gantt' && (
        <GanttBoard filteredTasks={sortedFilteredTasks} />
      )}

      {/* Task Detail & Edit Modal */}
      <TaskDetailModal />
    </div>
  );
}
