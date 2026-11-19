import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('config and public routes exist',()=>{for(const f of ['app/page.tsx','app/catalogo/page.tsx','app/produto/[slug]/page.tsx','app/carrinho/page.tsx','lib/supabase.ts','app/api/health/route.ts'])assert.ok(fs.existsSync(new URL('../'+f,import.meta.url)));});
test('no service-role key in public client',()=>{const s=fs.readFileSync(new URL('../lib/supabase.ts',import.meta.url),'utf8');assert.ok(!s.includes('SUPABASE_SERVICE_ROLE_KEY'));});
test('payment cannot be charged in storefront without provider',()=>{const s=fs.readFileSync(new URL('../app/carrinho/page.tsx',import.meta.url),'utf8');assert.match(s,/disabled>Finalização indisponível/);});
