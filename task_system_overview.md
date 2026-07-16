# CRM Task System Overview

This document provides a complete, detailed overview of how the Task System functions in your CRM, specifically focusing on the lifecycle of regular tasks, recurring (daily/weekly/monthly) tasks, and exactly how they are currently configured.

## 1. How the Task System Works

At its core, the Task System allows you to create tasks and assign them to specific users or entire teams. Each task has:
- **Status:** To Do, In Progress, Review, Done
- **Priority:** Urgent, High, Medium, Low
- **Due Date:** When the task is expected to be finished
- **Recurrence:** Whether it repeats (Daily, Weekly, Monthly) or is a one-time task
- **Subtasks:** Checklists inside the main task

When tasks are created, they are saved in the database. Realtime subscriptions instantly push changes to the screen so all team members see updates live without refreshing.

---

## 2. Recurring Tasks (Daily, Weekly, Monthly)

Recurring tasks are automated templates that generate fresh copies of themselves so your team doesn't have to manually create the same tasks every day or month.

### How the Automation Works (`useRecurringTasks` Hook)
Every time a user logs into the CRM and the tasks are loaded on the screen, a background process runs to check if new recurring tasks need to be generated:

1. **Grouping:** It groups all recurring tasks by the Assignee, Title, and Pattern (e.g., "Daily", "Weekly", "Monthly").
2. **Finding the Latest Copy:** It looks at the most recently generated copy of that task to check its `due_date`.
3. **Cloning Logic:**
   - **Daily Tasks:** If the latest copy was due *before today*, it creates a fresh copy for *today*.
   - **Weekly Tasks:** If the latest copy is 7 or more days old, it creates a fresh copy for *today*.
   - **Monthly Tasks:** If the latest copy was generated in a previous month, it creates a fresh copy for *today*.
4. **Subtasks:** If the original task had subtasks, those are also cloned (with checkboxes cleared) into the new task.

> [!TIP]
> **Generation Limit:** The system only generates tasks up to the current day. It intentionally avoids generating daily tasks for the entire next year to prevent database bloat. *(Note: If someone manually sets the due date of a recurring task far into the future, the system will pause generating new ones until that future date passes, assuming the series is "already populated").*

### Auto-Seeded Social Media Tasks
There is also a special background script that guarantees the "Social Media Management" team always has two essential team-wide tasks if they ever get deleted:
- **Morning Standup meeting**
- **Evening standup meeting**

---

## 3. How Tasks Are Displayed (The Task Board)

The `TasksView.tsx` screen uses a very specific set of filters to keep the board clean and actionable for the team. 

- **The Date Filter (Crucial):** By default, the date filter is set to **Today**. 
  - This means it will **only** show tasks whose exact due date is today.
  - It will **also** roll over and show *Overdue* tasks (tasks due in the past that aren't marked as "Done" yet).
  - It intentionally **hides** future tasks (due tomorrow or next week). To see them, you must change the date filter or clear it entirely (by clicking the 'X' next to the date box).
- **Completed Tasks:** If a task does *not* have a due date (like a manual one-off task), it will disappear from the board immediately once it is marked as "Done" to save space.

---

## 4. Current State: Who Has What Set?

The database has been freshly wiped of the old configurations and strictly updated to exactly match the requested schedule:

### Tejshri Mane & Tanvi Pathak

**📅 Daily Tasks (Every Day) [9 Tasks]**
1. Reply to all pending comments on all client accounts.
2. Check Client Tracker Sheet.
3. Review all client sheets for updates.
4. Update Daily Task Sheet.
5. Complete or update all pending tasks.
6. Reply to all pending DMs on all client accounts.
7. Update the client if any approval or content is pending.
8. Spend 10 minutes on Trend Spotting. *(Check Instagram Reels, YouTube Trends, Meta Ad Library...)*
9. Spend 20 minutes on Outbound Engagement. *(Engage meaningfully on posts...)*

**📅 Weekly Tasks (Every Saturday) [4 Tasks]**
1. Complete Guest Outreach Target.
2. Share Content Planned vs Content Published report.
3. Analyze all client data *(What worked? Why did it work? What did not work?)*
4. Share the complete weekly analysis in the Microsoft Teams channel.

**📅 Monthly Tasks [13 Tasks]**
*1st – 5th of Every Month:*
1. Share Festival List with clients.
2. Share Social Media Report with clients.
3. Update Client Report Sheet.
4. Share Content Calendar with clients.
5. Analyze the previous month’s performance.
6. Identify high-performing content and add it to the Repost / Recycle Library.
7. Share the complete monthly analysis in the Microsoft Teams channel.

*Before 7th of Every Month:*
8. Assign festival creatives to the Graphic Designer.

*20th – 25th of Every Month:*
9. Create the content strategy for the upcoming month.
10. Share the content strategy with the client.
11. Get client approval before the new month begins.

*25th of Every Month:*
12. Share Shoot Booking Link with clients.
13. Pin the message in the chat.


### Pranjali Kohad

**📅 Daily Tasks (Every Day) [8 Tasks]**
1. Reply to all pending comments on all client accounts.
2. Review all client sheets for updates.
3. Update Daily Task Sheet.
4. Complete or update all pending tasks.
5. Reply to all pending DMs on all client accounts.
6. Update the client if any approval or content is pending.
7. Spend 10 minutes on Trend Spotting. *(Check Instagram Reels, YouTube Trends...)*
8. Spend 20 minutes on Outbound Engagement. *(Engage meaningfully...)*

**📅 Weekly Tasks (Every Saturday) [4 Tasks]**
1. Complete Guest Outreach Target.
2. Share Content Planned vs Content Published report.
3. Analyze all client data *(What worked? Why did it work? What did not work?)*
4. Share the complete weekly analysis in the Microsoft Teams channel.

**📅 Monthly Tasks [9 Tasks]**
*1st – 5th of Every Month:*
1. Share Social Media Report with clients.
2. Update Client Report Sheet.
3. Share Content Calendar with clients.
4. Analyze the previous month’s performance.
5. Identify high-performing content and add it to the Repost / Recycle Library.
6. Share the complete monthly analysis in the Microsoft Teams channel.

*20th – 25th of Every Month:*
7. Create the content strategy for the upcoming month.
8. Share the content strategy with the client.
9. Get client approval before the new month begins.
