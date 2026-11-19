import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const path=(f)=>new URL('../'+f,import.meta.url);
test('rotas públicas e administração estão presentes',()=>{
  for(const f of ['app/(store)/page.tsx','app/(store)/catalogo/page.tsx','app/(store)/produto/[slug]/page.tsx','app/(store)/carrinho/page.tsx','app/admin/login/page.tsx','app/admin/produtos/page.tsx','app/admin/estoque/page.tsx','lib/supabase.ts','app/api/health/route.ts']){
    assert.ok(fs.existsSync(path(f)),f);
  }
});
test('nenhuma credencial de service-role no cliente público',()=>{
  const source=fs.readFileSync(path('lib/supabase.ts'),'utf8');
  assert.ok(!source.includes('SUPABASE_SERVICE_ROLE_KEY'));
});
test('checkout não cobra enquanto o provedor não está configurado',()=>{
  const cart=fs.readFileSync(path('app/(store)/carrinho/page.tsx'),'utf8');
  assert.match(cart,/disabled>Finalização indisponível/);
});
test('operação de estoque usa RPC transacional',()=>{
  const action=fs.readFileSync(path('app/admin/actions.ts'),'utf8');
  const migration=fs.readFileSync(path('supabase/migrations/20261119180000_init_commerce.sql'),'utf8');
  assert.match(action,/db\.rpc\('adjust_inventory'/);
  assert.match(migration,/for update;/);
  assert.match(migration,/stock_on_hand\+p_delta>=reserved/);
});
