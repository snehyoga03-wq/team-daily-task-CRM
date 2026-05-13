'use client';

import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function AIView() {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#e4e4e7' : '#1e1b2e';
  const mutedColor = isDark ? '#71717a' : '#6b6880';
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hello Sneha! 🧘‍♀️ I\'m your AI productivity assistant. I can help you with:\n\n• 📋 Breaking down tasks into subtasks\n• 📅 Planning your day efficiently\n• 🔔 Smart reminders and scheduling\n• 📊 Summarizing analytics\n• ⚖️ Balancing team workload\n\nHow can I help you today?' },
  ]);

  const suggestions = [
    '📋 Break down my tasks for today',
    '📅 Plan my day',
    '📊 Summarize this week\'s performance',
    '⚖️ Balance team workload',
    '🎯 Prioritize my CRM leads',
    '🧘 Suggest a focus schedule',
  ];

  const sendMessage = (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setTimeout(() => {
      let response = '';
      if (msg.toLowerCase().includes('task') || msg.toLowerCase().includes('break')) {
        response = '📋 Here\'s a smart breakdown for your top tasks today:\n\n1. **Follow up with webinar attendees** (Priority: Urgent)\n   - Export attendee list from Supabase → 15 min\n   - Draft personalized email template → 30 min\n   - Send via WhatsApp broadcast → 20 min\n\n2. **WhatsApp broadcast campaign** (Priority: High)\n   - Design 2 creative banners → 45 min\n   - Write copy for 3 message variants → 30 min\n   - Schedule broadcasts at optimal times → 15 min\n\n⏱️ Estimated total: 2.5 hours\n💡 Tip: Start with urgent follow-ups while engagement is fresh!';
      } else if (msg.toLowerCase().includes('plan') || msg.toLowerCase().includes('day')) {
        response = '📅 Here\'s your optimized daily plan:\n\n🌅 **Morning Block (9:00 - 12:00)**\n• 9:00 — CRM follow-ups (urgent)\n• 10:00 — Team standup (30 min)\n• 10:30 — WhatsApp campaign design\n• 11:30 — Webinar landing page review\n\n☀️ **Afternoon Block (1:00 - 5:00)**\n• 1:00 — Deep focus: Content creation (🧘 Pomodoro x2)\n• 3:00 — Sales review meeting\n• 4:00 — Support check-in\n• 4:30 — Plan tomorrow + wrap up\n\n💡 I\'ve optimized for your peak productivity hours!';
      } else if (msg.toLowerCase().includes('performance') || msg.toLowerCase().includes('summary')) {
        response = '📊 **Weekly Performance Summary**\n\n✅ Tasks: 82 completed (↑18% vs last week)\n🧘 Focus: 32.5 hours total (avg 5.4h/day)\n🎯 CRM: 15 new leads, 5 converted (33% rate)\n💰 Revenue: ₹1,95,000 (97.5% of target)\n📋 Attendance: 95% team attendance\n\n🏆 **Top Performers:**\n1. Sneha Sharma — 28 tasks, Level 12\n2. Ravi Kumar — 24 tasks, Level 11\n3. Arjun Mehta — 22 tasks, Level 10\n\n💡 Recommendation: Focus on CRM follow-ups to hit revenue target this month!';
      } else {
        response = '🤖 I understand! Let me analyze your workspace and get back to you with actionable insights.\n\n Based on current data:\n• You have 4 urgent tasks pending\n• 3 CRM leads need follow-up today\n• Team productivity is at 75%\n\nWould you like me to help with any of these specifically?';
      }
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    }, 800);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-4">
        <h1 className="text-xl font-bold gradient-text">🤖 AI Assistant</h1>
        <p className="text-xs mt-1" style={{ color: mutedColor }}>Your intelligent productivity companion</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] p-4 rounded-2xl" style={{
              background: msg.role === 'user' ? 'linear-gradient(135deg, #9333ea, #7e22ce)' : (isDark ? 'rgba(26,26,37,0.8)' : 'rgba(255,255,255,0.8)'),
              color: msg.role === 'user' ? 'white' : textColor,
              border: msg.role === 'ai' ? `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}` : 'none',
            }}>
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map((s, i) => (
            <motion.button key={i} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => sendMessage(s)}
              className="px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: isDark ? 'rgba(26,26,37,0.6)' : 'rgba(255,255,255,0.6)', border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`, color: textColor }}>
              {s}
            </motion.button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-3">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask AI anything about your workspace..." className="input-field flex-1" />
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => sendMessage()} className="btn-primary">Ask AI ✨</motion.button>
      </div>
    </div>
  );
}
