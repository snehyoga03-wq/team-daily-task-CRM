import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DbTask, DbSubtask, DbLead, DbCalendarEvent, DbUser, DbChannel, DbMessage, DbNotification, DbAttendance, DbTeam } from './supabase';

// ─── Types ───────────────────────────────────────────────────────────
export type View = 
  | 'dashboard' 
  | 'tasks' 
  | 'calendar' 
  | 'crm' 
  | 'leads' 
  | 'team' 
  | 'attendance' 
  | 'focus' 
  | 'analytics' 
  | 'chat' 
  | 'notifications' 
  | 'settings'
  | 'ai'
  | 'admin';

export type TaskView = 'list' | 'kanban' | 'calendar' | 'timeline' | 'gantt';
export type Theme = 'dark' | 'light';
export type CRMStage = 'new_lead' | 'interested' | 'follow_up' | 'joined_webinar' | 'converted' | 'not_interested';

// Re-export DB types with friendly aliases used by components
export type Task = DbTask & { subtasks?: DbSubtask[]; assignee?: DbUser | null };
export type CRMLead = DbLead;
export type CalendarEvent = DbCalendarEvent;
export type TeamMember = DbUser;
export type Channel = DbChannel & { unreadCount?: number; lastMessage?: string; lastMessageAt?: string };
export type Message = DbMessage & { userName?: string; userAvatar?: string };
export type Notification = DbNotification;

// Legacy interfaces still used by some components
export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  duration: number;
  completedMinutes: number;
  type: string;
  startedAt: string;
  endedAt?: string;
}

// ─── Store ───────────────────────────────────────────────────────────
interface AppState {
  // Navigation
  activeView: View;
  setActiveView: (view: View) => void;
  
  // Theme
  theme: Theme;
  toggleTheme: () => void;
  
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  // Right Panel
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
  
  // Task View
  taskView: TaskView;
  setTaskView: (view: TaskView) => void;
  
  // Tasks (from Supabase)
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // CRM (from Supabase)
  leads: CRMLead[];
  setLeads: (leads: CRMLead[]) => void;
  addLead: (lead: CRMLead) => void;
  updateLead: (id: string, updates: Partial<CRMLead>) => void;
  
  // Calendar (from Supabase)
  events: CalendarEvent[];
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  
  // Team (from Supabase)
  teamMembers: TeamMember[];
  setTeamMembers: (members: TeamMember[]) => void;
  
  // Teams (from Supabase)
  teams: DbTeam[];
  setTeams: (teams: DbTeam[]) => void;
  
  // Focus
  isFocusActive: boolean;
  currentFocusSession: FocusSession | null;
  startFocusSession: (session: FocusSession) => void;
  endFocusSession: () => void;
  
  // Chat (from Supabase)
  channels: Channel[];
  setChannels: (channels: Channel[]) => void;
  activeChannel: string | null;
  setActiveChannel: (id: string | null) => void;
  createGroupChannel: (name: string, members: string[], createdBy: string) => void;
  createDirectChannel: (userId: string, currentUserId: string) => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: 'sent' | 'delivered' | 'read') => void;
  markMessageAsReadBy: (messageId: string, userId: string) => void;
  updateUserOnlineStatus: (userId: string, isOnline: boolean) => void;
  
  // Notifications (from Supabase)
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  
  // Data Loading
  dataLoaded: boolean;
  setDataLoaded: (loaded: boolean) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  
  // Quick Add
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  
  // Modal
  modalOpen: string | null;
  setModalOpen: (modal: string | null) => void;

  // Selected Task
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
}

