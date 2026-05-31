import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth';
import * as dataService from '@/lib/dataService';
import { sendWhatsAppReminder } from '@/lib/whatsapp';

export function useTaskReminders() {
  const { tasks } = useAppStore();
  const { currentUser } = useAuthStore();
  const notifiedTasks = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Request notification permission if not granted
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Load already notified tasks from localStorage so we don't spam on reload
    try {
      const stored = localStorage.getItem('notified_tasks');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          notifiedTasks.current = new Set(parsed);
        }
      }
    } catch(e) {}

    const checkReminders = () => {
      if (!currentUser) return;
      
      const now = new Date();
      let hasNewNotifications = false;

      tasks.forEach(task => {
        if (task.status === 'done' || !task.due_date || !task.due_time) return;
        
        // Build the due date object
        const dueDateTime = new Date(`${task.due_date}T${task.due_time}`);
        if (isNaN(dueDateTime.getTime())) return; // invalid date

        // Calculate reminder time
        let reminderTime = new Date(dueDateTime);
        const reminderPref = (!task.reminder || task.reminder === 'none') ? 'at_due' : task.reminder;
        
        switch (reminderPref) {
          case 'at_due': break;
          case '5m': reminderTime.setMinutes(reminderTime.getMinutes() - 5); break;
          case '15m': reminderTime.setMinutes(reminderTime.getMinutes() - 15); break;
          case '30m': reminderTime.setMinutes(reminderTime.getMinutes() - 30); break;
          case '1h': reminderTime.setHours(reminderTime.getHours() - 1); break;
          case '1d': reminderTime.setDate(reminderTime.getDate() - 1); break;
        }

        // If current time is past the reminder time and we haven't notified yet
        // Also check if the reminder time was within the last 24 hours to avoid very old reminders
        const diffMs = now.getTime() - reminderTime.getTime();
        const isRecent = diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000;

        if (isRecent && !notifiedTasks.current.has(task.id)) {
          // Fire notification!
          notifiedTasks.current.add(task.id);
          hasNewNotifications = true;

          // Push to DB
          dataService.createNotification({
            user_id: currentUser.id,
            title: `Reminder: ${task.title}`,
            message: `Task is due at ${task.due_time}`,
            type: 'reminder',
            is_read: false,
            action_url: `/tasks`
          }).then(newNotif => {
            const currentNotifs = useAppStore.getState().notifications;
            useAppStore.getState().setNotifications([newNotif, ...currentNotifs]);
          }).catch(console.error);

          // Browser Notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`Reminder: ${task.title}`, {
              body: `Task is due at ${task.due_time}`,
            });
          }

          // WhatsApp Notification
          const assigneeId = task.assignee_id;
          if (assigneeId) {
            const assignee = useAppStore.getState().teamMembers.find(m => m.id === assigneeId);
            if (assignee && assignee.phone) {
              sendWhatsAppReminder(
                assignee.phone,
                `Hey ${assignee.full_name?.split(' ')[0] || 'Team member'}, reminder for task: ${task.title}. Due at ${task.due_time}.`
              ).catch(console.error);
            }
          }
        }
      });

      if (hasNewNotifications) {
        localStorage.setItem('notified_tasks', JSON.stringify(Array.from(notifiedTasks.current)));
      }
    };

    // Run once on mount and then every minute
    checkReminders();
    const interval = setInterval(checkReminders, 60000);

    return () => clearInterval(interval);
  }, [tasks, currentUser]);
}
