import { publicClient, store } from './supabase';
export type Item = {
  id: string; slug: string; title: string; description: string | null;
  price_cents: number; compare_at_cents: number | null; images: string[] | null;
  product_variants: Array<{ id: string; sku: string; label: string; stock_on_hand: number; reserved: number; active: boolean; }>;
};
export async function catalog(search?: string, category?: string, tenantSlug?: string) {
  const shop = await store(tenantSlug);
  const db = publicClient();
  if (!shop || !db) return { shop, products: [] as Item[] };
  let query = db.from('products').select('id,slug,title,description,price_cents,compare_at_cents,images,product_variants(id,sku,label,stock_on_hand,reserved,active)').eq('store_id', shop.id).eq('active', true).order('created_at', { ascending: false }).limit(100);
  if (search?.trim()) query = query.ilike('title', '%' + search.trim().replace(/[%_,]/g, '') + '%');
  if (category) query = query.eq('category_id', category);
  const { data, error } = await query;
  if (error) console.error('Catalog query failed', error.message);
  return { shop, products: (data || []) as Item[] };
}
export async function categories(tenantSlug?:string) {
  const shop = await store(tenantSlug);
  const db = publicClient();
  if (!shop || !db) return [];
  const { data } = await db.from('categories').select('id,name,slug').eq('store_id',shop.id).order('sort_order');
  return data || [];
}
