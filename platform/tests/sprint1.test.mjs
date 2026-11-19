import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=(path)=>fs.readFileSync(new URL(path,root),'utf8');
test('separate customer and merchant layouts',()=>{
 const base=read('app/layout.tsx');
 const store=read('app/(store)/layout.tsx');
 assert.doesNotMatch(base,/Header/);
 assert.match(store,/<Header/);
 assert.match(store,/<StoreFooter/);
 assert.match(read('components/store-footer.tsx'),/Área do lojista/);
});
test('public storefront has hero, catalog, categories and real product query',()=>{
 const home=read('components/store-home.tsx');
 for(const token of ['store-hero','id="catalogo"','catalog(undefined,undefined,tenantSlug)','categories(tenantSlug)','ProductCard'])assert.ok(home.includes(token),token);
 assert.doesNotMatch(home,/fictício|fake product/i);
});
test('admin routes are separate and authenticated',()=>{
 const base=read('app/admin/page.tsx');
 assert.match(base,/requireAdmin/);
 assert.match(base,/redirect\('\/admin\/login'\)/);
 const nav=read('components/admin-nav.tsx');
 for(const path of ['/admin/produtos','/admin/estoque','/admin/pedidos','/admin/fiscal'])assert.ok(nav.includes(path));
});
test('checkout remains disabled while integrations are not live',()=>{
 const cart=read('components/cart-view.tsx');
 assert.match(cart,/Finalização indisponível/);
});
