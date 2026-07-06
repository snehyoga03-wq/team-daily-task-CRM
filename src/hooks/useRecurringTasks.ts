import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import * as dataService from '@/lib/dataService';
import { DbTask } from '@/lib/supabase';

export function useRecurringTasks() {
  const { tasks, setTasks, dataLoaded } = useAppStore();
  const { currentUser } = useAuthStore();
  const cloningInProgress = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser || !dataLoaded || !tasks.length) return;

    const checkAndCloneRecurring = async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      
      // Group recurring tasks by: assignee_id + title + recurrence_pattern
      const recurringGroups = new Map<string, typeof tasks>();

      for (const task of tasks) {
        if (!task.is_recurring || !task.recurrence_pattern) continue;
        const key = `${task.assignee_id || 'unassigned'}|${task.title.trim().toLowerCase()}|${task.recurrence_pattern}`;
        if (!recurringGroups.has(key)) {
          recurringGroups.set(key, []);
        }
        recurringGroups.get(key)!.push(task);
      }

      let clonedCount = 0;

      for (const [key, groupTasks] of recurringGroups.entries()) {
        if (cloningInProgress.current.has(key)) continue;

        // Find the instance in this series with the latest due_date
        let latestTask = groupTasks[0];
        for (const t of groupTasks) {
          if ((t.due_date || '') > (latestTask.due_date || '')) {
            latestTask = t;
          }
        }

        const latestDueDate = latestTask.due_date || '';
        if (!latestDueDate || latestDueDate >= todayStr) {
          // Today's or a future instance already exists! No need to clone.
          continue;
        }

        // Determine if we should clone based on recurrence schedule
        let shouldClone = false;
        const pattern = latestTask.recurrence_pattern;

        if (pattern === 'daily') {
          // If latest due date is before today, we need a clone for today
          shouldClone = latestDueDate < todayStr;
        } else if (pattern === 'weekly') {
          // If 7 or more days have passed since latest due date
          const diffDays = Math.floor(
            (new Date(todayStr).getTime() - new Date(latestDueDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          shouldClone = diffDays >= 7;
        } else if (pattern === 'monthly') {
          // If we are in a newer month than latest due date
          const latestMonth = latestDueDate.slice(0, 7);
          const currentMonth = todayStr.slice(0, 7);
          shouldClone = currentMonth > latestMonth;
        }

        if (shouldClone) {
          cloningInProgress.current.add(key);

          try {
            console.log(`[RecurringTasks] Generating fresh clone for: "${latestTask.title}" (${pattern}) for ${todayStr}`);

            const newTaskPayload: Partial<DbTask> = {
              title: latestTask.title,
              description: latestTask.description || null,
              assignee_id: latestTask.assignee_id || null,
              creator_id: latestTask.creator_id || null,
              team_id: latestTask.team_id || null,
              priority: latestTask.priority || 'medium',
              status: 'todo', // Fresh copy is always 'todo'
              due_date: todayStr,
              due_time: latestTask.due_time || null,
              reminder: latestTask.reminder || 'none',
              is_recurring: true,
              recurrence_pattern: latestTask.recurrence_pattern,
              tags: latestTask.tags || [],
              order_index: latestTask.order_index || 0,
            };

            const createdTask = await dataService.createTask(newTaskPayload);
            clonedCount++;

            // If the template task had subtasks, clone them too
            if (latestTask.subtasks && latestTask.subtasks.length > 0) {
              for (const st of latestTask.subtasks) {
                await dataService.createSubtask({
                  task_id: createdTask.id,
                  title: st.title,
                  is_completed: false, // Fresh subtasks start unchecked
                  order_index: st.order_index || 0,
                });
              }
            }
          } catch (err) {
            console.error(`Failed to clone recurring task "${latestTask.title}":`, err);
            cloningInProgress.current.delete(key); // Allow retry on failure
          }
        }
      }

      if (clonedCount > 0) {
        console.log(`[RecurringTasks] Successfully generated ${clonedCount} fresh recurring task instances.`);
        // Refresh store with newly created tasks
        try {
          const freshTasks = await dataService.fetchTasks();
          setTasks(freshTasks);
        } catch (err) {
          console.error('Failed to reload tasks after recurring clone:', err);
        }
      }
    };

    checkAndCloneRecurring();
  }, [tasks, currentUser, dataLoaded, setTasks]);
}
