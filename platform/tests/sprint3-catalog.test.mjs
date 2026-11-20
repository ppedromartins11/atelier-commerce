import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261120021324_catalog_lifecycle_and_private_images.sql');
const imageMigration=read('supabase/migrations/20261120021414_catalog_image_mutation_rpc.sql');

test('product archiving preserves data and excludes archived products from anonymous listings',()=>{
 assert.match(migration,/add column if not exists archived_at/);
 assert.match(migration,/drop policy if exists "products_delete"/);
 assert.match(migration,/products_published_read[\s\S]*archived_at is null/);
 assert.match(read('app/admin/catalog-actions.ts'),/archived_at:archive\?new Date\(\)\.toISOString\(\):null,active:false/);
 assert.match(read('lib/catalog.ts'),/\.is\('archived_at',null\)/);
});

test('variants can only be created and edited via checked private RPC',()=>{
 assert.match(migration,/function app_private\.save_product_variant[\s\S]*?security definer/);
 assert.match(migration,/not public\.is_store_admin\(p_store_id\)/);
 assert.match(migration,/if p_initial_stock <> 0 then raise exception/);
 assert.match(migration,/revoke insert, update, delete on public\.product_variants,public\.stock_movements/);
 assert.match(read('app/admin/catalog-actions.ts'),/db\.rpc\('save_product_variant'/);
});

test('images are in a private bucket and URLs require product authorization',()=>{
 assert.match(migration,/values \('catalog-images','catalog-images',false/);
 assert.match(migration,/atelier_catalog_image_public_read[\s\S]*p\.archived_at is null/);
 assert.match(imageMigration,/attach_catalog_image[\s\S]*cardinality\(images\)<8/);
 assert.match(read('app/api/catalog-image/[productId]/route.ts'),/db\.from\('products'\)\.select\('images'\)/);
 assert.match(read('app/api/catalog-image/[productId]/route.ts'),/createSignedUrl\(path,60\)/);
 assert.match(read('app/admin/catalog-actions.ts'),/file\.size>5242880/);
});

test('product editor and category maintenance are scoped to current store',()=>{
 const actions=read('app/admin/catalog-actions.ts');
 assert.match(actions,/\.eq\('store_id',a\.shop\.id\)/);
 assert.match(actions,/saveCategoryName/);
 assert.match(actions,/removeEmptyCategory/);
 assert.match(actions,/saveProductDetails/);
 assert.match(actions,/uploadProductImage/);
 assert.match(read('app/admin/produtos/[id]/page.tsx'),/setProductArchive/);
});

test('image urls use the protected same-origin route for private paths',()=>{
 const helper=read('lib/catalog-image.ts');
 assert.match(helper,/\/api\/catalog-image\//);
 assert.match(read('components/product-card.tsx'),/productImageSrc/);
 assert.match(read('components/store-product.tsx'),/productImageSrc/);
});
