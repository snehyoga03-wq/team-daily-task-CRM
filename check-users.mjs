const NEXT_PUBLIC_SUPABASE_URL = 'https://cmiauuwpepzqbygzutkn.supabase.co';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_pDCkREj5YvRspHTOHxB2-A_ODVELfqy';

fetch(`${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?select=full_name,phone`, {
  headers: {
    'apikey': NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}`
  }
})
.then(res => res.json())
.then(data => console.log(data))
.catch(console.error);
