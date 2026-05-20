'use client';

import { useAppStore, Task } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import TaskDetailModal from '@/components/modals/TaskDetailModal';

const statusConfig = {
  todo: { label: 'To Do', color: '#8b5cf6', icon: '📋' },
  in_progress: { label: 'In Progress', color: '#06b6d4', icon: '🔄' },
  review: { label: 'Review', color: '#f59e0b', icon: '👀' },
  done: { label: 'Done', color: '#10b981', icon: '✅' },
};

const priorityColors = { urgent: '#f43f5e', high: '#f97316', medium: '#f59e0b', low: '#10b981' };

export default function TasksView() {
  const { theme, tasks, taskView, setTaskView, updateTask, setQuickAddOpen, setSelectedTaskId } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.priority === filter);
  const views = ['kanban', 'list'] as const;

  const handleDragStart = (taskId: string) => setDraggedTask(taskId);
  const handleDrop = (status: Task['status']) => {
    if (draggedTask) {
      updateTask(draggedTask, { status });
      setDraggedTask(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>Task Management</h1>
          <p className="text-xs mt-1" style={{ color: mutedColor }}>{tasks.length} tasks · {tasks.filter(t => t.status === 'done').length} completed</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Switcher */}
          <div className="flex rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(255,255,255,0.6)', border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}` }}>
            {views.map(v => (
              <button key={v} onClick={() => setTaskView(v)} className="px-4 py-2 text-xs font-medium transition-all" style={{
                background: taskView === v ? 'rgba(139,92,246,0.15)' : 'transparent',
                color: taskView === v ? '#a855f7' : mutedColor,
              }}>
                {v === 'kanban' ? '▦ Kanban' : '☰ List'}
              </button>
            ))}
          </div>
          {/* Filter */}
          <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field py-2 text-xs" style={{ width: 'auto' }}>
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setQuickAddOpen(true)} className="btn-primary text-xs">
            ＋ Add Task
          </motion.button>
        </div>
      </div>

      {/* Kanban Board */}
      {taskView === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
          {(Object.keys(statusConfig) as Task['status'][]).map(status => {
            const config = statusConfig[status];
            const columnTasks = filteredTasks.filter(t => t.status === status);
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
                    {columnTasks.map(task => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="task-card cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-sm font-medium leading-snug" style={{ color: textColor }}>{task.title}</span>
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: priorityColors[task.priority] }} />
                        </div>
                        {task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {task.tags.slice(0, 3).map(tag => (
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
                            {task.due_date && <span className="text-[10px]" style={{ color: mutedColor }}>📅 {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                          </div>
                        </div>
                      </motion.div>
                    ))}
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
          {filteredTasks.map(task => (
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

      {/* Task Detail & Edit Modal */}
      <TaskDetailModal />
    </div>
  );
}
