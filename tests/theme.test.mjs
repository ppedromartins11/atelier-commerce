import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const read = (file) => readFileSync(join(root, file), 'utf8');
const files = (dir, ext) => readdirSync(join(root, dir)).filter((file) => file.endsWith(ext));

function extractSchema(text) {
  const match = text.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  assert.ok(match, 'Seção sem bloco schema');
  return JSON.parse(match[1]);
}

test('estrutura mínima Shopify Online Store 2.0', () => {
  for (const file of ['layout/theme.liquid', 'config/settings_schema.json',
    'config/settings_data.json', 'templates/index.json', 'assets/theme.css', 'assets/theme.js']) {
    assert.ok(existsSync(join(root, file)), `Ausente: ${file}`);
  }
  assert.match(read('layout/theme.liquid'), /{{\s*content_for_header\s*}}/);
  assert.match(read('layout/theme.liquid'), /{{\s*content_for_layout\s*}}/);
  assert.match(read('layout/theme.liquid'), /<meta name="viewport"/);
  assert.match(read('layout/theme.liquid'), /canonical_url/);
});

test('todos os JSONs são válidos', () => {
  for (const dir of ['templates', 'config', 'locales']) {
    for (const file of files(dir, '.json')) assert.doesNotThrow(() => JSON.parse(read(`${dir}/${file}`)), `${dir}/${file}`);
  }
});

test('templates apontam para seções existentes e sem IDs duplicados', () => {
  for (const file of files('templates', '.json')) {
    const template = JSON.parse(read(`templates/${file}`));
    const refs = Object.entries(template.sections);
    assert.ok(refs.length > 0, `${file} sem seções`);
    assert.equal(new Set(template.order).size, template.order.length, `${file} tem ordem duplicada`);
    for (const [id, section] of refs) {
      assert.ok(template.order.includes(id), `${file}: seção ${id} fora da ordem`);
      assert.ok(existsSync(join(root, 'sections', section.type + '.liquid')), `${file}: seção ${section.type} não existe`);
      for (const blockId of section.block_order ?? []) assert.ok(section.blocks?.[blockId], `Bloco inexistente ${blockId}`);
    }
  }
});

test('schemas de todas as seções são parseáveis e têm nomes', () => {
  for (const file of files('sections', '.liquid')) {
    const text = read(`sections/${file}`);
    const schema = extractSchema(text);
    assert.ok(schema.name, `Seção sem nome: ${file}`);
    for (const setting of schema.settings ?? []) {
      assert.ok(setting.id && setting.type && setting.label, `Campo inválido em ${file}`);
      if (setting.type === 'range') {
        assert.ok(setting.default >= setting.min && setting.default <= setting.max);
        assert.equal((setting.default - setting.min) % setting.step, 0, `Range desalinhado ${file}:${setting.id}`);
      }
    }
  }
});

test('snippets renderizados existem', () => {
  for (const dir of ['sections', 'snippets', 'layout']) {
    for (const file of files(dir, '.liquid')) {
      const body = read(`${dir}/${file}`);
      for (const match of body.matchAll(/{%\s*render\s+'([^']+)'/g)) {
        assert.ok(existsSync(join(root, 'snippets', match[1] + '.liquid')), `${file}: snippet ${match[1]} ausente`);
      }
    }
  }
});

test('carrinho e checkout usam rotas nativas, sem confirmação falsa', () => {
  const product = read('sections/main-product.liquid');
  const cart = read('sections/main-cart.liquid');
  assert.match(product, /form 'product'/);
  assert.match(product, /name="quantity"/);
  assert.match(cart, /routes.cart_url/);
  assert.match(cart, /name="checkout"/);
  assert.match(cart, /name="updates\[\]"/);
  assert.doesNotMatch(cart, /Pagamento aprovado|Pedido confirmado sem/);
});

test('JavaScript válido e melhorias progressivas', () => {
  assert.doesNotThrow(() => execFileSync('node', ['--check', join(root, 'assets/theme.js')], { encoding: 'utf8' }));
  const script = read('assets/theme.js');
  assert.match(script, /data-nav-open/);
  assert.match(script, /data-gallery-thumb/);
  assert.match(script, /data-quantity/);
});

test('tema sem credenciais, produtos comerciais simulados ou marca copiada', () => {
  const allThemeFiles = [
    ...files('sections', '.liquid').map((name) => `sections/${name}`),
    ...files('snippets', '.liquid').map((name) => `snippets/${name}`),
    'layout/theme.liquid', 'assets/theme.js', 'assets/theme.css'
  ];
  for (const file of allThemeFiles) {
    const text = read(file);
    assert.doesNotMatch(text, /xogangbrazil|aloftagencia|sk_live_[A-Za-z0-9]+|shpat_[A-Za-z0-9]+/i, file);
  }
});
