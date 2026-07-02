'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, View } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import CuteRobotMascot, { RobotEmotion } from './CuteRobotMascot';

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  emotion?: RobotEmotion;
  actions?: { label: string; view?: View; action?: () => void }[];
}

export default function FloatingAIAssistant() {
  const { theme, tasks, leads, teamMembers, activeView, setActiveView, sidebarCollapsed } = useAppStore();
  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat');
  const [position, setPosition] = useState<'right' | 'left'>('right');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [bubbleReminder, setBubbleReminder] = useState<string | null>(null);
  const [isBubbleDismissed, setIsBubbleDismissed] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load saved position
  useEffect(() => {
    const saved = localStorage.getItem('yogi_ai_pos');
    if (saved === 'left' || saved === 'right') setPosition(saved);
  }, []);

  const togglePosition = () => {
    const nextPos = position === 'right' ? 'left' : 'right';
    setPosition(nextPos);
    localStorage.setItem('yogi_ai_pos', nextPos);
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Generate dynamic smart insights from real state
  const pendingTasks = tasks.filter((t) => t.status !== 'done');
  const urgentTasks = pendingTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high');
  const followUpLeads = leads.filter((l) => l.status === 'follow_up' || l.status === 'new_lead');
  const onlineMembers = teamMembers.filter((m) => m.is_online);

  // Determine dynamic robot emotion for badge
  const getBadgeEmotion = (): RobotEmotion => {
    if (isTyping) return 'happy';
    if (urgentTasks.length > 2) return 'angry';
    if (urgentTasks.length > 0) return 'surprised';
    if (pendingTasks.length === 0 && tasks.length > 0) return 'sleeping';
    if (followUpLeads.length > 3) return 'sad';
    return 'happy';
  };

  const insights = [
    ...(urgentTasks.length > 0
      ? [
          {
            id: 'urgent_tasks',
            icon: '⚡',
            title: `${urgentTasks.length} Urgent / High Priority Tasks`,
            description: `You have ${urgentTasks.length} high-priority tasks requiring your attention today.`,
            actionLabel: 'View Tasks →',
            view: 'tasks' as View,
            badge: 'Urgent',
            badgeColor: '#f43f5e',
          },
        ]
      : []),
    ...(pendingTasks.length > 0
      ? [
          {
            id: 'pending_tasks',
            icon: '📋',
            title: `${pendingTasks.length} Pending Workspace Tasks`,
            description: `Let's maintain the productivity flow! You have ${pendingTasks.length} tasks in progress or todo.`,
            actionLabel: 'Open Kanban →',
            view: 'tasks' as View,
            badge: 'Tasks',
            badgeColor: '#a855f7',
          },
        ]
      : []),
    ...(followUpLeads.length > 0
      ? [
          {
            id: 'leads_followup',
            icon: '🎯',
            title: `${followUpLeads.length} CRM Leads Need Action`,
            description: `There are leads waiting in 'New Lead' or 'Follow Up' stage. Send a WhatsApp broadcast!`,
            actionLabel: 'Go to Leads →',
            view: 'leads' as View,
            badge: 'CRM',
            badgeColor: '#06b6d4',
          },
        ]
      : []),
    {
      id: 'team_status',
      icon: '👥',
      title: `${onlineMembers.length || 1} Team Members Active`,
      description: `Your team is synchronized! Check attendance or start a team discussion in Chat.`,
      actionLabel: 'Team Chat →',
      view: 'chat' as View,
      badge: 'Team',
      badgeColor: '#10b981',
    },
    {
      id: 'mindful_break',
      icon: '🧘‍♀️',
      title: 'Mindful Productivity Tip',
      description: 'Remember to take a 5-minute breathing break every hour to keep your mind clear and focused!',
      actionLabel: 'Start Focus Mode →',
      view: 'focus' as View,
      badge: 'Wellness',
      badgeColor: '#f59e0b',
    },
  ];

  // Auto-cycle cute popup bubbles above the badge
  useEffect(() => {
    if (isOpen || isBubbleDismissed) {
      setBubbleReminder(null);
      return;
    }

    const remindersList = [
      urgentTasks.length > 0
        ? `⚡ Hey ${currentUser?.full_name?.split(' ')[0] || 'Sneha'}! You have ${urgentTasks.length} urgent task${urgentTasks.length > 1 ? 's' : ''} waiting! Let's conquer them! 💪`
        : null,
      pendingTasks.length > 0
        ? `📋 You have ${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''} on your board today. Need any help planning? ✨`
        : null,
      followUpLeads.length > 0
        ? `🎯 Tip: ${followUpLeads.length} CRM lead${followUpLeads.length > 1 ? 's are' : ' is'} ready for follow-up today!`
        : null,
      `🧘‍♀️ Take a deep breath! I'm here to guide you through any CRM tasks or questions! ✨`,
    ].filter(Boolean) as string[];

    if (remindersList.length === 0) return;

    let index = 0;
    const interval = setInterval(() => {
      setBubbleReminder(remindersList[index]);
      index = (index + 1) % remindersList.length;
    }, 10000);

    // Initial show after 2 seconds
    const timer = setTimeout(() => {
      setBubbleReminder(remindersList[0]);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isOpen, isBubbleDismissed, urgentTasks.length, pendingTasks.length, followUpLeads.length, currentUser]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome_1',
          role: 'ai',
          emotion: 'love',
          content: `Namaste ${currentUser?.full_name?.split(' ')[0] || 'there'}! 🤖 ✨\n\nI am **Yogi AI**, your cute CRM companion & productivity guru!\n\nI track all your tasks, team attendance, lead pipelines, and answer any questions you have about using this workspace. How can I guide you today?`,
          actions: [
            { label: '📋 What tasks are pending?', action: () => handleSend('What tasks are pending today?') },
            { label: '❓ How do I manage CRM Leads?', action: () => handleSend('How do I manage CRM Leads and stages?') },
            { label: '👥 Check Team Attendance', action: () => handleSend('How do I check team attendance and online status?') },
          ],
        },
      ]);
    }
  }, [currentUser]);

  // Intelligent CRM guide & task answering engine
  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    const userMsg: Message = { id: `user_${Date.now()}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const lower = text.toLowerCase();
      let aiResponse: string;
      let actions: { label: string; view?: View }[] | undefined;
      let emotion: RobotEmotion = 'happy';

      // 1. Task analysis queries
      if (lower.includes('task') || lower.includes('pending') || lower.includes('due') || lower.includes('todo') || lower.includes('work')) {
        if (pendingTasks.length === 0) {
          emotion = 'sleeping';
          aiResponse = `🎉 **All caught up!** You have 0 pending tasks right now. Your board is sparkling clean! ✨\n\nTake a moment to relax or add new tasks using the **+ Quick Add** button or pressing **Ctrl+N**.`;
          actions = [{ label: 'View Tasks Board', view: 'tasks' }];
        } else {
          emotion = urgentTasks.length > 0 ? 'surprised' : 'happy';
          const topTasks = pendingTasks.slice(0, 4).map((t, i) => `${i + 1}. **${t.title}** (${t.priority.toUpperCase()})`).join('\n');
          aiResponse = `📋 **Your Current Task Status**\n\nYou have **${pendingTasks.length} pending tasks** (${urgentTasks.length} urgent/high priority).\n\nHere are your top action items:\n${topTasks}\n\n💡 *Tip: Click below to open your interactive Kanban board and drag tasks across columns!*`;
          actions = [
            { label: 'Open Tasks Kanban →', view: 'tasks' },
            { label: 'Plan with Focus Mode →', view: 'focus' },
          ];
        }
      }
      // 2. CRM Leads & Stages queries
      else if (lower.includes('lead') || lower.includes('crm') || lower.includes('stage') || lower.includes('client') || lower.includes('customer') || lower.includes('pipeline')) {
        emotion = 'happy';
        aiResponse = `🎯 **CRM & Lead Pipeline Guide**\n\nIn SnehYoga CRM, your leads flow through **6 specialized stages**:\n1️⃣ **New Lead**: Just entered the system\n2️⃣ **Interested**: Initial contact made\n3️⃣ **Follow Up**: Needs nurturing / WhatsApp contact\n4️⃣ **Joined Webinar**: Attended yoga/intro session\n5️⃣ **Converted**: Active client! 🎉\n6️⃣ **Not Interested**: Archived\n\nCurrently, you have **${leads.length} total leads** (${followUpLeads.length} requiring follow-up).\n\n💡 *How to use*: Navigate to **CRM / Leads**, drag cards between columns, or click on any card to send instant WhatsApp messages!`;
        actions = [
          { label: 'Go to CRM Kanban →', view: 'crm' },
          { label: 'View Leads Table →', view: 'leads' },
        ];
      }
      // 3. Team & Attendance queries
      else if (lower.includes('team') || lower.includes('attend') || lower.includes('online') || lower.includes('member') || lower.includes('check')) {
        emotion = 'happy';
        aiResponse = `👥 **Team & Attendance Guide**\n\nYour workspace tracks real-time collaboration and attendance effortlessly!\n\n• **Active Team**: You have **${teamMembers.length} team members** (${onlineMembers.length} currently online 🟢).\n• **Attendance System**: Team members can Check-in and Check-out daily. Admins can view half-days, breaks, and leave history in the **Attendance** panel.\n• **Gamification**: Completing tasks awards **XP Points** and increases user levels! 🏆`;
        actions = [
          { label: 'View Team Roster →', view: 'team' },
          { label: 'Check Attendance Logs →', view: 'attendance' },
          { label: 'Open Chat Channels →', view: 'chat' },
        ];
      }
      // 4. Focus mode & Pomodoro
      else if (lower.includes('focus') || lower.includes('pomodoro') || lower.includes('timer') || lower.includes('break') || lower.includes('relax') || lower.includes('yoga') || lower.includes('meditat')) {
        emotion = 'sleeping';
        aiResponse = `🧘‍♀️ **Mindful Focus Mode**\n\nProductivity is best achieved with balance! Our built-in **Focus Mode** combines classical Pomodoro techniques with yoga mindfulness:\n\n• **25 / 5 Rule**: Work intensely for 25 minutes, then take a 5-minute breathing break.\n• **Ambience & Sound**: Enjoy calming background ambient sounds while working.\n• **Task Integration**: Link any pending task directly to your focus timer to track actual hours!`;
        actions = [{ label: 'Launch Focus Timer 🧘 →', view: 'focus' }];
      }
      // 5. Shortcuts & Navigation
      else if (lower.includes('shortcut') || lower.includes('key') || lower.includes('how to') || lower.includes('navigat') || lower.includes('quick') || lower.includes('help')) {
        emotion = 'surprised';
        aiResponse = `⚡ **Pro Keyboard Shortcuts & Navigation**\n\nSpeed up your daily workflow with these instant shortcuts:\n\n• ⌨️ **Ctrl + K** (or Cmd + K): Open the instant Command Palette & Global Search\n• ⌨️ **Ctrl + N** (or Cmd + N): Quick Add Task, Lead, or Event modal\n• 🖱️ **Drag & Drop**: Easily rearrange tasks on Kanban or Gantt charts\n• 📱 **Mobile Ready**: Switch between views instantly using the bottom navigation bar!`;
        actions = [
          { label: 'Go to Dashboard →', view: 'dashboard' },
          { label: 'Explore Analytics →', view: 'analytics' },
        ];
      }
      // 6. Motivation / Cute praise
      else if (lower.includes('boost') || lower.includes('motivat') || lower.includes('cute') || lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || lower.includes('thank')) {
        emotion = 'love';
        aiResponse = `🌟 **You are doing wonderful, ${currentUser?.full_name?.split(' ')[0] || 'Sneha'}!** 🤖 ✨\n\nRemember: *"Quiet the mind, and the soul will speak."* Every task you complete brings your team closer to harmony and success.\n\nI'm always right here in the corner keeping an eye on your tasks and reminders whenever you need a boost or guidance! 💖`;
        actions = [
          { label: 'Check Smart Reminders 🔔', action: () => setActiveTab('insights') },
          { label: 'View Tasks Board →', view: 'tasks' },
        ];
      }
      // 7. Fallback General CRM Guidance
      else {
        emotion = 'happy';
        aiResponse = `🤖 **Yogi AI at your service!**\n\nI understand you're asking about *"**${text}**"*. As your CRM AI assistant, I can guide you through:\n\n• 📋 Managing & prioritizing tasks (Kanban, Gantt, Calendar)\n• 🎯 Tracking client leads & WhatsApp broadcasts\n• 👥 Team attendance, XP streaks, and chat collaboration\n• 📈 Analyzing team performance metrics\n\nWould you like me to take you to any specific section?`;
        actions = [
          { label: 'Open Tasks →', view: 'tasks' },
          { label: 'Open CRM Leads →', view: 'crm' },
          { label: 'Open Full AI Suite →', view: 'ai' },
        ];
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: 'ai',
          emotion: emotion,
          content: aiResponse,
          actions: actions?.map((a) => ({
            label: a.label,
            view: a.view,
            action: a.view ? () => { setActiveView(a.view!); setIsOpen(false); } : (a as any).action,
          })),
        },
      ]);
      setIsTyping(false);
    }, 700);
  };

  const quickPrompts = [
    '📋 What tasks are pending?',
    '❓ How do I manage CRM Leads?',
    '👥 Check Team Attendance',
    '🧘 How does Focus Mode work?',
    '⚡ Show keyboard shortcuts',
    '✨ Motivate me!',
  ];

  return (
    <>
      {/* ─── 1. Floating Badge Button & Bubble ───────────────────────── */}
      <div className={`fixed bottom-20 md:bottom-6 ${position === 'left' ? (sidebarCollapsed ? 'left-4 md:left-24 items-start' : 'left-4 md:left-[280px] items-start') : 'right-6 items-end'} z-50 flex flex-col gap-2 transition-all duration-300`}>
        {/* Cute Reminder Popup Bubble */}
        <AnimatePresence>
          {!isOpen && bubbleReminder && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
              className="max-w-[280px] p-3 rounded-2xl shadow-2xl relative cursor-pointer group mb-1 border"
              style={{
                background: isDark ? 'rgba(26, 26, 37, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                borderColor: isDark ? '#a855f7' : '#9333ea',
                boxShadow: '0 10px 30px -5px rgba(147, 51, 234, 0.3)',
              }}
              onClick={() => setIsOpen(true)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBubbleDismissed(true);
                  setBubbleReminder(null);
                }}
                className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-gray-500/80 hover:bg-rose-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                title="Dismiss reminder"
              >
                ✕
              </button>
              <p
                className="text-xs font-sans leading-relaxed"
                style={{ color: isDark ? '#e4e4e7' : '#1e1b2e' }}
              >
                {bubbleReminder}
              </p>
              {/* Bubble Triangle pointer pointing down to badge */}
              <div
                className={`absolute -bottom-2 ${position === 'left' ? 'left-5' : 'right-5'} w-3 h-3 rotate-45 border-b border-r`}
                style={{
                  background: isDark ? 'rgba(26, 26, 37, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: isDark ? '#a855f7' : '#9333ea',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mascot Circular Badge */}
        <motion.button
          whileHover={{ scale: 1.1, rotate: 6 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setIsBubbleDismissed(false);
          }}
          className="w-14 h-14 rounded-full flex items-center justify-center relative cursor-pointer text-2xl shadow-2xl group transition-all"
          style={{
            background: 'linear-gradient(135deg, #9333ea, #06b6d4)',
            boxShadow: isOpen
              ? '0 0 0 4px rgba(147, 51, 234, 0.4), 0 10px 30px rgba(0,0,0,0.5)'
              : '0 0 20px rgba(147, 51, 234, 0.5), 0 8px 25px rgba(0,0,0,0.4)',
          }}
          title="Yogi AI Assistant • Ask anything!"
        >
          {/* Animated Glow Aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 opacity-75 blur-md group-hover:opacity-100 transition-opacity -z-10 animate-pulse" />

          {/* Icon */}
          {isOpen ? (
            <span className="transform group-hover:scale-110 transition-transform text-2xl font-bold text-white">✕</span>
          ) : (
            <CuteRobotMascot emotion={getBadgeEmotion()} size="md" isSpeaking={isTyping} className="transform group-hover:scale-110 transition-transform" />
          )}

          {/* Badge indicator count */}
          {!isOpen && (urgentTasks.length > 0 || pendingTasks.length > 0) && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white text-[11px] font-extrabold flex items-center justify-center border-2 border-white dark:border-gray-900 shadow animate-bounce">
              {urgentTasks.length || pendingTasks.length}
            </span>
          )}
        </motion.button>
      </div>

      {/* ─── 2. Full AI Assistant & CRM Guide Window ─────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9, originX: position === 'left' ? 0 : 1, originY: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9, transition: { duration: 0.2 } }}
            className={`fixed bottom-36 md:bottom-24 ${position === 'left' ? (sidebarCollapsed ? 'left-4 md:left-24' : 'left-4 md:left-[280px]') : 'right-4 md:right-6'} z-50 w-[92vw] sm:w-[380px] md:w-[420px] h-[520px] max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border transition-all duration-300`}
            style={{
              background: isDark ? 'rgba(18, 18, 26, 0.92)' : 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(25px)',
              borderColor: isDark ? 'rgba(168, 85, 247, 0.4)' : 'rgba(147, 51, 234, 0.3)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(147, 51, 234, 0.2)',
            }}
          >
            {/* Window Header */}
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(6, 182, 212, 0.15))',
                borderColor: isDark ? '#2a2a3a' : '#e5e2f0',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex-shrink-0">
                  <CuteRobotMascot emotion={isTyping ? 'happy' : 'love'} size="sm" isSpeaking={isTyping} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm gradient-text">Yogi AI Guide</h3>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-green-500/20 text-green-500 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                      Online
                    </span>
                  </div>
                  <p className="text-[10px]" style={{ color: isDark ? '#a1a1aa' : '#6b6880' }}>
                    CRM Companion & Task Guru
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={togglePosition}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:bg-purple-500/10 text-cyan-500 flex items-center gap-1 border border-cyan-500/20"
                  title={`Move mascot to bottom-${position === 'right' ? 'left' : 'right'}`}
                >
                  {position === 'right' ? '↙ Move Left' : '↘ Move Right'}
                </button>
                <button
                  onClick={() => {
                    setActiveView('ai');
                    setIsOpen(false);
                  }}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium transition-colors hover:bg-purple-500/10 text-purple-500"
                  title="Open Full Screen AI Suite"
                >
                  Full Suite ↗
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors hover:bg-gray-500/20"
                  style={{ color: isDark ? '#a1a1aa' : '#6b6880' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Window Tabs */}
            <div
              className="flex border-b px-2 pt-2 gap-1 text-xs font-semibold"
              style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}
            >
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 rounded-t-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'chat'
                    ? 'border-b-2 border-purple-500 text-purple-500 bg-purple-500/5'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>💬 Ask AI Guide</span>
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`flex-1 py-2 rounded-t-xl transition-all flex items-center justify-center gap-1.5 relative ${
                  activeTab === 'insights'
                    ? 'border-b-2 border-purple-500 text-purple-500 bg-purple-500/5'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>🔔 Cute Reminders</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500 text-white font-bold">
                  {insights.length}
                </span>
              </button>
            </div>

            {/* Tab 1 Content: Chat & CRM Guide */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Message list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-start gap-2 max-w-[88%]">
                        {msg.role === 'ai' && (
                          <CuteRobotMascot emotion={msg.emotion || 'happy'} size="xs" className="flex-shrink-0 mt-0.5" />
                        )}
                        <div
                          className="p-3 rounded-2xl text-xs font-sans leading-relaxed shadow-sm"
                          style={{
                            background:
                              msg.role === 'user'
                                ? 'linear-gradient(135deg, #9333ea, #7e22ce)'
                                : isDark
                                ? 'rgba(26, 26, 37, 0.9)'
                                : 'rgba(243, 240, 255, 0.9)',
                            color: msg.role === 'user' ? '#ffffff' : isDark ? '#e4e4e7' : '#1e1b2e',
                            border: msg.role === 'ai' ? `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}` : 'none',
                            borderTopLeftRadius: msg.role === 'ai' ? '4px' : '16px',
                            borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                          }}
                        >
                          <div
                            className="whitespace-pre-wrap font-sans"
                            dangerouslySetInnerHTML={{
                              __html: msg.content
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>'),
                            }}
                          />

                          {/* Interactive Action Buttons */}
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="mt-3 pt-2 border-t flex flex-wrap gap-1.5 border-purple-500/20">
                              {msg.actions.map((act, i) => (
                                <button
                                  key={i}
                                  onClick={act.action}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all bg-purple-500/15 hover:bg-purple-500/30 text-purple-600 dark:text-purple-300 flex items-center gap-1 border border-purple-500/20 shadow-xs"
                                >
                                  <span>{act.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-purple-500 font-medium pl-8">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span>Yogi AI is thinking...</span>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick Prompts Carousel */}
                <div className="px-3 py-1.5 overflow-x-auto flex gap-1.5 border-t no-scrollbar" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
                  {quickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(prompt)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-transform hover:scale-105 flex-shrink-0"
                      style={{
                        background: isDark ? 'rgba(26,26,37,0.8)' : 'rgba(243,240,255,0.8)',
                        border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`,
                        color: isDark ? '#d4d4d8' : '#4c1d95',
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Input Area */}
                <div className="p-3 border-t bg-black/10 dark:bg-white/5 flex items-center gap-2" style={{ borderColor: isDark ? '#2a2a3a' : '#e5e2f0' }}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask AI anything about tasks or CRM..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs outline-none transition-all"
                    style={{
                      background: isDark ? 'rgba(26,26,37,0.8)' : 'rgba(255,255,255,0.9)',
                      border: `1px solid ${isDark ? '#2a2a3a' : '#e5e2f0'}`,
                      color: isDark ? '#e4e4e7' : '#1e1b2e',
                    }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm text-white shadow-md transition-opacity disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #9333ea, #06b6d4)' }}
                  >
                    ✨
                  </motion.button>
                </div>
              </div>
            )}

            {/* Tab 2 Content: Smart Reminders & Insights */}
            {activeTab === 'insights' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-center gap-2">
                  <CuteRobotMascot emotion="surprised" size="xs" className="flex-shrink-0" />
                  <p className="font-medium text-purple-600 dark:text-purple-300">
                    Here are real-time automated reminders calculated from your live CRM data!
                  </p>
                </div>

                {insights.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-3.5 rounded-2xl border transition-all shadow-sm flex flex-col gap-2"
                    style={{
                      background: isDark ? 'rgba(26,26,37,0.7)' : 'rgba(255,255,255,0.8)',
                      borderColor: isDark ? '#2a2a3a' : '#e5e2f0',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <h4 className="font-bold text-xs" style={{ color: isDark ? '#e4e4e7' : '#1e1b2e' }}>
                          {item.title}
                        </h4>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: `${item.badgeColor}20`, color: item.badgeColor }}
                      >
                        {item.badge}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed" style={{ color: isDark ? '#a1a1aa' : '#6b6880' }}>
                      {item.description}
                    </p>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          setActiveView(item.view);
                          setIsOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow transition-transform hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)' }}
                      >
                        {item.actionLabel}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
