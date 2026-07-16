'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { useState } from 'react';

const statusColors: Record<string, string> = { new_lead: '#8b5cf6', interested: '#06b6d4', follow_up: '#f59e0b', joined_webinar: '#10b981', converted: '#22c55e', not_interested: '#6b7280' };
const statusLabels: Record<string, string> = { new_lead: 'New Lead', interested: 'Interested', follow_up: 'Follow-up', joined_webinar: 'Webinar', converted: 'Converted', not_interested: 'Lost' };

export default function LeadsView() {
  const { theme, leads } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = leads.filter(l => {
    const matchFilter = filter === 'all' || l.status === filter;
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>Lead Management</h1>
          <p className="text-xs mt-1" style={{ color: mutedColor }}>{leads.length} total leads</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-primary text-xs">＋ Add Lead</motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="input-field text-sm" style={{ maxWidth: 250 }} />
        <div className="flex gap-1 flex-wrap">
          {['all', 'new_lead', 'interested', 'follow_up', 'joined_webinar', 'converted', 'not_interested'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={{
              background: filter === f ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: filter === f ? '#a855f7' : mutedColor,
            }}>
              {f === 'all' ? 'All' : statusLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden overflow-x-auto">
        <div className="grid grid-cols-[1fr,120px,140px,100px,100px,80px] gap-4 px-5 py-3 border-b text-xs font-semibold" style={{ color: mutedColor, borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
          <span>Lead / Contact</span><span>Status</span><span>Contact</span><span>Source</span><span>WhatsApp</span><span>Value</span>
        </div>
        {filtered.map((lead, i) => (
          <motion.div key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
            whileHover={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}
            className="grid grid-cols-[1fr,120px,140px,100px,100px,80px] gap-4 px-5 py-3 border-b items-center cursor-pointer"
            style={{ borderColor: isDark ? 'rgba(42,42,58,0.5)' : 'rgba(229,226,240,0.5)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: textColor }}>{lead.name}</p>
              {lead.email && <p className="text-[10px]" style={{ color: mutedColor }}>{lead.email}</p>}
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full font-medium text-center" style={{ background: `${statusColors[lead.status]}15`, color: statusColors[lead.status] }}>{statusLabels[lead.status]}</span>
            <span className="text-[11px]" style={{ color: mutedColor }}>{lead.phone || '—'}</span>
            <span className="text-[11px]" style={{ color: mutedColor }}>{lead.source || '—'}</span>
            <span className="text-[11px]" style={{ color: lead.whatsapp_status === 'Replied' ? '#10b981' : mutedColor }}>{lead.whatsapp_status || '—'}</span>
            <span className="text-xs font-semibold" style={{ color: '#10b981' }}>₹{lead.value.toLocaleString()}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
