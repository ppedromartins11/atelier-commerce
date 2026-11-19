import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
export async function sessionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return jar.getAll(); },
      setAll(values) {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* A leitura em Server Components não pode alterar cookies. */ }
      },
    },
  });
}
export async function store() {
  const db = publicClient();
  if (!db) return null;
  const { data } = await db.from('stores').select('id,slug,name,description,hero_title,hero_text,hero_image_url,logo_url').eq('slug', process.env.STORE_SLUG || 'atelier').eq('is_published', true).maybeSingle();
  return data;
}
export async function requireAdmin() {
  const db = await sessionClient();
  if (!db) return null;
  const { data: auth, error } = await db.auth.getUser();
  if (error || !auth.user) return null;
  const { data: shop } = await db.from('stores').select('id,name,slug').eq('slug', process.env.STORE_SLUG || 'atelier').maybeSingle();
  if (!shop) return null;
  const { data: membership } = await db.from('store_members').select('role').eq('store_id', shop.id).eq('user_id', auth.user.id).in('role', ['owner', 'admin']).maybeSingle();
  if (!membership) return null;
  return { db, shop, user: auth.user, role: membership.role };
}
