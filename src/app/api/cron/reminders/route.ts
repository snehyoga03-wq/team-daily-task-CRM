import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppTemplateServer } from '@/lib/whatsapp-server';
import { DbTask, DbUser } from '@/lib/supabase';
import { format } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'user'; 

  // Basic security to prevent unauthorized execution if needed, Vercel cron uses authorization header
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    // We allow it to pass if CRON_SECRET is not set, or we can just log a warning.
    console.warn('Unauthorized cron execution attempt or CRON_SECRET not set');
  }

  try {
    if (type === 'user') {
      const result = await handleUserReminders();
      return NextResponse.json({ success: true, result });
    } else if (type === 'admin') {
      const result = await handleAdminSummary();
      return NextResponse.json({ success: true, result });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function getIncompleteTasks() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .in('status', ['todo', 'in_progress', 'review']);
  
  if (error) throw error;
  return tasks as DbTask[];
}

async function getActiveUsers() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true);
    
  if (error) throw error;
  return users as DbUser[];
}

async function handleUserReminders() {
  const [tasks, users] = await Promise.all([
    getIncompleteTasks(),
    getActiveUsers()
  ]);

  const usersWithPhone = users.filter((u) => u.phone);
  let sentCount = 0;

  for (const user of usersWithPhone) {
    const userTasks = tasks.filter((t) => t.assignee_id === user.id);
    
    if (userTasks.length > 0) {
      // Format task titles and due dates
      const taskListStr = userTasks.map(t => {
        const timeStr = t.due_date ? `(Due: ${format(new Date(t.due_date), 'MMM do')})` : '';
        return `${t.title} ${timeStr}`.trim();
      }).join(', ');

      try {
        await sendWhatsAppTemplateServer({
          phone: user.phone!,
          templateName: 'reminder_task',
          parameters: [user.full_name, taskListStr],
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to send user reminder to ${user.full_name}`, err);
      }
    }
  }

  return { message: `Sent reminders to ${sentCount} users.` };
}

async function handleAdminSummary() {
  const [tasks, users] = await Promise.all([
    getIncompleteTasks(),
    getActiveUsers()
  ]);

  const admins = users.filter((u) => u.role === 'admin' && u.phone);
  
  if (admins.length === 0) {
    return { message: 'No admins with phone numbers found.' };
  }

  if (tasks.length === 0) {
    return { message: 'No incomplete tasks to report.' };
  }

  // Group tasks by user
  const groupedTasks: Record<string, string[]> = {};
  for (const task of tasks) {
    if (!task.assignee_id) continue;
    
    if (!groupedTasks[task.assignee_id]) {
      groupedTasks[task.assignee_id] = [];
    }
    
    const timeStr = task.due_date ? `(Due: ${format(new Date(task.due_date), 'MMM do')})` : '';
    groupedTasks[task.assignee_id].push(`${task.title} ${timeStr}`.trim());
  }

  // Create summary report
  const summaryLines = [];
  for (const userId of Object.keys(groupedTasks)) {
    const user = users.find(u => u.id === userId);
    if (user) {
      const userTasks = groupedTasks[userId].join(', ');
      summaryLines.push(`*${user.full_name}*: ${userTasks}`);
    }
  }

  // WhatsApp templates might have length limits on parameters, but we'll try to join them
  const summaryString = summaryLines.join(' | ');
  let sentCount = 0;

  for (const admin of admins) {
    try {
      await sendWhatsAppTemplateServer({
        phone: admin.phone!,
        templateName: 'reminder_task',
        parameters: [admin.full_name, summaryString],
      });
      sentCount++;
    } catch (err) {
      console.error(`Failed to send admin summary to ${admin.full_name}`, err);
    }
  }

  return { message: `Sent summaries to ${sentCount} admins.` };
}