const sortTasksBySchedule = (tasksList: Task[]) => {
  const getRank = (t: Task) => {
    const pattern = (t.recurrence_pattern || '').toLowerCase();
    const tags = (t.tags || []).map(tag => tag.toLowerCase());
    const title = (t.title || '').toLowerCase();
    if (pattern === 'daily' || tags.includes('daily') || title.includes('daily')) return 1;
    if (pattern === 'weekly' || tags.includes('weekly') || title.includes('weekly')) return 2;
    if (pattern === 'monthly' || tags.includes('monthly') || title.includes('monthly')) return 3;
    return 4;
  };
  return [...tasksList].sort((a, b) => {
    const rankA = getRank(a);
    const rankB = getRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return (a.order_index || 0) - (b.order_index || 0);
  });
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Navigation
      activeView: 'dashboard',
      setActiveView: (view) => set({ activeView: view }),
      
      // Theme
      theme: 'light',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      
      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      
      // Right Panel
      rightPanelOpen: true,
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      
      // Task View
      taskView: 'kanban',
      setTaskView: (view) => set({ taskView: view }),
      
      // Tasks
      tasks: [],
      setTasks: (tasks) => set({ tasks: sortTasksBySchedule(tasks) }),
      addTask: (task) => set((s) => ({ tasks: sortTasksBySchedule([task, ...s.tasks]) })),
      updateTask: (id, updates) => set((s) => ({
        tasks: sortTasksBySchedule(s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t))),
      })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      
      // CRM
      leads: [],
      setLeads: (leads) => set({ leads }),
      addLead: (lead) => set((s) => ({ leads: [lead, ...s.leads] })),
      updateLead: (id, updates) => set((s) => ({
        leads: s.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      })),
      
      // Calendar
      events: [],
      setEvents: (events) => set({ events }),
      addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
      
      // Team
      teamMembers: [],
      setTeamMembers: (members) => set({ teamMembers: members }),
      
      // Teams
      teams: [],
      setTeams: (teams) => set({ teams }),
      
      // Focus
      isFocusActive: false,
      currentFocusSession: null,
      startFocusSession: (session) => set({ isFocusActive: true, currentFocusSession: session }),
      endFocusSession: () => set({ isFocusActive: false, currentFocusSession: null }),
      
      // Chat
      channels: [],
      setChannels: (channels) => set({ channels }),
      activeChannel: null,
      setActiveChannel: (id) => set({ activeChannel: id }),
      createGroupChannel: (name, members, createdBy) => set((s) => ({
        channels: [...s.channels, {
          id: `ch_${Date.now()}`,
          name,
          description: null,
          type: 'private',
          is_group: true,
          avatar_url: null,
          admin_ids: [createdBy],
          members: [...members, createdBy],
          created_by: createdBy,
          created_at: new Date().toISOString()
        }]
      })),
      createDirectChannel: (userId, currentUserId) => set((s) => {
        const existing = s.channels.find(c => !c.is_group && c.type === 'direct' && c.members.includes(userId) && c.members.includes(currentUserId));
        if (existing) return { activeChannel: existing.id };
        const newChannel: Channel = {
          id: `ch_${Date.now()}`,
          name: 'Direct Message', // In UI we will map this to the other user's name
          description: null,
          type: 'direct',
          is_group: false,
          avatar_url: null,
          admin_ids: [],
          members: [userId, currentUserId],
          created_by: currentUserId,
          created_at: new Date().toISOString()
        };
        return { channels: [...s.channels, newChannel], activeChannel: newChannel.id };
      }),
      messages: [],
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
      updateMessageStatus: (messageId, status) => set((s) => ({
        messages: s.messages.map(m => m.id === messageId ? { ...m, status } : m)
      })),
      markMessageAsReadBy: (messageId, userId) => set((s) => ({
        messages: s.messages.map(m => {
          if (m.id === messageId) {
            return {
              ...m,
              read_by: { ...(m.read_by || {}), [userId]: new Date().toISOString() },
              status: 'read'
            };
          }
          return m;
        })
      })),
      updateUserOnlineStatus: (userId, isOnline) => set((s) => ({
        teamMembers: s.teamMembers.map(tm => tm.id === userId ? { ...tm, is_online: isOnline, last_seen: isOnline ? null : new Date().toISOString() } : tm)
      })),
      
      // Notifications
      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      markNotificationRead: (id) => set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
      })),
      
      // Data Loading
      dataLoaded: false,
      setDataLoaded: (loaded) => set({ dataLoaded: loaded }),
      
      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
      
      // Quick Add
      quickAddOpen: false,
      setQuickAddOpen: (open) => set({ quickAddOpen: open }),
      
      // Modal
      modalOpen: null,
      setModalOpen: (modal) => set({ modalOpen: modal }),

      // Selected Task
      selectedTaskId: null,
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
    }),
    {
      name: 'snehyoga-crm-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        taskView: state.taskView,
        activeView: state.activeView,
      }),
    }
  )
);
