import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmiauuwpepzqbygzutkn.supabase.co';
const supabaseKey = 'sb_publishable_pDCkREj5YvRspHTOHxB2-A_ODVELfqy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Find Tejshri Mane
  const { data: users, error: userError } = await supabase.from('users').select('*');
  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }
  
  const tejshri = users.find(u => u.full_name && u.full_name.toLowerCase().includes('tejshri'));
  if (!tejshri) {
    console.log('Tejshri not found in users table.');
    return;
  }
  console.log('Tejshri found:', tejshri);

  const { data: tasks, error: taskError } = await supabase.from('tasks').select('*').eq('assignee_id', tejshri.id);
  if (taskError) {
    console.error('Error fetching tasks:', taskError);
    return;
  }

  console.log(`Found ${tasks.length} tasks for Tejshri.`);
  
  const tasksToRestore = [
    { title: 'JAMIN', status: 'done' },
    { title: 'jAMIN', status: 'done' },
    { title: 'Jamin Jumala', status: 'todo' },
    { title: 'Siddharth sir', status: 'todo' },
    { title: 'Mukta mam', status: 'todo' },
    { title: 'Abhishek sir', status: 'todo' }
  ];

  for (const t of tasksToRestore) {
    const newTask = {
      title: t.title,
      status: t.status,
      assignee_id: tejshri.id,
      team_id: tejshri.team_id,
      priority: 'medium',
      is_recurring: false
    };
    
    console.log(`Restoring: ${t.title}`);
    const { error } = await supabase.from('tasks').insert(newTask);
    if (error) {
      console.error(`Failed to restore ${t.title}:`, error);
    }
  }
  
  console.log('Done restoring tasks.');
}

run();
