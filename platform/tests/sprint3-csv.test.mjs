import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const {outputText}=ts.transpileModule(read('lib/catalog-csv.ts'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
});
const {parseCatalogCsv}=await import('data:text/javascript,'+encodeURIComponent(outputText));
const head='title;sku;price;stock;description;category_slug';

test('CSV import parser handles pt-BR prices, escaped quotes and multiline descriptions',()=>{
 const input=head+'\nCamisa Verde;SKU-1;19,90;7;"Descrição com ; e ""aspas""";camisas\n'+
 'Camiseta Azul;SKU-2;21.50;0;"Descrição\ncom duas linhas";\n';
 const rows=parseCatalogCsv(input);
 assert.equal(rows.length,2);
 assert.equal(rows[0].price,'19,90');
 assert.equal(rows[0].description,'Descrição com ; e "aspas"');
 assert.equal(rows[1].description,'Descrição\ncom duas linhas');
});

test('CSV import parser rejects invalid headers, unfinished quote, and over-limit rows',()=>{
 assert.throws(()=>parseCatalogCsv('name;sku\nx;y'),/Cabeçalho/);
 assert.throws(()=>parseCatalogCsv(head+'\n"unclosed;sku;2;0;;'),/aspas/i);
 assert.throws(()=>parseCatalogCsv(head+'\n'+Array.from({length:101},(_,i)=>'X'+i+';S'+i+';2;0;;').join('\n')),/100 produtos/);
});

test('CSV import uses one database transaction and enforces store membership',()=>{
 const sql=read('supabase/migrations/20261120022145_atomic_catalog_csv_import.sql');
 const actions=read('app/admin/catalog-actions.ts');
 assert.match(sql,/jsonb_array_length\(p_rows\) not between 1 and 100/);
 assert.match(sql,/not public\.is_store_admin\(p_store_id\)/);
 assert.match(sql,/perform app_private\.create_product_with_initial_stock/);
 assert.match(actions,/db\.rpc\('import_catalog_batch'/);
 assert.match(actions,/categoryBySlug/);
});
