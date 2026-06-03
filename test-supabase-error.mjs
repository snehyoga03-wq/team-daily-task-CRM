import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmiauuwpepzqbygzutkn.supabase.co';
const supabaseAnonKey = 'sb_publishable_pDCkREj5YvRspHTOHxB2-A_ODVELfqy';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: 'Test Task',
      status: 'todo',
      priority: 'medium',
      start_date: '2026-06-03',
      depends_on: []
    })
    .select()
    .single();

  if (error) {
    console.log('Error occurred:', error.message, error.details, error.hint, error.code);
  } else {
    console.log('Success:', data);
  }
}

testInsert();
