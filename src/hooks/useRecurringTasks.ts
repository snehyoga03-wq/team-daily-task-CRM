import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import * as dataService from '@/lib/dataService';
import { DbTask } from '@/lib/supabase';

// ─── Helpers ────────────────────────────────────────────────────────

function isSunday(date: Date): boolean {
  return date.getDay() === 0; // 0 = Sunday
}

function isWorkingDay(date: Date): boolean {
  return !isSunday(date); // Mon-Sat = working days
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Main Hook ──────────────────────────────────────────────────────

export function useRecurringTasks() {
  const { tasks, setTasks, dataLoaded } = useAppStore();
  const { currentUser } = useAuthStore();
  const generationInProgress = useRef(false);
  const lastRunDate = useRef<string>('');

  useEffect(() => {
    if (!currentUser || !dataLoaded) return;

    const todayStr = toDateStr(new Date());

    // Only run once per calendar day per session
    if (lastRunDate.current === todayStr) return;
    if (generationInProgress.current) return;

    const runEngine = async () => {
      generationInProgress.current = true;

      try {
        // 1. Fetch all recurring templates for this user (and unassigned team ones)
        const templates = await dataService.fetchRecurringTemplates();
        // Filter to templates relevant to this user or their team
        const userTemplates = templates.filter(
          (t) => t.assignee_id === currentUser.id || (!t.assignee_id && t.team_id)
        );

        if (userTemplates.length === 0) {
          lastRunDate.current = todayStr;
          generationInProgress.current = false;
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let generated = 0;

        // 2. Generate tasks for today, backfill up to 7 days, and pre-generate 14 days ahead
        const datesToCheck: string[] = [];
        for (let i = -6; i <= 14; i++) {
          const d = addDays(today, i);
          datesToCheck.push(toDateStr(d));
        }

        for (const template of userTemplates) {
          const pattern = (template.recurrence_pattern || '').toLowerCase();

          if (pattern === 'daily') {
            generated += await generateDailyInstances(template, datesToCheck, currentUser.id);
          } else if (pattern === 'weekly') {
            generated += await generateWeeklyInstances(template, datesToCheck, currentUser.id);
          } else if (pattern === 'monthly') {
            generated += await generateMonthlyInstances(template, datesToCheck, currentUser.id);
          }
        }

        if (generated > 0) {
          console.log(`[RecurringEngine] Generated ${generated} task instances.`);
          const freshTasks = await dataService.fetchTasks();
          setTasks(freshTasks);
        }

        lastRunDate.current = todayStr;
      } catch (err) {
        console.error('[RecurringEngine] Error:', err);
      } finally {
        generationInProgress.current = false;
      }
    };

    runEngine();
  }, [currentUser, dataLoaded, tasks.length, setTasks]);
}

// ─── Daily Task Generation ──────────────────────────────────────────

async function generateDailyInstances(
  template: DbTask,
  datesToCheck: string[],
  userId: string
): Promise<number> {
  let count = 0;

  for (const dateStr of datesToCheck) {
    const date = new Date(dateStr + 'T00:00:00');

    // Skip Sundays
    if (isSunday(date)) continue;

    // Check if user is on leave
    const onLeave = await dataService.fetchLeaveStatus(userId, dateStr);
    if (onLeave) continue;

    // Check if instance already exists
    const exists = await dataService.checkInstanceExists(template.id, dateStr);
    if (exists) continue;

    // Also check for legacy instances (before source_task_id was added)
    // by matching title + assignee + date
    const existingForDate = await dataService.fetchTaskInstancesForDate(userId, dateStr);
    const alreadyHas = existingForDate.some(
      (t) => t.title === template.title && t.recurrence_pattern === 'daily'
    );
    if (alreadyHas) continue;

    // Create the instance
    await dataService.createTask({
      title: template.title,
      description: template.description || null,
      assignee_id: template.assignee_id || null,
      creator_id: template.creator_id || null,
      team_id: template.team_id || null,
      priority: template.priority || 'medium',
      status: 'todo',
      due_date: dateStr,
      due_time: template.due_time || null,
      reminder: template.reminder || 'none',
      is_recurring: true,
      recurrence_pattern: 'daily',
      recurrence_day: template.recurrence_day,
      source_task_id: template.id,
      tags: template.tags || [],
      order_index: template.order_index || 0,
    });
    count++;
  }

  return count;
}

// ─── Weekly Task Generation ─────────────────────────────────────────

async function generateWeeklyInstances(
  template: DbTask,
  datesToCheck: string[],
  userId: string
): Promise<number> {
  const targetDay = template.recurrence_day ?? 6; // Default Saturday
  let count = 0;

  for (const dateStr of datesToCheck) {
    const date = new Date(dateStr + 'T00:00:00');
    if (date.getDay() !== targetDay) continue;

    // Check if instance already exists
    const exists = await dataService.checkInstanceExists(template.id, dateStr);
    if (exists) continue;

    // Legacy check
    const existingForDate = await dataService.fetchTaskInstancesForDate(userId, dateStr);
    const alreadyHas = existingForDate.some(
      (t) => t.title === template.title && t.recurrence_pattern === 'weekly'
    );
    if (alreadyHas) continue;

    await dataService.createTask({
      title: template.title,
      description: template.description || null,
      assignee_id: template.assignee_id || null,
      creator_id: template.creator_id || null,
      team_id: template.team_id || null,
      priority: template.priority || 'medium',
      status: 'todo',
      due_date: dateStr,
      due_time: template.due_time || null,
      reminder: template.reminder || 'none',
      is_recurring: true,
      recurrence_pattern: 'weekly',
      recurrence_day: template.recurrence_day,
      source_task_id: template.id,
      tags: template.tags || [],
      order_index: template.order_index || 0,
    });
    count++;
  }
  return count;
}

// ─── Monthly Task Generation ────────────────────────────────────────

async function generateMonthlyInstances(
  template: DbTask,
  datesToCheck: string[],
  userId: string
): Promise<number> {
  const targetDay = template.recurrence_day;
  if (!targetDay) return 0;

  let count = 0;

  for (const dateStr of datesToCheck) {
    const date = new Date(dateStr + 'T00:00:00');
    if (date.getDate() !== targetDay) continue;

    // Check if instance already exists
    const exists = await dataService.checkInstanceExists(template.id, dateStr);
    if (exists) continue;

    // Legacy check
    const existingForDate = await dataService.fetchTaskInstancesForDate(userId, dateStr);
    const alreadyHas = existingForDate.some(
      (t) => t.title === template.title && t.recurrence_pattern === 'monthly'
    );
    if (alreadyHas) continue;

    await dataService.createTask({
      title: template.title,
      description: template.description || null,
      assignee_id: template.assignee_id || null,
      creator_id: template.creator_id || null,
      team_id: template.team_id || null,
      priority: template.priority || 'medium',
      status: 'todo',
      due_date: dateStr,
      due_time: template.due_time || null,
      reminder: template.reminder || 'none',
      is_recurring: true,
      recurrence_pattern: 'monthly',
      recurrence_day: template.recurrence_day,
      source_task_id: template.id,
      tags: template.tags || [],
      order_index: template.order_index || 0,
    });
    count++;
  }
  return count;
}
