import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(p)=>fs.readFileSync(new URL(p,root),'utf8');
test('tenant public routes read store from path',()=>{
 for(const p of [
  'app/loja/[tenant]/page.tsx','app/loja/[tenant]/catalogo/page.tsx',
  'app/loja/[tenant]/produto/[slug]/page.tsx','app/loja/[tenant]/carrinho/page.tsx'
 ])assert.match(read(p),/tenant/);
 assert.match(read('app/loja/[tenant]/layout.tsx'),/if\(!shop\)notFound\(\)/);
});
test('tenant catalogs and cart keys are scoped',()=>{
 assert.match(read('lib/catalog.ts'),/eq\('store_id', shop.id\)/);
 assert.match(read('components/cart-button.tsx'),/'atelier-cart-v1:'\+tenantSlug/);
 assert.match(read('components/cart-view.tsx'),/'atelier-cart-v1:'\+tenantSlug/);
});
test('store choice never trusts the cookie as authorization',()=>{
 const src=read('lib/supabase.ts');
 assert.match(src,/shop = session.shops.find\(s=>s.id===selected\)/);
 assert.match(src,/memberStores\(\)/);
 assert.match(src,/getUser\(\)/);
 assert.match(read('app/admin/onboarding-actions.ts'),/session.shops.find\(shop=>shop.id===id&&shop.role==='owner'\)/);
});
test('onboarding migration has row security, verified invite and safe trigger quoting',()=>{
 const sql=read('supabase/migrations/20261119214000_multi_tenant_onboarding.sql');
 assert.match(sql,/enable row level security/);
 assert.match(sql,/stores_register_own/);
 assert.match(sql,/email_confirmed_at is not null/);
 assert.match(sql,/check_store_membership_before_insert/);
 assert.match(sql,/mark_invitation_after_join/);
 assert.match(sql,/security definer[\s\S]*?set search_path = ''/);
 assert.doesNotMatch(sql,/as \$\n/);
});
test('no public order creation or fiscal issue endpoints',()=>{
 const sql=read('supabase/migrations/20261119180000_init_commerce.sql');
 assert.doesNotMatch(sql,/create policy [^\n]+ on public\.orders for insert/i);
 assert.doesNotMatch(sql,/create policy [^\n]+ on public\.fiscal_documents for insert/i);
});
