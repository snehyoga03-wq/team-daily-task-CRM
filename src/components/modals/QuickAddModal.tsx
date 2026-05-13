'use client';

import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function QuickAddModal() {
  const { theme, quickAddOpen, setQuickAddOpen, addTask } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [type, setType] = useState<'task' | 'lead' | 'event'>('task');

  const handleSubmit = () => {
    if (!title.trim()) return;
    if (type === 'task') {
      addTask({
        id: `t${Date.now()}`,
        title,
        status: 'todo',
        priority,
        tags: [],
        subtasks: [],
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setTitle('');
    setQuickAddOpen(false);
  };

  return (
    <AnimatePresence>
      {quickAddOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setQuickAddOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg p-6 rounded-2xl"
            style={{ background: isDark ? '#12121a' : '#fff', border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: textColor }}>✨ Quick Add</h2>

            {/* Type Selector */}
            <div className="flex gap-2 mb-4">
              {(['task', 'lead', 'event'] as const).map(t => (
                <button key={t} onClick={() => setType(t)} className="px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all" style={{
                  background: type === t ? 'rgba(139,92,246,0.15)' : isDark ? '#1a1a25' : '#f3f0ff',
                  color: type === t ? '#a855f7' : mutedColor,
                  border: `1px solid ${type === t ? 'rgba(139,92,246,0.3)' : 'transparent'}`,
                }}>
                  {t === 'task' ? '✅' : t === 'lead' ? '🎯' : '📅'} {t}
                </button>
              ))}
            </div>

            <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={type === 'task' ? 'What needs to be done?' : type === 'lead' ? 'Lead name...' : 'Event title...'}
              className="input-field mb-4 text-base" autoFocus />

            {type === 'task' && (
              <div className="flex gap-2 mb-4">
                {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                  <button key={p} onClick={() => setPriority(p)} className={`badge badge-${p} cursor-pointer transition-all ${priority === p ? 'ring-2 ring-offset-1' : 'opacity-50'}`}
                    style={{ ringColor: 'rgba(139,92,246,0.5)', ringOffsetColor: isDark ? '#12121a' : '#fff' }}>
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setQuickAddOpen(false)} className="px-4 py-2 rounded-xl text-sm" style={{ color: mutedColor }}>Cancel</button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSubmit} className="btn-primary">Create {type}</motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
