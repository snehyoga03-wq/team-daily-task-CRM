'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { mockTasks, mockLeads, mockEvents, mockTeamMembers, mockChannels, mockMessages, mockNotifications } from '@/lib/mockData';
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
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const {
    theme, activeView, sidebarCollapsed, rightPanelOpen,
    setTasks, setLeads, setEvents, setTeamMembers, setChannels, setMessages, setNotifications,
  } = useAppStore();

  const isDark = theme === 'dark';

  // Load mock data on mount
  useEffect(() => {
    // Force light theme as requested
    useAppStore.setState({ theme: 'light' });
    
    setTasks(mockTasks);
    setLeads(mockLeads);
    setEvents(mockEvents);
    setTeamMembers(mockTeamMembers);
    setChannels(mockChannels);
    setMessages(mockMessages);
    setNotifications(mockNotifications);
  }, [setTasks, setLeads, setEvents, setTeamMembers, setChannels, setMessages, setNotifications]);

  // Keyboard shortcut for quick add
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
      default: return <DashboardView />;
    }
  };

  return (
    <div className={isDark ? 'dark' : 'light'} style={{
      background: isDark ? '#0a0a0f' : '#ffffff',
      color: isDark ? '#e4e4e7' : '#1e1b2e',
      minHeight: '100vh',
    }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Area */}
      <div style={{ marginLeft: sidebarCollapsed ? 72 : 260, transition: 'margin-left 0.3s ease' }}>
        <Header />

        <div className="flex">
          {/* Main Content */}
          <main className="flex-1 p-6 overflow-y-auto" style={{ minHeight: 'calc(100vh - 57px)' }}>
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

          {/* Right Panel */}
          {activeView !== 'chat' && activeView !== 'focus' && activeView !== 'ai' && (
            <RightPanel />
          )}
        </div>
      </div>

      {/* Modals */}
      <QuickAddModal />
    </div>
  );
}
