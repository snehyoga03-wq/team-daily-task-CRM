'use client';

import { useAppStore, CRMStage } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const stageConfig: Record<CRMStage, { label: string; color: string; icon: string }> = {
  new_lead: { label: 'New Lead', color: '#8b5cf6', icon: '🆕' },
  interested: { label: 'Interested', color: '#06b6d4', icon: '💡' },
  follow_up: { label: 'Follow-up', color: '#f59e0b', icon: '📞' },
  joined_webinar: { label: 'Joined Webinar', color: '#10b981', icon: '🎥' },
  converted: { label: 'Converted', color: '#22c55e', icon: '🎉' },
  not_interested: { label: 'Not Interested', color: '#6b7280', icon: '❌' },
};

export default function CRMView() {
  const { theme, leads, updateLead } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  const stages: CRMStage[] = ['new_lead', 'interested', 'follow_up', 'joined_webinar', 'converted', 'not_interested'];

  const totalValue = leads.reduce((sum, l) => sum + l.value, 0);
  const convertedValue = leads.filter(l => l.status === 'converted').reduce((sum, l) => sum + l.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: textColor }}>CRM Pipeline</h1>
          <p className="text-xs mt-1" style={{ color: mutedColor }}>{leads.length} leads · ₹{totalValue.toLocaleString()} pipeline</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-primary text-xs">＋ Add Lead</motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: leads.length, icon: '🎯', color: '#8b5cf6' },
          { label: 'Pipeline Value', value: `₹${(totalValue / 1000).toFixed(1)}k`, icon: '💰', color: '#06b6d4' },
          { label: 'Converted', value: leads.filter(l => l.status === 'converted').length, icon: '🎉', color: '#10b981' },
          { label: 'Conversion Rate', value: `${leads.length > 0 ? ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(0) : 0}%`, icon: '📈', color: '#f59e0b' },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ y: -2 }} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{s.icon}</span>
              <span className="text-[11px]" style={{ color: mutedColor }}>{s.label}</span>
            </div>
            <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => {
          const config = stageConfig[stage];
          const stageLeads = leads.filter(l => l.status === stage);
          const stageValue = stageLeads.reduce((sum, l) => sum + l.value, 0);

          return (
            <div
              key={stage}
              className="kanban-column flex-shrink-0"
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (draggedLead) { updateLead(draggedLead, { status: stage }); setDraggedLead(null); } }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span>{config.icon}</span>
                  <span className="text-sm font-semibold" style={{ color: textColor }}>{config.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${config.color}20`, color: config.color }}>{stageLeads.length}</span>
                </div>
              </div>
              <p className="text-[10px] mb-3" style={{ color: mutedColor }}>₹{stageValue.toLocaleString()}</p>

              <div className="space-y-3">
                <AnimatePresence>
                  {stageLeads.map(lead => (
                    <motion.div
                      key={lead.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      draggable
                      onDragStart={() => setDraggedLead(lead.id)}
                      className="pipeline-card"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium" style={{ color: textColor }}>{lead.name}</p>
                        <span className="text-xs font-semibold" style={{ color: config.color }}>₹{lead.value.toLocaleString()}</span>
                      </div>
                      {lead.email && <p className="text-[11px] mb-1" style={{ color: mutedColor }}>📧 {lead.email}</p>}
                      {lead.phone && <p className="text-[11px] mb-1" style={{ color: mutedColor }}>📱 {lead.phone}</p>}
                      <div className="flex items-center justify-between mt-2">
                        {lead.source && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: isDark ? '#2a2a3a' : '#e5e2f0', color: mutedColor }}>{lead.source}</span>}
                        {lead.whatsappStatus && (
                          <span className="text-[10px] flex items-center gap-1" style={{ color: lead.whatsappStatus === 'Replied' ? '#10b981' : mutedColor }}>
                            💬 {lead.whatsappStatus}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
