import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmiauuwpepzqbygzutkn.supabase.co';
const supabaseKey = 'sb_publishable_pDCkREj5YvRspHTOHxB2-A_ODVELfqy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Test: try to read the new columns
  const { data, error } = await supabase
    .from('tasks')
    .select('id, recurrence_day, source_task_id, is_carry_forward')
    .limit(1);
  
  if (error) {
    console.log('ERROR: New columns do NOT exist yet. You must run this SQL in Supabase SQL Editor:');
    console.log('');
    console.log('ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_day INTEGER;');
    console.log('ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;');
    console.log('ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_carry_forward BOOLEAN DEFAULT false;');
    console.log('CREATE INDEX IF NOT EXISTS idx_tasks_source ON public.tasks(source_task_id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON public.tasks(is_recurring, recurrence_pattern, assignee_id);');
    console.log('CREATE INDEX IF NOT EXISTS idx_tasks_recurring_day ON public.tasks(recurrence_day);');
    console.log('');
    console.log('Error details:', error.message);
  } else {
    console.log('SUCCESS: New columns exist! Sample:', data);
  }
}
run();
