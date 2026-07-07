import { supabase, DbTask, DbSubtask, DbLead, DbCalendarEvent, DbChannel, DbMessage, DbNotification, DbUser, DbAttendance, DbTeam } from './supabase';

// ─── TASKS ─────────────────────────────────────────────────────────

export async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  
  const tasks = (data || []) as DbTask[];
  const getRank = (t: DbTask) => {
    const pattern = (t.recurrence_pattern || '').toLowerCase();
    const tags = (t.tags || []).map(tag => tag.toLowerCase());
    const title = (t.title || '').toLowerCase();
    if (pattern === 'daily' || tags.includes('daily') || title.includes('daily')) return 1;
    if (pattern === 'weekly' || tags.includes('weekly') || title.includes('weekly')) return 2;
    if (pattern === 'monthly' || tags.includes('monthly') || title.includes('monthly')) return 3;
    return 4;
  };

  return tasks.sort((a, b) => {
    const rankA = getRank(a);
    const rankB = getRank(b);
    if (rankA !== rankB) return rankA - rankB;
    return (a.order_index || 0) - (b.order_index || 0);
  });
}

export async function fetchSubtasks(taskId: string) {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('order_index');
  if (error) throw error;
  return data as DbSubtask[];
}

export async function createTask(task: Partial<DbTask>) {
  let { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();

  // Fallback if migration hasn't been run (column depends_on or start_date doesn't exist)
  if (error && error.code === 'PGRST204') {
    console.warn('Database migration missing. Saving without start_date and depends_on.');
    const fallbackTask = { ...task };
    delete fallbackTask.start_date;
    delete fallbackTask.depends_on;
    const res = await supabase.from('tasks').insert(fallbackTask).select().single();
    data = res.data;
    error = res.error;
    if (!error) console.warn("Warning: Gantt features won't save correctly until you run the SQL migration in Supabase.");
  }

  if (error) throw error;
  return data as DbTask;
}

export async function updateTask(id: string, updates: Partial<DbTask>) {
  let { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  // Fallback if migration hasn't been run
  if (error && error.code === 'PGRST204') {
    console.warn('Database migration missing. Saving without start_date and depends_on.');
    const fallbackUpdates = { ...updates };
    delete fallbackUpdates.start_date;
    delete fallbackUpdates.depends_on;
    const res = await supabase.from('tasks').update(fallbackUpdates).eq('id', id).select().single();
    data = res.data;
    error = res.error;
    if (!error) console.warn("Warning: Gantt features won't save correctly until you run the SQL migration in Supabase.");
  }

  if (error) throw error;
  return data as DbTask;
}

export async function deleteTask(id: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function createSubtask(subtask: Partial<DbSubtask>) {
  const { data, error } = await supabase
    .from('subtasks')
    .insert(subtask)
    .select()
    .single();
  if (error) throw error;
  return data as DbSubtask;
}

export async function updateSubtask(id: string, updates: Partial<DbSubtask>) {
  const { data, error } = await supabase
    .from('subtasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbSubtask;
}

export async function deleteSubtask(id: string) {
  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function fetchTaskComments(taskId: string) {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*, user:users(*)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTaskComment(comment: { task_id: string; user_id: string; content: string }) {
  const { data, error } = await supabase
    .from('task_comments')
    .insert(comment)
    .select('*, user:users(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTaskComment(id: string) {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── CRM LEADS ─────────────────────────────────────────────────────

export async function fetchLeads() {
  const { data, error } = await supabase
    .from('crm_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as DbLead[];
}

export async function createLead(lead: Partial<DbLead>) {
  const { data, error } = await supabase
    .from('crm_leads')
    .insert(lead)
    .select()
    .single();
  if (error) throw error;
  return data as DbLead;
}

export async function updateLead(id: string, updates: Partial<DbLead>) {
  const { data, error } = await supabase
    .from('crm_leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbLead;
}

export async function deleteLead(id: string) {
  const { error } = await supabase
    .from('crm_leads')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── CALENDAR EVENTS ───────────────────────────────────────────────

export async function fetchEvents() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data as DbCalendarEvent[];
}

export async function createEvent(event: Partial<DbCalendarEvent>) {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(event)
    .select()
    .single();
  if (error) throw error;
  return data as DbCalendarEvent;
}

export async function updateEvent(id: string, updates: Partial<DbCalendarEvent>) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbCalendarEvent;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── TEAM / USERS ──────────────────────────────────────────────────

export async function fetchTeamMembers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .order('full_name');
  if (error) throw error;
  return data as DbUser[];
}

export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('full_name');
  if (error) throw error;
  return data as DbUser[];
}

export async function createUser(user: Partial<DbUser>) {
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single();
  if (error) throw error;
  return data as DbUser;
}

export async function updateUser(id: string, updates: Partial<DbUser>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbUser;
}

export async function deactivateUser(id: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbUser;
}

export async function reactivateUser(id: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbUser;
}

export async function fetchTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as DbTeam[];
}

export async function createTeam(team: Partial<DbTeam>) {
  const { data, error } = await supabase
    .from('teams')
    .insert(team)
    .select()
    .single();
  if (error) throw error;
  return data as DbTeam;
}

export async function updateTeam(id: string, updates: Partial<DbTeam>) {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DbTeam;
}

export async function deleteTeam(id: string) {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── CHANNELS & MESSAGES ───────────────────────────────────────────

export async function fetchChannels() {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as DbChannel[];
}

export async function fetchMessages(channelId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return data as DbMessage[];
}

export async function sendMessage(message: Partial<DbMessage>) {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single();
  if (error) throw error;
  return data as DbMessage;
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as DbNotification[];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function createNotification(notification: Partial<DbNotification>) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();
  if (error) throw error;
  return data as DbNotification;
}

// ─── ATTENDANCE ────────────────────────────────────────────────────

export async function fetchAttendance(date?: string) {
  let query = supabase.from('attendance').select('*');
  if (date) {
    query = query.eq('date', date);
  }
  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw error;
  return data as DbAttendance[];
}

export async function checkIn(userId: string) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Office start time is 10:00 AM local time
  const officeStartTime = new Date(now);
  officeStartTime.setHours(10, 0, 0, 0);
  
  const status = now > officeStartTime ? 'late' : 'present';

  const { data, error } = await supabase
    .from('attendance')
    .upsert({
      user_id: userId,
      date: today,
      check_in: now.toISOString(),
      status: status,
    }, { onConflict: 'user_id,date' })
    .select()
    .single();
  if (error) throw error;
  return data as DbAttendance;
}

export async function checkOut(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('attendance')
    .update({ check_out: new Date().toISOString(), status: 'checked_out' })
    .eq('user_id', userId)
    .eq('date', today)
    .select()
    .single();
  if (error) throw error;
  return data as DbAttendance;
}

export async function updateAttendanceStatus(userId: string, status: DbAttendance['status']) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: existing, error: fetchError } = await supabase
    .from('attendance')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
    
  if (fetchError) throw fetchError;
  
  let result;
  if (!existing) {
    const { data, error } = await supabase
      .from('attendance')
      .insert({ user_id: userId, date: today, status: status })
      .select()
      .single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase
      .from('attendance')
      .update({ status: status })
      .eq('user_id', userId)
      .eq('date', today)
      .select()
      .single();
    if (error) throw error;
    result = data;
  }
  return result as DbAttendance;
}

// ─── REALTIME SUBSCRIPTIONS ────────────────────────────────────────

export function subscribeToTasks(callback: (payload: any) => void) {
  return supabase
    .channel('tasks-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, callback)
    .subscribe();
}

export function subscribeToMessages(channelId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`messages-${channelId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, callback)
    .subscribe();
}

export function subscribeToLeads(callback: (payload: any) => void) {
  return supabase
    .channel('leads-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, callback)
    .subscribe();
}

export function subscribeToNotifications(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`notifications-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, callback)
    .subscribe();
}

// ─── AUTO-SEED SOCIAL MEDIA DAILY STANDUP TASKS ────────────────────
export async function ensureSocialMediaDailyTasks(creatorId?: string) {
  try {
    const { data: existingTeams } = await supabase.from('teams').select('*');
    let smTeam = (existingTeams || []).find((t: any) => t.name.toLowerCase().includes('social media'));
    
    if (!smTeam) {
      const { data: newTeam, error } = await supabase.from('teams').insert({
        name: 'Social Media Management',
        description: 'Social Media & Content Management Team',
        color: '#ec4899'
      }).select().single();
      if (!error && newTeam) {
        smTeam = newTeam;
      }
    }
    
    if (!smTeam) return;

    const { data: existingTasks } = await supabase.from('tasks').select('*').eq('team_id', smTeam.id);
    const todayStr = new Date().toISOString().split('T')[0];
    
    const hasMorning = (existingTasks || []).some((t: any) => t.title.toLowerCase().includes('morning standup'));
    if (!hasMorning) {
      await createTask({
        title: 'morning Standup meeting',
        description: 'Daily morning alignment and task planning for Social Media Management team',
        status: 'todo',
        priority: 'high',
        team_id: smTeam.id,
        creator_id: creatorId || null,
        is_recurring: true,
        recurrence_pattern: 'daily',
        tags: ['daily', 'standup', 'Planned'],
        order_index: -10,
        due_date: todayStr
      });
    }

    const hasEvening = (existingTasks || []).some((t: any) => t.title.toLowerCase().includes('evening standup'));
    if (!hasEvening) {
      await createTask({
        title: 'Evening standup meeting',
        description: 'Daily evening review of content output, reels, and pending social media tasks',
        status: 'todo',
        priority: 'high',
        team_id: smTeam.id,
        creator_id: creatorId || null,
        is_recurring: true,
        recurrence_pattern: 'daily',
        tags: ['daily', 'standup', 'Planned'],
        order_index: -9,
        due_date: todayStr
      });
    }
  } catch (err) {
    console.error('Failed to auto-seed Social Media daily standup tasks:', err);
  }
}

