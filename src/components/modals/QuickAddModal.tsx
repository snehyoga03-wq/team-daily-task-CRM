'use client';

import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import * as dataService from '@/lib/dataService';

export default function QuickAddModal() {
  const { theme, quickAddOpen, setQuickAddOpen, addTask, addLead, addEvent } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [planType, setPlanType] = useState<'Planned' | 'Unplanned'>('Planned');
  const [type, setType] = useState<'task' | 'lead' | 'event'>('task');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !currentUser) return;
    setSaving(true);

    try {
      if (type === 'task') {
        const task = await dataService.createTask({
          title: title.trim(),
          status: 'todo',
          priority,
          creator_id: currentUser.id,
          tags: [planType],
          order_index: 0,
          due_date: new Date().toISOString().slice(0, 10),
        });
        addTask(task);
      } else if (type === 'lead') {
        const lead = await dataService.createLead({
          name: title.trim(),
          status: 'new_lead',
          source: 'Manual',
          value: 0,
        });
        addLead(lead);
      } else if (type === 'event') {
        const now = new Date();
        const endTime = new Date(now.getTime() + 60 * 60 * 1000);
        const event = await dataService.createEvent({
          title: title.trim(),
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          type: 'event',
          creator_id: currentUser.id,
          attendees: [],
        });
        addEvent(event);
      }

      setTitle('');
      setQuickAddOpen(false);
    } catch (err: any) {
      console.error('Failed to create:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
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
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: mutedColor }}>Priority:</span>
                  {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                    <button key={p} onClick={() => setPriority(p)} className={`badge badge-${p} cursor-pointer transition-all ${priority === p ? '' : 'opacity-50'}`}
                      style={{ boxShadow: priority === p ? `0 0 0 1px ${isDark ? '#12121a' : '#fff'}, 0 0 0 3px rgba(139,92,246,0.5)` : 'none' }}>
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: mutedColor }}>Plan Type:</span>
                  {(['Planned', 'Unplanned'] as const).map(pt => (
                    <button key={pt} onClick={() => setPlanType(pt)} className="px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      style={{
                        background: planType === pt ? (pt === 'Planned' ? 'rgba(139,92,246,0.2)' : 'rgba(245,158,11,0.2)') : isDark ? '#1a1a25' : '#f3f0ff',
                        color: planType === pt ? (pt === 'Planned' ? '#a855f7' : '#f59e0b') : mutedColor,
                        border: `1px solid ${planType === pt ? (pt === 'Planned' ? '#a855f7' : '#f59e0b') : 'transparent'}`,
                      }}>
                      {pt === 'Planned' ? '📅 Planned' : '⚡ Unplanned'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setQuickAddOpen(false)} className="px-4 py-2 rounded-xl text-sm" style={{ color: mutedColor }}>Cancel</button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={saving || !title.trim()} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : `Create ${type}`}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
