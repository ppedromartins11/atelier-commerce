import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const path=(f)=>new URL('../'+f,import.meta.url);
const read=(f)=>fs.readFileSync(path(f),'utf8');
test('all public and admin routes exist',()=>{
 for(const f of [
  'app/(store)/page.tsx','app/(store)/catalogo/page.tsx','app/(store)/produto/[slug]/page.tsx',
  'app/(store)/carrinho/page.tsx','app/admin/login/page.tsx','app/admin/produtos/page.tsx',
  'app/admin/estoque/page.tsx','app/api/health/route.ts','app/admin/lojas/page.tsx',
  'app/admin/cadastro/page.tsx','app/loja/[tenant]/page.tsx'
 ])assert.ok(fs.existsSync(path(f)),f);
});
test('no server-only credential in browser code',()=>{
 assert.ok(!read('lib/supabase.ts').includes('SUPABASE_SERVICE_ROLE_KEY'));
});
test('checkout cannot charge before a payment provider exists',()=>{
 assert.match(read('components/cart-view.tsx'),/disabled>Finalização indisponível/);
});
test('inventory uses transactional RPC and prevents negative stock',()=>{
 const action=read('app/admin/actions.ts');
 const sql=read('supabase/migrations/20261119231706_init_commerce.sql');
 assert.match(action,/db\.rpc\('adjust_inventory'/);
 assert.match(sql,/for update;/);
 assert.match(sql,/stock_on_hand\+p_delta>=reserved/);
});
