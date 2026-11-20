import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const migration='supabase/migrations/20261119231718_secure_store_updates_and_atomic_product_creation.sql';

test('tenant categories resolve the tenant passed by the public route',()=>{
  const source=read('lib/catalog.ts');
  assert.match(source,/async function categories\(tenantSlug\?:string\)[\s\S]*?store\(tenantSlug\)/);
});

test('product form uses one database transaction for product, variant and initial stock',()=>{
  const action=read('app/admin/actions.ts');
  const sql=read(migration);
  assert.match(action,/db\.rpc\('create_product_with_initial_stock'/);
  assert.match(sql,/create or replace function app_private\.create_product_with_initial_stock[\s\S]*?security definer/);
  assert.match(sql,/create or replace function public\.create_product_with_initial_stock[\s\S]*?security invoker/);
  assert.match(sql,/insert into public\.products[\s\S]*insert into public\.product_variants[\s\S]*insert into public\.stock_movements/);
  assert.match(sql,/not public\.is_store_admin\(p_store_id\)/);
  assert.match(sql,/revoke all on public\.products, public\.product_variants, public\.stock_movements/);
});

test('store updates are restricted to owners in the latest policy',()=>{
  const sql=read(migration);
  assert.match(sql,/drop policy if exists "stores_manage"/);
  assert.match(sql,/create policy "stores_owner_update"[\s\S]*?using \(\(select app_private\.is_store_owner\(id\)\)\)[\s\S]*?with check/);
  assert.match(read('app/admin/actions.ts'),/if\(role!=='owner'\)/);
});

test('stock changes use a guarded private function after direct writes are revoked',()=>{
  const sql=read(migration);
  assert.match(sql,/create or replace function app_private\.adjust_inventory[\s\S]*?security definer/);
  assert.match(sql,/not public\.is_store_admin\(v_store\)/);
  assert.match(sql,/create or replace function public\.adjust_inventory[\s\S]*?security invoker/);
});

test('prices fit the PostgreSQL integer column',async()=>{
  const {outputText}=ts.transpileModule(read('lib/format.ts'),{
    compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}
  });
  const {priceToCents}=await import('data:text/javascript,'+encodeURIComponent(outputText));
  assert.equal(priceToCents('21474836.47'),2147483647);
  assert.throws(()=>priceToCents('21474836.48'),/Preço inválido/);
  assert.throws(()=>priceToCents(''),/Preço inválido/);
});
