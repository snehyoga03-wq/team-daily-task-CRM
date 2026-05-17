import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  | 'ai';

export type TaskView = 'list' | 'kanban' | 'calendar' | 'timeline';
export type Theme = 'dark' | 'light';
export type CRMStage = 'new_lead' | 'interested' | 'follow_up' | 'joined_webinar' | 'converted' | 'not_interested';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: TeamMember;
  dueDate?: string;
  tags: string[];
  subtasks: SubTask[];
  comments: Comment[];
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
  updatedAt: string;
}

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

export interface CRMLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsappStatus?: string;
  status: CRMStage;
  source?: string;
  notes?: string;
  assignedTo?: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type: 'meeting' | 'webinar' | 'task' | 'reminder' | 'event';
  color?: string;
  attendees: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  team: string;
  xpPoints: number;
  level: number;
  streakDays: number;
  status: 'online' | 'away' | 'offline' | 'focus';
}

export interface FocusSession {
  id: string;
  duration: number;
  completedMinutes: number;
  type: string;
  startedAt: string;
  endedAt?: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  members: string[];
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  reactions: Record<string, string[]>;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'crm' | 'webinar' | 'mention' | 'deadline' | 'announcement';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
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
  
  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // CRM
  leads: CRMLead[];
  setLeads: (leads: CRMLead[]) => void;
  addLead: (lead: CRMLead) => void;
  updateLead: (id: string, updates: Partial<CRMLead>) => void;
  
  // Calendar
  events: CalendarEvent[];
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  
  // Team
  teamMembers: TeamMember[];
  setTeamMembers: (members: TeamMember[]) => void;
  
  // Focus
  isFocusActive: boolean;
  currentFocusSession: FocusSession | null;
  startFocusSession: (session: FocusSession) => void;
  endFocusSession: () => void;
  
  // Chat
  channels: Channel[];
  setChannels: (channels: Channel[]) => void;
  activeChannel: string | null;
  setActiveChannel: (id: string | null) => void;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  
  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  
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
      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
      updateTask: (id, updates) => set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      
      // CRM
      leads: [],
      setLeads: (leads) => set({ leads }),
      addLead: (lead) => set((s) => ({ leads: [...s.leads, lead] })),
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
          n.id === id ? { ...n, isRead: true } : n
        ),
      })),
      
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
