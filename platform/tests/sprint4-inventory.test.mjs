import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const moduleCode=ts.transpileModule(read('lib/inventory.ts'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const {availableInventory,inventoryState,inventorySummary}=await import('data:text/javascript,'+encodeURIComponent(moduleCode));

test('available inventory subtracts reserved stock',()=>{
 assert.equal(availableInventory({stock_on_hand:10,reserved:4}),6);
 assert.equal(availableInventory({stock_on_hand:0,reserved:0}),0);
});
test('zero stock is sold out even if reorder point is disabled',()=>{
 assert.equal(inventoryState({stock_on_hand:0,reserved:0,reorder_point:0}),'out');
 assert.equal(inventoryState({stock_on_hand:5,reserved:5,reorder_point:4}),'out');
});
test('low stock compares only available units, not gross balance',()=>{
 assert.equal(inventoryState({stock_on_hand:10,reserved:8,reorder_point:3}),'low');
 assert.equal(inventoryState({stock_on_hand:10,reserved:2,reorder_point:3}),'ok');
 assert.equal(inventoryState({stock_on_hand:1,reserved:0,reorder_point:0}),'ok');
});
test('inventory summary aggregates only the supplied SKU selection',()=>{
 assert.deepEqual(inventorySummary([
 {stock_on_hand:4,reserved:1,reorder_point:3},
 {stock_on_hand:0,reserved:0,reorder_point:1},
 {stock_on_hand:6,reserved:1,reorder_point:2}
 ]),{visible:3,low:1,out:1});
});

test('audit counts are accessible only via checked private RPC and not direct grants',()=>{
 const migration=read('supabase/migrations/20261120030000_inventory_counts_reorder_rpc.sql');
 assert.match(migration,/alter table public\.inventory_counts enable row level security/);
 assert.match(migration,/grant select on public\.inventory_counts to authenticated/);
 assert.match(migration,/revoke insert,update,delete,truncate,trigger,references\s+on public\.inventory_counts/);
 assert.match(migration,/for update/);
 assert.match(migration,/p_counted_quantity < v_reserved/);
 assert.match(migration,/if v_delta<>0 then/);
 assert.match(migration,/not public\.is_store_admin\(v_store_id\)/);
});

test('UI provides distinct stock correction and physical-count actions',()=>{
 const actions=read('app/admin/inventory-actions.ts');
 const page=read('app/admin/estoque/page.tsx');
 assert.match(actions,/db\.rpc\('set_inventory_reorder_point'/);
 assert.match(actions,/db\.rpc\('reconcile_inventory_count'/);
 assert.match(page,/action=\{reconcilePhysicalCount\}/);
 assert.match(page,/action=\{setReorderPoint\}/);
 assert.match(page,/Histórico de contagens físicas/);
});
