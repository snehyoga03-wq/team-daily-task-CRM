'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import * as dataService from '@/lib/dataService';
import LoginScreen from '@/components/auth/LoginScreen';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import RightPanel from '@/components/layout/RightPanel';
import QuickAddModal from '@/components/modals/QuickAddModal';
import DashboardView from '@/components/views/DashboardView';
import TasksView from '@/components/views/TasksView';
import CRMView from '@/components/views/CRMView';
import CalendarView from '@/components/views/CalendarView';
import FocusView from '@/components/views/FocusView';
import ChatView from '@/components/views/ChatView';
import AnalyticsView from '@/components/views/AnalyticsView';
import TeamView from '@/components/views/TeamView';
import AttendanceView from '@/components/views/AttendanceView';
import NotificationsView from '@/components/views/NotificationsView';
import SettingsView from '@/components/views/SettingsView';
import AIView from '@/components/views/AIView';
import LeadsView from '@/components/views/LeadsView';
import AdminView from '@/components/views/AdminView';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const {
    theme, activeView, sidebarCollapsed, dataLoaded,
    setTasks, setLeads, setEvents, setTeamMembers, setTeams, setChannels, setNotifications,
    setDataLoaded,
  } = useAppStore();

  const { currentUser } = useAuthStore();
  const isDark = theme === 'dark';
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load real data from Supabase when user is logged in
  useEffect(() => {
    if (!currentUser) return;

    async function loadData() {
      try {
        const [tasks, leads, events, members, channels, teamsData] = await Promise.allSettled([
          dataService.fetchTasks(),
          dataService.fetchLeads(),
          dataService.fetchEvents(),
          dataService.fetchTeamMembers(),
          dataService.fetchChannels(),
          dataService.fetchTeams(),
        ]);

        if (tasks.status === 'fulfilled') setTasks(tasks.value);
        if (leads.status === 'fulfilled') setLeads(leads.value);
        if (events.status === 'fulfilled') setEvents(events.value);
        if (members.status === 'fulfilled') setTeamMembers(members.value);
        if (channels.status === 'fulfilled') setChannels(channels.value as any);
        if (teamsData.status === 'fulfilled') setTeams(teamsData.value);

        // Load notifications for current user
        try {
          if (currentUser) {
            const notifications = await dataService.fetchNotifications(currentUser.id);
            setNotifications(notifications);
          }
        } catch { /* notifications table might be empty */ }

        setDataLoaded(true);
      } catch (err) {
        console.error('Failed to load data from Supabase:', err);
        setDataLoaded(true); // Still mark as loaded so UI isn't stuck
      }
    }

    loadData();

    // Subscribe to realtime updates
    const tasksSub = dataService.subscribeToTasks(() => {
      dataService.fetchTasks().then(setTasks).catch(console.error);
    });
    const leadsSub = dataService.subscribeToLeads(() => {
      dataService.fetchLeads().then(setLeads).catch(console.error);
    });

    return () => {
      tasksSub.unsubscribe();
      leadsSub.unsubscribe();
    };
  }, [currentUser, setTasks, setLeads, setEvents, setTeamMembers, setTeams, setChannels, setNotifications, setDataLoaded]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useAppStore.getState().setSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        useAppStore.getState().setQuickAddOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show login screen if not logged in
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Show loading spinner while fetching data
  if (!dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: '#6b6880' }}>Loading your workspace...</p>
        </motion.div>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />;
      case 'tasks': return <TasksView />;
      case 'crm': return <CRMView />;
      case 'leads': return <LeadsView />;
      case 'calendar': return <CalendarView />;
      case 'focus': return <FocusView />;
      case 'chat': return <ChatView />;
      case 'analytics': return <AnalyticsView />;
      case 'team': return <TeamView />;
      case 'attendance': return <AttendanceView />;
      case 'notifications': return <NotificationsView />;
      case 'settings': return <SettingsView />;
      case 'ai': return <AIView />;
      case 'admin': return <AdminView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className={isDark ? 'dark' : 'light'} style={{
      background: isDark ? '#0a0a0f' : '#ffffff',
      color: isDark ? '#e4e4e7' : '#1e1b2e',
      minHeight: '100vh',
    }}>
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Area */}
      <div className="pb-20 md:pb-0 transition-all duration-300" style={{
        marginLeft: isMobile ? 0 : (sidebarCollapsed ? 72 : 260),
      }}>
        <Header />

        <div className="flex flex-col md:flex-row">
          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto" style={{ minHeight: 'calc(100vh - 120px)' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Right Panel - hidden on mobile */}
          {activeView !== 'chat' && activeView !== 'focus' && activeView !== 'ai' && (
            <div className="hidden xl:block">
              <RightPanel />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pt-2 border-t" style={{
        background: isDark ? 'rgba(18,18,26,0.95)' : 'rgba(255,255,255,0.95)',
        borderColor: isDark ? '#2a2a3a' : '#e5e2f0',
        backdropFilter: 'blur(10px)',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}>
        <div className="flex justify-around items-center">
          {[
            { id: 'dashboard', icon: '📊', label: 'Home' },
            { id: 'tasks', icon: '✅', label: 'Tasks' },
            { id: 'chat', icon: '💬', label: 'Chat' },
            { id: 'leads', icon: '🎯', label: 'Leads' },
            { id: 'settings', icon: '⚙️', label: 'More' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => useAppStore.getState().setActiveView(tab.id as any)}
              className="flex flex-col items-center p-2 rounded-xl"
            >
              <span className="text-xl" style={{ filter: activeView === tab.id ? 'none' : 'grayscale(1) opacity(0.5)' }}>
                {tab.icon}
              </span>
              <span className="text-[10px] mt-1 font-medium" style={{
                color: activeView === tab.id ? '#8b5cf6' : (isDark ? '#71717a' : '#6b6880')
              }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <QuickAddModal />
    </div>
  );
}
