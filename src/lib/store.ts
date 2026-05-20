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

export type TaskView = 'list' | 'kanban' | 'calendar' | 'timeline';
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
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  
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
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
      updateTask: (id, updates) => set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
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
      messages: [],
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
      
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
