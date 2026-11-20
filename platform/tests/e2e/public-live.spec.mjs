import {test,expect} from '@playwright/test';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const privateSlug=process.env.QA_PRIVATE_STORE_SLUG;
const privateId=process.env.QA_PRIVATE_STORE_ID;
test('homepage, catálogo, carrinho, autenticação e bloqueios HTTP',async({page,request})=>{
  for(const path of ['/','/catalogo','/carrinho','/admin/login','/admin/cadastro']){
    const res=await request.get(path,{maxRedirects:0});
    expect(res.status(),path).toBe(200);
  }
  for(const path of ['/admin','/admin/produtos','/admin/estoque','/admin/equipe','/admin/dominios']){
    const res=await request.get(path,{maxRedirects:0});
    expect([302,303,307,308],path).toContain(res.status());
    expect(res.headers()['location']).toContain('/admin/login');
  }
  const response=await request.get('/api/catalog-image/bad-id?index=0');
  expect(response.status()).toBe(400);
  const h=await (await request.get('/api/health')).json();
  expect(h.status).toBe(url&&key?'configured':'setup_required');
  if(privateSlug){
    const hidden=await request.get('/loja/'+privateSlug);
    expect(hidden.status()).toBe(404);
  }
  await page.goto('/admin/login');
  await expect(page.getByRole('heading',{name:'Gerencie sua loja.'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Entrar no painel'})).toBeEnabled({enabled:!!(url&&key)});
});
test('layout desktop/mobile e navegação móvel interativa',async({page})=>{
  for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:768,height:1024}]){
    await page.setViewportSize(viewport);
    for(const path of ['/','/catalogo','/carrinho','/admin/login']){
      await page.goto(path);
      await page.locator('body').waitFor();
      const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));
      expect(dims.scroll,path+' '+viewport.width+'px').toBeLessThanOrEqual(dims.width+2);
    }
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const button=page.getByRole('button',{name:'Abrir menu'});
  await button.click();
  await expect(page.getByRole('button',{name:'Fechar menu'})).toHaveAttribute('aria-expanded','true');
  await expect(page.getByRole('navigation',{name:'Menu móvel'}).getByRole('link',{name:'Produtos'})).toBeVisible();
});
test('Supabase Auth e Data API públicos respondem sem expor dados privados',async({request})=>{
  test.skip(!url||!key,'Requer URL e chave publicável de QA (não secret).');
  const headers={apikey:key};
  const stores=await request.get(url+'/rest/v1/stores?select=id,slug,is_published',{headers});
  expect(stores.status()).toBe(200);
  const rows=await stores.json();
  expect(rows.every(x=>x.is_published===true)).toBe(true);
  if(privateSlug)expect(rows.some(x=>x.slug===privateSlug)).toBe(false);
  const products=await request.get(url+'/rest/v1/products?select=id,store_id,active,archived_at',{headers});
  expect(products.status()).toBe(200);
  const body=await products.json();
  expect(body.every(x=>x.active===true&&!x.archived_at)).toBe(true);
  const badLogin=await request.post(url+'/auth/v1/token?grant_type=password',{
    headers, data:{email:'qa-no-existe@atelier.invalid',password:'senha-invalida'}
  });
  expect(badLogin.status()).toBeGreaterThanOrEqual(400);
  const mutate=await request.post(url+'/rest/v1/rpc/adjust_inventory',{
    headers:{...headers,'Content-Type':'application/json'},
    data:{p_variant_id:'11111111-1111-4111-8111-111111111111',p_delta:1,p_reason:'QA unauthorized'}
  });
  expect(mutate.status()).toBeGreaterThanOrEqual(400);
  if(privateId){
    const list=await request.post(url+'/storage/v1/object/list/catalog-images',{
      headers:{...headers,'Content-Type':'application/json'},
      data:{prefix:privateId+'/',limit:100}
    });
    if(list.ok()){
      const items=await list.json();
      expect(Array.isArray(items)?items:[]).toHaveLength(0);
    } else expect([400,401,403]).toContain(list.status());
  }
});
