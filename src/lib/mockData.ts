// ─── Static Analytics Data ──────────────────────────────────────
// These are used for chart visualizations in Dashboard/Analytics views.
// All entity data (tasks, leads, team, etc.) now comes from Supabase.

export const weeklyProductivity = [
  { day: 'Mon', tasks: 12, focus: 5.5, leads: 3 },
  { day: 'Tue', tasks: 15, focus: 6.2, leads: 5 },
  { day: 'Wed', tasks: 10, focus: 4.8, leads: 2 },
  { day: 'Thu', tasks: 18, focus: 7.0, leads: 7 },
  { day: 'Fri', tasks: 14, focus: 5.5, leads: 4 },
  { day: 'Sat', tasks: 8, focus: 3.0, leads: 1 },
  { day: 'Sun', tasks: 5, focus: 2.0, leads: 0 },
];

export const monthlyRevenue = [
  { month: 'Jan', revenue: 125000, target: 150000 },
  { month: 'Feb', revenue: 148000, target: 150000 },
  { month: 'Mar', revenue: 172000, target: 170000 },
  { month: 'Apr', revenue: 165000, target: 180000 },
  { month: 'May', revenue: 195000, target: 200000 },
];

export const leadSources = [
  { source: 'Instagram', count: 45, percentage: 30 },
  { source: 'Webinar', count: 38, percentage: 25 },
  { source: 'Facebook', count: 28, percentage: 19 },
  { source: 'YouTube', count: 20, percentage: 13 },
  { source: 'Referral', count: 12, percentage: 8 },
  { source: 'Website', count: 7, percentage: 5 },
];

export const pipelineData = [
  { stage: 'New Lead', count: 24, value: 71976, color: '#8b5cf6' },
  { stage: 'Interested', count: 18, value: 89982, color: '#06b6d4' },
  { stage: 'Follow-up', count: 12, value: 35988, color: '#f59e0b' },
  { stage: 'Webinar', count: 8, value: 39992, color: '#10b981' },
  { stage: 'Converted', count: 15, value: 194985, color: '#22c55e' },
  { stage: 'Lost', count: 5, value: 0, color: '#6b7280' },
];

export const focusSessionsData = [
  { date: '05/07', minutes: 120, sessions: 4 },
  { date: '05/08', minutes: 90, sessions: 3 },
  { date: '05/09', minutes: 150, sessions: 5 },
  { date: '05/10', minutes: 60, sessions: 2 },
  { date: '05/11', minutes: 180, sessions: 6 },
  { date: '05/12', minutes: 135, sessions: 4 },
  { date: '05/13', minutes: 45, sessions: 2 },
];
