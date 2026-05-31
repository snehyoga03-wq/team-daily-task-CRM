const NEXT_PUBLIC_SUPABASE_URL = 'https://cmiauuwpepzqbygzutkn.supabase.co';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_pDCkREj5YvRspHTOHxB2-A_ODVELfqy';

fetch(`${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?full_name=eq.prathm`, {
  method: 'PATCH',
  headers: {
    'apikey': NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ phone: '9145414083' })
})
.then(res => console.log('Update Status:', res.status))
.catch(console.error);
