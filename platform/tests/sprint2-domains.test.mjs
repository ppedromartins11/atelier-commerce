import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('requested domains never bypass validation',()=>{
 const sql=read('supabase/migrations/20261119214000_multi_tenant_onboarding.sql');
 assert.match(sql,/verified_at is null/);
 assert.match(sql,/domains_owner_propose/);
 assert.doesNotMatch(sql,/domains_owner_update/);
});
test('domain enrollment restricted to owner and remains pending',()=>{
 const actions=read('app/admin/onboarding-actions.ts');
 assert.match(actions,/proposeStoreDomain/);
 assert.match(actions,/context.role!=='owner'/);
 assert.match(actions,/\.insert\(\{\s*store_id:context.shop.id,hostname:host/);
});
test('invitation store read policy uses correlated store id',()=>{
 const sql=read('supabase/migrations/20261119214000_multi_tenant_onboarding.sql');
 assert.match(sql,/i.store_id = public.stores.id/);
});
