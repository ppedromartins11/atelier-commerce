import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const ACTIVE_STORE_COOKIE = 'atelier_active_store';

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
        catch { /* Server Components não podem alterar cookies. */ }
      },
    },
  });
}

export async function store(slug?: string) {
  const db = publicClient();
  if (!db) return null;
  const effectiveSlug = slug ?? process.env.STORE_SLUG ?? 'atelier';
  if (!/^[a-z0-9-]{3,60}$/.test(effectiveSlug)) return null;
  const { data } = await db.from('stores')
    .select('id,slug,name,description,hero_title,hero_text,hero_image_url,logo_url')
    .eq('slug', effectiveSlug).eq('is_published', true).maybeSingle();
  return data;
}

export type MerchantShop = {id:string;slug:string;name:string;is_published:boolean;owner_user_id:string|null;role:'owner'|'admin'};
export async function memberStores() {
  const db = await sessionClient();
  if (!db) return null;
  const {data:auth,error} = await db.auth.getUser();
  if (error || !auth.user) return null;
  const {data:members,error:membershipError} = await db.from('store_members')
    .select('store_id,role').eq('user_id',auth.user.id).in('role',['owner','admin']);
  if (membershipError) throw new Error('Não foi possível consultar suas lojas.');
  const ids = (members||[]).map(m=>m.store_id);
  if (!ids.length) return {db,user:auth.user,shops:[] as MerchantShop[]};
  const {data:shopRows,error:shopError} = await db.from('stores')
    .select('id,slug,name,is_published,owner_user_id').in('id',ids);
  if (shopError) throw new Error('Não foi possível consultar os dados das lojas.');
  const shops:MerchantShop[] = (shopRows||[]).flatMap(s=>{
    const membership=(members||[]).find(m=>m.store_id===s.id);
    if(!membership || !['owner','admin'].includes(membership.role))return [];
    return [{...s,role:membership.role as 'owner'|'admin'}];
  }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  return {db,user:auth.user,shops};
}

export async function requireAdmin() {
  const session = await memberStores();
  if (!session || !session.shops.length) return null;
  const jar = await cookies();
  const selected = jar.get(ACTIVE_STORE_COOKIE)?.value;
  // O cookie é somente uma preferência. Autorização sempre vem do banco e da sessão.
  const shop = session.shops.find(s=>s.id===selected) || session.shops[0];
  return {db:session.db,user:session.user,shop,role:shop.role};
}

export async function selectStoreCookie(storeId:string){
  const jar=await cookies();
  jar.set(ACTIVE_STORE_COOKIE,storeId,{
    httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',
    path:'/',maxAge:60*60*24*30
  });
}
export async function clearStoreCookie(){
  const jar=await cookies();
  jar.delete(ACTIVE_STORE_COOKIE);
}
