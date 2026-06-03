'use client';

import { useAppStore, Task } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import * as dataService from '@/lib/dataService';
import { sendWhatsAppReminder } from '@/lib/whatsapp';
import { DbUser } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';

export default function TaskDetailModal() {
  const {
    theme,
    selectedTaskId,
    setSelectedTaskId,
    tasks,
    updateTask,
    deleteTask,
    addTask,
    teamMembers,
  } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';

  const isNew = selectedTaskId === 'new';
  const task = isNew ? null : tasks.find((t) => t.id === selectedTaskId);

  // States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Date / Time / Duration Picker states
  const [activeDateTab, setActiveDateTab] = useState<'date' | 'duration'>('date');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // This is Due Date
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('none');
  const [selectedReminder, setSelectedReminder] = useState<string>('none');
  const [selectedRepeat, setSelectedRepeat] = useState<string>('none');
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Subtasks
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Ref for picking date dialog
  const pickerRef = useRef<HTMLDivElement>(null);

  // Colors and styling
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const cardBg = isDark ? 'rgba(30,30,45,0.75)' : 'rgba(255,255,255,0.85)';
  const borderColor = isDark ? '#2a2a3a' : '#e5e2f0';
  const inputBg = isDark ? '#12121a' : '#f5f3ff';

  // Load task detail when task or selectedTaskId changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'medium');
      setAssigneeId(task.assignee_id || null);
      setTags(task.tags || []);
      
      // Parse dates
      setSelectedDate(task.due_date ? new Date(task.due_date) : null);
      setStartDate(task.start_date ? new Date(task.start_date) : null);
      setSelectedTime(task.due_time || 'none');
      setSelectedReminder(task.reminder || 'none');
      setSelectedRepeat(task.recurrence_pattern || 'none');
      setDurationMinutes(task.duration_minutes || 0);
      setDependsOn(task.depends_on || []);

      // Load subtasks & comments from Supabase
      loadSubtasksAndComments(task.id);
    } else if (isNew) {
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      setAssigneeId(null);
      setTags([]);
      setSelectedDate(null);
      setStartDate(null);
      setSelectedTime('none');
      setSelectedReminder('none');
      setSelectedRepeat('none');
      setDurationMinutes(0);
      setDependsOn([]);
      setSubtasks([]);
      setComments([]);
    }
  }, [task, selectedTaskId, isNew]);

  // Click outside to close datepicker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSubtasksAndComments = async (taskId: string) => {
    try {
      const fetchedSubtasks = await dataService.fetchSubtasks(taskId);
      setSubtasks(fetchedSubtasks);
      
      const fetchedComments = await dataService.fetchTaskComments(taskId);
      setComments(fetchedComments || []);
    } catch (err) {
      console.error('Failed to load subtasks or comments:', err);
    }
  };

  const handleSave = async () => {
    if (!task && !isNew) return;
    setIsSaving(true);
    try {
      const updates = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assignee_id: assigneeId,
        tags,
        due_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        depends_on: dependsOn,
        due_time: selectedTime !== 'none' ? selectedTime : null,
        reminder: selectedReminder !== 'none' ? selectedReminder : null,
        duration_minutes: durationMinutes > 0 ? durationMinutes : null,
        is_recurring: selectedRepeat !== 'none',
        recurrence_pattern: selectedRepeat !== 'none' ? selectedRepeat : null,
        estimated_hours: durationMinutes > 0 ? durationMinutes / 60 : null,
      };

      if (isNew) {
        const created = await dataService.createTask(updates);
        const createdSubtasks = [];
        for (let i = 0; i < subtasks.length; i++) {
          const newSub = await dataService.createSubtask({
            task_id: created.id,
            title: subtasks[i].title,
            is_completed: subtasks[i].is_completed,
            order_index: i,
          });
          createdSubtasks.push(newSub);
        }
        addTask({
          ...created,
          subtasks: createdSubtasks,
          assignee: teamMembers.find(m => m.id === assigneeId) || null,
        });
      } else {
        const updated = await dataService.updateTask(task!.id, updates);
        // Update global store
        updateTask(task!.id, {
          ...updated,
          subtasks, // keep subtasks
          assignee: teamMembers.find(m => m.id === assigneeId) || null,
        });
      }

      setSelectedTaskId(null);
    } catch (err: any) {
      console.error('Error saving task:', err);
      if (err.message && err.message.includes('column')) {
        alert('Database Error: ' + err.message + '. Did you forget to run the migration?');
      } else {
        alert('Failed to save task: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await dataService.deleteTask(task.id);
        deleteTask(task.id);
        setSelectedTaskId(null);
      } catch (err) {
        console.error('Error deleting task:', err);
        alert('Failed to delete task');
      }
    }
  };

  // Subtasks CRUD
  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || (!task && !isNew)) return;
    if (isNew) {
      setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtaskTitle.trim(), is_completed: false }]);
      setNewSubtaskTitle('');
      return;
    }
    try {
      const newSub = await dataService.createSubtask({
        task_id: task!.id,
        title: newSubtaskTitle.trim(),
        is_completed: false,
        order_index: subtasks.length,
      });
      setSubtasks([...subtasks, newSub]);
      setNewSubtaskTitle('');
      
      // Update local store tasks with updated subtasks
      updateTask(task!.id, { subtasks: [...subtasks, newSub] });
    } catch (err) {
      console.error('Error adding subtask:', err);
    }
  };

  const handleToggleSubtask = async (sub: any) => {
    if (!task && !isNew) return;
    if (isNew) {
      setSubtasks(subtasks.map(s => s.id === sub.id ? { ...s, is_completed: !s.is_completed } : s));
      return;
    }
    try {
      const updated = await dataService.updateSubtask(sub.id, {
        is_completed: !sub.is_completed,
      });
      const newSubs = subtasks.map(s => s.id === sub.id ? updated : s);
      setSubtasks(newSubs);
      updateTask(task!.id, { subtasks: newSubs });
    } catch (err) {
      console.error('Error toggling subtask:', err);
    }
  };

  const handleDeleteSubtask = async (subId: string) => {
    if (!task && !isNew) return;
    if (isNew) {
      setSubtasks(subtasks.filter(s => s.id !== subId));
      return;
    }
    try {
      await dataService.deleteSubtask(subId);
      const newSubs = subtasks.filter(s => s.id !== subId);
      setSubtasks(newSubs);
      updateTask(task!.id, { subtasks: newSubs });
    } catch (err) {
      console.error('Error deleting subtask:', err);
    }
  };

  // Comments CRUD
  const handleAddComment = async () => {
    if (!newCommentText.trim() || !task || !currentUser) return;
    try {
      const newComment = await dataService.createTaskComment({
        task_id: task.id,
        user_id: currentUser.id,
        content: newCommentText.trim(),
      });
      setComments([...comments, newComment]);
      setNewCommentText('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await dataService.deleteTaskComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  // Tag helpers
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Render Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0 = Sunday, 1 = Monday, etc.

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Placeholder empty cells for alignment
  const emptyCells = Array.from({ length: startDayOfWeek === 0 ? 6 : startDayOfWeek - 1 });

  const getReminderLabel = (val: string) => {
    switch (val) {
      case 'none': return 'None';
      case 'at_due': return 'At due time';
      case '5m': return '5 mins before';
      case '15m': return '15 mins before';
      case '30m': return '30 mins before';
      case '1h': return '1 hour before';
      case '1d': return '1 day before';
      default: return 'None';
    }
  };

  const getRepeatLabel = (val: string) => {
    switch (val) {
      case 'none': return 'None';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return 'None';
    }
  };

  if (!task && !isNew) return null;

  return (
    <AnimatePresence>
      {selectedTaskId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            onClick={() => setSelectedTaskId(null)}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed inset-x-4 top-6 bottom-6 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-4xl z-50 flex rounded-3xl overflow-hidden glass-card shadow-2xl flex-col md:flex-row"
            style={{
              background: isDark ? 'rgba(15,15,22,0.92)' : 'rgba(255,255,255,0.95)',
              border: `1px solid ${borderColor}`,
            }}
          >
            {/* Left Content Area (Main Details) */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Task Title & Description */}
                <div className="space-y-3">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent text-lg font-bold outline-none border-b border-transparent focus:border-purple-500/30 pb-1"
                    placeholder="Task title..."
                    style={{ color: textColor }}
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none resize-none min-h-[80px]"
                    placeholder="Add description or notes..."
                    style={{ color: mutedColor }}
                  />
                </div>

                {/* Advanced Date/Time Pick Option (TickTick style button) */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsDatePickerOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold shadow-sm transition-all"
                    style={{
                      background: selectedDate ? 'rgba(139,92,246,0.15)' : inputBg,
                      color: selectedDate ? '#a855f7' : mutedColor,
                      border: `1px solid ${selectedDate ? 'rgba(139,92,246,0.3)' : borderColor}`,
                    }}
                  >
                    📅 {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Set Date & Time'}
                    {selectedTime !== 'none' && ` @ ${selectedTime}`}
                    {selectedRepeat !== 'none' && ` 🔁`}
                  </button>

                  {durationMinutes > 0 && (
                    <span
                      className="px-3 py-1.5 rounded-2xl text-[10px] font-bold"
                      style={{
                        background: 'rgba(6,182,212,0.12)',
                        color: '#06b6d4',
                        border: `1px solid rgba(6,182,212,0.2)`,
                      }}
                    >
                      ⏱️ {durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` : `${durationMinutes}m`}
                    </span>
                  )}
                </div>

                {/* Subtasks Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: mutedColor }}>
                    Checklist ({(subtasks.filter((s) => s.is_completed).length)}/{subtasks.length})
                  </h3>
                  <div className="space-y-2">
                    {subtasks.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-xl transition-all"
                        style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                      >
                        <input
                          type="checkbox"
                          checked={sub.is_completed}
                          onChange={() => handleToggleSubtask(sub)}
                          className="w-4 h-4 rounded border-purple-500 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <span
                          className={`text-xs flex-1 ${sub.is_completed ? 'line-through' : ''}`}
                          style={{ color: sub.is_completed ? mutedColor : textColor }}
                        >
                          {sub.title}
                        </span>
                        <button
                          onClick={() => handleDeleteSubtask(sub.id)}
                          className="text-xs hover:text-red-500 transition-colors"
                          style={{ color: mutedColor }}
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                      placeholder="Add subtask..."
                      className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                      style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                    />
                    <button
                      onClick={handleAddSubtask}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
                    >
                      ＋
                    </button>
                  </div>
                </div>

                {/* Comments Section */}
                {!isNew && (
                  <div className="space-y-3 border-t pt-4" style={{ borderColor }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: mutedColor }}>Comments</h3>
                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2">
                      {comments.map((comm) => (
                        <div key={comm.id} className="flex gap-3 text-xs items-start">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[9px] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}>
                            {comm.user?.full_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between">
                              <span className="font-semibold" style={{ color: textColor }}>{comm.user?.full_name || 'Team member'}</span>
                              <span className="text-[9px]" style={{ color: mutedColor }}>
                                {comm.created_at ? new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p style={{ color: textColor }}>{comm.content}</p>
                          </div>
                          {currentUser && comm.user_id === currentUser.id && (
                            <button onClick={() => handleDeleteComment(comm.id)} className="text-[9px] hover:text-red-500" style={{ color: mutedColor }}>Delete</button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        placeholder="Write a comment..."
                        className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                        style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                      />
                      <button
                        onClick={handleAddComment}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t" style={{ borderColor }}>
                {!isNew && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-red-500 hover:bg-red-500/10 border border-red-500/20"
                  >
                    🗑️ Delete Task
                  </button>
                )}
                <div className="flex-1" />
                {!isNew && task?.assignee?.phone && (
                  <button
                    onClick={async () => {
                      setIsSendingWhatsApp(true);
                      try {
                        await sendWhatsAppReminder(
                          task.assignee!.phone!,
                          `Hey ${task.assignee!.full_name?.split(' ')[0]}, reminder for task: ${task.title}`
                        );
                        alert('WhatsApp reminder sent!');
                      } catch (err) {
                        alert('Failed to send WhatsApp reminder');
                      } finally {
                        setIsSendingWhatsApp(false);
                      }
                    }}
                    disabled={isSendingWhatsApp}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: '#25D366' }}
                  >
                    {isSendingWhatsApp ? 'Sending...' : '📱 Send WA Reminder'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: inputBg, color: textColor }}
                >
                  Close
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !title.trim()}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
                >
                  {isSaving ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </div>

            {/* Right Panel Area (Sidebar Details) */}
            <div
              className="w-full md:w-[280px] p-6 space-y-5 flex-shrink-0"
              style={{
                background: isDark ? 'rgba(20,20,30,0.4)' : 'rgba(240,238,252,0.4)',
                borderLeft: `1px solid ${borderColor}`,
              }}
            >
              {/* Status Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: mutedColor }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                  style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                >
                  <option value="todo">📋 To Do</option>
                  <option value="in_progress">🔄 In Progress</option>
                  <option value="review">👀 Review</option>
                  <option value="done">✅ Done</option>
                </select>
              </div>

              {/* Priority Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: mutedColor }}>
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                  style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>

              {/* Assignee Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: mutedColor }}>
                  Assignee
                </label>
                <select
                  value={assigneeId || ''}
                  onChange={(e) => setAssigneeId(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                  style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags Section */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: mutedColor }}>
                  Tags
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
                      style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: textColor }}
                    >
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="text-[8px] hover:text-red-500">
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Press Enter to add tag"
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                />
              </div>

              {/* Dependencies Section */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: mutedColor }}>
                  Dependencies (Blocks)
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {dependsOn.map((depId) => {
                    const depTask = tasks.find(t => t.id === depId);
                    return (
                      <span
                        key={depId}
                        className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
                        style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }} // Red tint for blockers
                      >
                        {depTask ? depTask.title.substring(0, 15) + '...' : 'Unknown'}
                        <button onClick={() => setDependsOn(dependsOn.filter(d => d !== depId))} className="text-[8px] hover:text-red-500">
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !dependsOn.includes(e.target.value)) {
                      setDependsOn([...dependsOn, e.target.value]);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none cursor-pointer"
                  style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                >
                  <option value="">+ Add Dependency...</option>
                  {tasks.filter(t => t.id !== task?.id && !dependsOn.includes(t.id)).map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* advanced DATE / DURATION PICKER DIALOG (TickTick Style) */}
            {isDatePickerOpen && (
              <div
                ref={pickerRef}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-55 w-[340px] p-5 rounded-3xl shadow-2xl"
                style={{
                  background: isDark ? '#1a1a26' : '#fff',
                  border: `1px solid ${borderColor}`,
                  boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                }}
              >
                {/* Tabs */}
                <div className="flex border-b pb-2 mb-4" style={{ borderColor }}>
                  <button
                    onClick={() => setActiveDateTab('date')}
                    className={`flex-1 text-center text-xs font-bold pb-1.5 ${activeDateTab === 'date' ? 'border-b-2 border-purple-500 text-purple-500' : ''}`}
                    style={{ color: activeDateTab === 'date' ? '#8b5cf6' : mutedColor }}
                  >
                    Date
                  </button>
                  <button
                    onClick={() => setActiveDateTab('duration')}
                    className={`flex-1 text-center text-xs font-bold pb-1.5 ${activeDateTab === 'duration' ? 'border-b-2 border-purple-500 text-purple-500' : ''}`}
                    style={{ color: activeDateTab === 'duration' ? '#8b5cf6' : mutedColor }}
                  >
                    Duration
                  </button>
                </div>

                {activeDateTab === 'date' ? (
                  <div className="space-y-4">
                    {/* Month Nav */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: textColor }}>
                        {format(currentMonth, 'MMMM yyyy')}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-xs">
                          ◀
                        </button>
                        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-xs">
                          ▶
                        </button>
                      </div>
                    </div>

                    {/* Weekdays header */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold" style={{ color: mutedColor }}>
                      <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {emptyCells.map((_, idx) => (
                        <div key={`empty-${idx}`} />
                      ))}
                      {daysInMonth.map((day) => {
                        const isDue = selectedDate ? isSameDay(day, selectedDate) : false;
                        const isStart = startDate ? isSameDay(day, startDate) : false;
                        const isBetween = startDate && selectedDate && day > startDate && day < selectedDate;

                        return (
                          <button
                            key={day.toString()}
                            onClick={() => {
                              // If no start date, set start date. If start date, set due date.
                              if (!startDate || (startDate && selectedDate)) {
                                setStartDate(day);
                                setSelectedDate(null);
                              } else {
                                if (day < startDate) {
                                  setSelectedDate(startDate);
                                  setStartDate(day);
                                } else {
                                  setSelectedDate(day);
                                }
                              }
                            }}
                            className="h-7 w-full text-xs font-medium flex items-center justify-center transition-all relative"
                            style={{
                              background: isStart || isDue ? '#8b5cf6' : (isBetween ? 'rgba(139,92,246,0.15)' : 'transparent'),
                              color: isStart || isDue ? '#ffffff' : textColor,
                              fontWeight: isStart || isDue ? 'bold' : 'normal',
                              borderRadius: isStart && isDue ? '999px' : (isStart ? '999px 0 0 999px' : (isDue ? '0 999px 999px 0' : '0')),
                            }}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>

                    {/* Time Input */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor }}>
                      <span style={{ color: textColor }}>⏰ Time</span>
                      <input
                        type="time"
                        value={selectedTime === 'none' ? '' : selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value || 'none')}
                        className="px-2 py-1 rounded-lg text-xs"
                        style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                      />
                    </div>

                    {/* Reminder Trigger */}
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: textColor }}>🔔 Reminder</span>
                      <select
                        value={selectedReminder}
                        onChange={(e) => setSelectedReminder(e.target.value)}
                        className="px-2 py-1 rounded-lg text-xs"
                        style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                      >
                        <option value="none">None</option>
                        <option value="at_due">At due time</option>
                        <option value="5m">5 mins before</option>
                        <option value="15m">15 mins before</option>
                        <option value="30m">30 mins before</option>
                        <option value="1h">1 hour before</option>
                        <option value="1d">1 day before</option>
                      </select>
                    </div>

                    {/* Repeat trigger */}
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: textColor }}>🔁 Repeat</span>
                      <select
                        value={selectedRepeat}
                        onChange={(e) => setSelectedRepeat(e.target.value)}
                        className="px-2 py-1 rounded-lg text-xs"
                        style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                      >
                        <option value="none">None</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Duration input */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold block" style={{ color: textColor }}>
                        Specify Duration
                      </span>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          placeholder="Hours"
                          value={durationMinutes > 0 ? Math.floor(durationMinutes / 60) : ''}
                          onChange={(e) => {
                            const hrs = parseInt(e.target.value) || 0;
                            const mins = durationMinutes % 60;
                            setDurationMinutes(hrs * 60 + mins);
                          }}
                          className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                          style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                        />
                        <span className="text-xs" style={{ color: mutedColor }}>hr</span>
                        <input
                          type="number"
                          placeholder="Mins"
                          value={durationMinutes > 0 ? durationMinutes % 60 : ''}
                          onChange={(e) => {
                            const mins = parseInt(e.target.value) || 0;
                            const hrs = Math.floor(durationMinutes / 60);
                            setDurationMinutes(hrs * 60 + mins);
                          }}
                          className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                          style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                        />
                        <span className="text-xs" style={{ color: mutedColor }}>min</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer buttons of datepicker */}
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => {
                      setSelectedDate(null);
                      setStartDate(null);
                      setSelectedTime('none');
                      setSelectedReminder('none');
                      setSelectedRepeat('none');
                      setDurationMinutes(0);
                      setIsDatePickerOpen(false);
                    }}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: inputBg, color: textColor }}
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setIsDatePickerOpen(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
