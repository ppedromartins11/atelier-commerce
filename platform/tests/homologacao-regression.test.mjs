import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('public Storage policy uses outer object path, not ambiguous store name',()=>{
 const sql=read('supabase/migrations/20261120030931_fix_public_catalog_media_policy.sql');
 assert.match(sql,/storage\.objects\.name=any\(p\.images\)/);
 assert.match(sql,/storage\.objects\.name like p\.store_id::text/);
 assert.match(sql,/drop policy if exists "atelier_catalog_image_public_read"/);
});
test('each migration has a unique version and proper ordered name',()=>{
 const files=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(f=>f.endsWith('.sql'));
 assert.equal(files.length,11);
 const versions=files.map(f=>{assert.match(f,/^\d{14}_[a-z0-9_]+\.sql$/);return f.slice(0,14)});
 assert.equal(new Set(versions).size,files.length);
 assert.deepEqual(files.slice().sort(),files);
});
test('homologation SQL suites are rollback-only, without persistent writes',()=>{
 for(const filename of ['homologacao-rls-duas-lojas.sql','homologacao-storage-rls.sql','homologacao-operacoes-catalogo.sql']){
  const sql=read('tests/'+filename);
  assert.match(sql,/begin;/i);
  assert.match(sql,/rollback;/i);
  assert.doesNotMatch(sql,/^\s*commit\s*;/im);
 }
});
