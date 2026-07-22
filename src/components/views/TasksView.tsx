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

// ─── Helpers ────────────────────────────────────────────────────────

function isSunday(dateStr: string): boolean {
  return new Date(dateStr + 'T00:00:00').getDay() === 0;
}

type TaskSection = {
  key: string;
  label: string;
  icon: string;
  color: string;
  tasks: Task[];
};

function buildSections(
  tasks: Task[],
  selectedDate: string,
  userId: string | undefined,
  isAdmin: boolean,
  taskScope: string,
  selectedTeamId: string,
): TaskSection[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate > todayStr;
  const isPast = selectedDate < todayStr;
  const isSundaySelected = isSunday(selectedDate);

  // First, scope-filter tasks
  const scopedTasks = tasks.filter((t) => {
    // Hide template tasks (source_task_id IS NULL and they are recurring) - they shouldn't appear directly on the daily board
    if (t.is_recurring && !t.source_task_id) {
      return false;
    }

    if (taskScope === 'my_tasks') {
      return t.assignee_id === userId;
    } else {
      if (selectedTeamId !== 'all') {
        return t.team_id === selectedTeamId || (t as any).assignee?.team_id === selectedTeamId;
      }
      return true;
    }
  });

  const activeTasks = scopedTasks;

  const sortTasks = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  };

  // ── TODAY ──────────────────────────────────────────────────────
  if (isToday) {
    // Section 1: Carry Forward — due before today, not done, skip Sunday-dated daily tasks
    const carryForward = activeTasks.filter((t) => {
      if (!t.due_date || t.due_date >= todayStr) return false;
      if (t.status === 'done') return false;
      // If it's a daily task from a Sunday, don't carry it forward
      if (t.recurrence_pattern === 'daily' && isSunday(t.due_date)) return false;
      return true;
    }).sort((a, b) => {
      const dateCmp = (a.due_date || '').localeCompare(b.due_date || '');
      if (dateCmp !== 0) return dateCmp;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    // Tasks due today
    const todayTasks = activeTasks.filter((t) => t.due_date === todayStr);

    // If today is Sunday, hide daily tasks
    const section3 = sortTasks(isSundaySelected ? [] : todayTasks.filter((t) => t.recurrence_pattern === 'daily'));
    const section4 = sortTasks(todayTasks.filter((t) => t.recurrence_pattern === 'weekly'));
    const section5 = sortTasks(todayTasks.filter((t) => t.recurrence_pattern === 'monthly'));
    // One-time: not recurring
    const oneTime = sortTasks(todayTasks.filter((t) => !t.is_recurring));

    // Also include tasks with NO due date that aren't done (or completed today)
    const noDueDateTasks = sortTasks(activeTasks.filter((t) => {
      if (t.due_date) return false;
      if (t.status === 'done') {
        const completionTime = t.completed_at || t.updated_at || t.created_at;
        if (!completionTime) return true;
        const safeTime = completionTime.includes('T') ? completionTime : completionTime.replace(' ', 'T');
        const msSinceCompletion = new Date().getTime() - new Date(safeTime).getTime();
        return !isNaN(msSinceCompletion) && msSinceCompletion < 24 * 60 * 60 * 1000; // Show if completed within the last 24 hours
      }
      return true;
    }));

    const sections: TaskSection[] = [];
    if (carryForward.length > 0) {
      // If Sunday, filter out daily carry-forwards
      const cfFiltered = isSundaySelected
        ? carryForward.filter((t) => t.recurrence_pattern !== 'daily')
        : carryForward;
      if (cfFiltered.length > 0) {
        sections.push({
          key: 'carry_forward',
          label: `Carry Forward (${cfFiltered.length})`,
          icon: '⏪',
          color: '#f43f5e',
          tasks: cfFiltered,
        });
      }
    }
    if (noDueDateTasks.length > 0) {
      sections.push({
        key: 'no_date',
        label: `Pending Tasks`,
        icon: '📌',
        color: '#8b5cf6',
        tasks: noDueDateTasks,
      });
    }
    if (oneTime.length > 0) {
      sections.push({
        key: 'one_time',
        label: `One-Time Tasks`,
        icon: '📌',
        color: '#6366f1',
        tasks: oneTime,
      });
    }
    if (section3.length > 0) {
      sections.push({
        key: 'daily',
        label: `Daily Tasks`,
        icon: '📅',
        color: '#06b6d4',
        tasks: section3,
      });
    }
    if (section4.length > 0) {
      sections.push({
        key: 'weekly',
        label: `Weekly Tasks`,
        icon: '📅',
        color: '#8b5cf6',
        tasks: section4,
      });
    }
    if (section5.length > 0) {
      sections.push({
        key: 'monthly',
        label: `Monthly Tasks`,
        icon: '📅',
        color: '#10b981',
        tasks: section5,
      });
    }
    return sections;
  }

  // ── FUTURE DATE ───────────────────────────────────────────────
  if (isFuture) {
    const futureTasks = sortTasks(activeTasks.filter((t) => t.due_date === selectedDate));
    if (futureTasks.length === 0) return [];
    return [{
      key: 'scheduled',
      label: `Scheduled for ${selectedDate}`,
      icon: '📅',
      color: '#8b5cf6',
      tasks: futureTasks,
    }];
  }

  // ── PAST DATE (HISTORY) ───────────────────────────────────────
  if (isPast) {
    const pastTasks = sortTasks(scopedTasks.filter((t) => t.due_date === selectedDate));
    if (pastTasks.length === 0) return [];
    return [{
      key: 'history',
      label: `History — ${selectedDate}`,
      icon: '📜',
      color: '#71717a',
      tasks: pastTasks,
    }];
  }

  return [];
}

// No-date filter: show all pending grouped by date
function buildAllPendingSections(
  tasks: Task[],
  userId: string | undefined,
  taskScope: string,
  selectedTeamId: string,
): TaskSection[] {
  const todayStr = new Date().toISOString().slice(0, 10);

  const scopedTasks = tasks.filter((t) => {
    // Hide template tasks
    if (t.is_recurring && !t.source_task_id) return false;

    if (taskScope === 'my_tasks') return t.assignee_id === userId;
    if (selectedTeamId !== 'all') return t.team_id === selectedTeamId;
    return true;
  });

  const pending = scopedTasks.filter((t) => {
    if (t.status === 'done') {
      const completionTime = t.completed_at || t.updated_at || t.created_at;
      if (!completionTime) return true;
      const safeTime = completionTime.includes('T') ? completionTime : completionTime.replace(' ', 'T');
      const msSinceCompletion = new Date().getTime() - new Date(safeTime).getTime();
      return !isNaN(msSinceCompletion) && msSinceCompletion < 24 * 60 * 60 * 1000;
    }
    return true;
  });

  // Carry-forward
  const carryForward = pending.filter((t) => t.due_date && t.due_date < todayStr && t.status !== 'done')
    .sort((a, b) => {
      const dateCmp = (a.due_date || '').localeCompare(b.due_date || '');
      if (dateCmp !== 0) return dateCmp;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  // Today
  const todayTasks = pending.filter((t) => t.due_date === todayStr)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  // Future
  const futureTasks = pending.filter((t) => t.due_date && t.due_date > todayStr)
    .sort((a, b) => {
      const dateCmp = (a.due_date || '').localeCompare(b.due_date || '');
      if (dateCmp !== 0) return dateCmp;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  // No date
  const noDate = pending.filter((t) => !t.due_date)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const sections: TaskSection[] = [];
  if (carryForward.length > 0) {
    sections.push({ key: 'carry_forward', label: `Carry Forward (${carryForward.length})`, icon: '⏪', color: '#f43f5e', tasks: carryForward });
  }
  if (todayTasks.length > 0) {
    sections.push({ key: 'today', label: `Today`, icon: '📅', color: '#8b5cf6', tasks: todayTasks });
  }
  if (futureTasks.length > 0) {
    sections.push({ key: 'upcoming', label: `Upcoming`, icon: '📆', color: '#06b6d4', tasks: futureTasks });
  }
  if (noDate.length > 0) {
    sections.push({ key: 'no_date', label: `No Due Date`, icon: '📌', color: '#71717a', tasks: noDate });
  }
  return sections;
}

// ─── Component ──────────────────────────────────────────────────────

export default function TasksView() {
  const { theme, tasks, taskView, setTaskView, updateTask, setQuickAddOpen, setSelectedTaskId, teams } = useAppStore();
  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [taskScope, setTaskScope] = useState<'my_tasks' | 'team_tasks'>('my_tasks');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Build sections
  const sections = selectedDate
    ? buildSections(tasks, selectedDate, currentUser?.id, isAdmin, taskScope, selectedTeamId)
    : buildAllPendingSections(tasks, currentUser?.id, taskScope, selectedTeamId);

  // Flatten for kanban/list/gantt views
  const allSectionTasks = sections.flatMap((s) => s.tasks);

  // Apply extra filters
  const filteredTasks = allSectionTasks.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'planned') return t.tags?.some((tag) => tag.toLowerCase() === 'planned');
    if (filter === 'unplanned') return t.tags?.some((tag) => tag.toLowerCase() === 'unplanned');
    if (['urgent', 'high', 'medium', 'low'].includes(filter)) return t.priority === filter;
    if (filter === 'completed') return t.status === 'done';
    if (filter === 'overdue') return t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && t.status !== 'done';
    if (filter === 'due_today') return t.due_date === new Date().toISOString().slice(0, 10);
    return true;
  });

  const overdueCount = allSectionTasks.filter(
    (t) => t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && t.status !== 'done'
  ).length;

  const views = ['kanban', 'list', 'gantt'] as const;

  const handleDragStart = (taskId: string) => setDraggedTask(taskId);
  const handleDrop = async (status: Task['status']) => {
    if (draggedTask) {
      const taskId = draggedTask;
      setDraggedTask(null);
      
      const updates: Partial<Task> = { status, updated_at: new Date().toISOString() };
      if (status === 'done') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }
      
      updateTask(taskId, updates);
      try {
        await dataService.updateTask(taskId, updates);
      } catch (err) {
        console.error('Failed to update task on drop', err);
      }
    }
  };

  const handleMarkComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const updates = { status: 'done' as const, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    updateTask(task.id, updates);
    try {
      await dataService.updateTask(task.id, updates);
    } catch (err) {
      console.error('Failed to mark task complete', err);
    }
  };

  // Get task visual state
  const getTaskState = (task: Task) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isCompleted = task.status === 'done';
    let isOverdue = false;
    let isDueToday = false;
    let daysDelayed = 0;

    if (!isCompleted && task.due_date) {
      if (task.due_date < todayStr) {
        isOverdue = true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        daysDelayed = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      } else if (task.due_date === todayStr) {
        isDueToday = true;
      }
    }
    return { isCompleted, isOverdue, isDueToday, daysDelayed };
  };

  // ─── Render Task Card ─────────────────────────────────────────────
  const renderTaskCard = (task: Task) => {
    const state = getTaskState(task);
    let cardStyle: React.CSSProperties = {};
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
        {task.tags && task.tags.length > 0 && (
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
                <div className="h-full rounded-full" style={{ width: `${((task.subtasks || []).filter(s => s.is_completed).length / (task.subtasks || []).length) * 100}%`, background: '#8b5cf6' }} />
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
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>Task Management</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(139,92,246,0.1)', color: '#a855f7' }}>Total: {allSectionTasks.length}</span>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Done: {allSectionTasks.filter(t => t.status === 'done').length}</span>
            {overdueCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>Overdue: {overdueCount}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          {isAdmin && (
            <div className="flex items-center gap-2">
              <select value={taskScope} onChange={e => {
                setTaskScope(e.target.value as 'my_tasks' | 'team_tasks');
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
          )}

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

      {/* Sectioned List View (Default for the new system) */}
      {taskView === 'list' && (
        <div className="space-y-6">
          {sections.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-sm" style={{ color: mutedColor }}>No tasks for this date. 🎉</p>
            </div>
          )}
          {sections.map((section) => (
            <div key={section.key}>
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span>{section.icon}</span>
                <span className="text-sm font-bold" style={{ color: section.color }}>{section.label}</span>
                <div className="flex-1 h-px" style={{ background: `${section.color}30` }} />
              </div>
              <div className="glass-card overflow-hidden">
                <div className="grid grid-cols-[1fr,100px,100px,120px,80px] gap-4 px-5 py-3 border-b text-xs font-semibold" style={{ color: mutedColor, borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
                  <span>Task</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due</span>
                </div>
                {section.tasks.filter(t => {
                  if (filter === 'all') return true;
                  if (filter === 'planned') return t.tags?.some(tag => tag.toLowerCase() === 'planned');
                  if (filter === 'unplanned') return t.tags?.some(tag => tag.toLowerCase() === 'unplanned');
                  if (['urgent', 'high', 'medium', 'low'].includes(filter)) return t.priority === filter;
                  return true;
                }).map(task => (
                  <motion.div key={task.id} onClick={() => setSelectedTaskId(task.id)} whileHover={{ background: isDark ? 'rgba(139,92,246,0.04)' : 'rgba(139,92,246,0.03)' }} className="grid grid-cols-[1fr,100px,100px,120px,80px] gap-4 px-5 py-3 border-b items-center cursor-pointer" style={{ borderColor: isDark ? 'rgba(42,42,58,0.5)' : 'rgba(229,226,240,0.5)' }}>
                    <div className="flex items-center gap-2">
                      {task.status !== 'done' && (
                        <button onClick={(e) => handleMarkComplete(task, e)} className="w-4 h-4 rounded-full border-2 border-gray-400 flex-shrink-0 hover:bg-green-500 hover:border-green-500 transition-colors" />
                      )}
                      {task.status === 'done' && (
                        <div className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[8px] flex-shrink-0">✓</div>
                      )}
                      <span className={`text-sm ${task.status === 'done' ? 'line-through opacity-50' : ''}`} style={{ color: textColor }}>{task.title}</span>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full text-center font-medium" style={{ background: `${statusConfig[task.status].color}15`, color: statusConfig[task.status].color }}>{statusConfig[task.status].label}</span>
                    <span className={`badge badge-${task.priority} text-center`}>{task.priority}</span>
                    <span className="text-xs flex items-center gap-1" style={{ color: mutedColor }}>{task.assignee ? task.assignee.full_name?.split(' ')[0] : '—'}</span>
                    <span className="text-[11px]" style={{ color: mutedColor }}>{task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Board */}
      {taskView === 'kanban' && (
        <div className="space-y-6">
          {/* Section headers for Kanban */}
          {sections.map((section) => (
            <div key={section.key}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span>{section.icon}</span>
                <span className="text-sm font-bold" style={{ color: section.color }}>{section.label}</span>
                <div className="flex-1 h-px" style={{ background: `${section.color}30` }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pb-4" style={{ minHeight: 120 }}>
                {(Object.keys(statusConfig) as Task['status'][]).map(status => {
                  const config = statusConfig[status];
                  const columnTasks = section.tasks.filter(t => t.status === status).filter(t => {
                    if (filter === 'all') return true;
                    if (filter === 'planned') return t.tags?.some(tag => tag.toLowerCase() === 'planned');
                    if (filter === 'unplanned') return t.tags?.some(tag => tag.toLowerCase() === 'unplanned');
                    if (['urgent', 'high', 'medium', 'low'].includes(filter)) return t.priority === filter;
                    return true;
                  });
                  return (
                    <div
                      key={status}
                      className="kanban-column"
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleDrop(status)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{config.icon}</span>
                          <span className="text-xs font-semibold" style={{ color: textColor }}>{config.label}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${config.color}20`, color: config.color }}>{columnTasks.length}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <AnimatePresence>
                          {columnTasks.map(task => renderTaskCard(task))}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {sections.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-sm" style={{ color: mutedColor }}>No tasks for this date. 🎉</p>
            </div>
          )}
        </div>
      )}

      {/* Gantt View */}
      {taskView === 'gantt' && (
        <GanttBoard filteredTasks={filteredTasks} />
      )}

      {/* Task Detail & Edit Modal */}
      <TaskDetailModal />
    </div>
  );
}
