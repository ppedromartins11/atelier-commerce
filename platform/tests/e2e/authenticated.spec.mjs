import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';

// This QA suite never runs mutations against unknown Supabase projects.
const ref='pnfixgdfnzphrygtfmsd';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'';
const secret=process.env.QA_SUPABASE_SERVICE_ROLE_KEY||'';
const domain=process.env.QA_E2E_EMAIL_DOMAIN||'';
const enabled=process.env.QA_E2E_ALLOW_MUTATIONS==='enabled'
 && url==='https://'+ref+'.supabase.co' && !!publishableKey && !!secret
 && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain);
const id=()=>randomBytes(6).toString('hex');
const onePixelPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');

async function login(page,user){
 await page.goto('/admin/login');
 await page.locator('input[name=email]').fill(user.email);
 await page.locator('input[name=password]').fill(user.password);
 await page.getByRole('button',{name:'Entrar no painel'}).click();
 await expect(page).toHaveURL(/\/admin\/lojas(?:\?|$)/);
}
async function registerStore(page,admin,slug){
 await page.goto('/admin/lojas/nova');
 await page.locator('input[name=name]').fill('QA Atelier '+slug);
 await page.locator('input[name=slug]').fill(slug);
 await page.getByRole('button',{name:'Criar loja e acessar painel'}).click();
 await expect(page).toHaveURL(/\/admin(?:\?|$)/);
 const {data,error}=await admin.from('stores').select('id,slug')
   .eq('slug',slug).single();
 if(error||!data)throw new Error('QA store not created by browser');
 return data;
}
async function cleanup(admin,userIds){
 if(!userIds.length)return;
 const {data:shops,error:fetchError}=await admin.from('stores').select('id').in('owner_user_id',userIds);
 if(fetchError)throw fetchError;
 const shopIds=(shops||[]).map(s=>s.id);
 if(shopIds.length){
  const {data:products,error:productError}=await admin.from('products').select('images').in('store_id',shopIds);
  if(productError)throw productError;
  const paths=(products||[]).flatMap(p=>p.images||[])
    .filter(x=>/^[0-9a-f-]{36}\/[0-9a-f-]{36}\//i.test(x));
  if(paths.length){
   const {error}=await admin.storage.from('catalog-images').remove(paths);
   if(error)throw error;
  }
  const {error}=await admin.from('stores').delete().in('id',shopIds);
  if(error)throw error;
 }
 for(const userId of userIds){
  const {error}=await admin.auth.admin.deleteUser(userId);
  if(error)throw error;
 }
}

test('duas contas Auth: lojas, catálogo, mídia, estoque, CSV e convites',async({browser})=>{
 test.skip(!enabled,'Pendente: QA_SERVICE_ROLE_KEY em segredo, domínio QA autorizado e QA_E2E_ALLOW_MUTATIONS=enabled.');
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const run=id(),accounts=[];
 const contextA=await browser.newContext({viewport:{width:1280,height:900}});
 const contextB=await browser.newContext({viewport:{width:390,height:844},isMobile:true});
 const visitorContext=await browser.newContext();
 const pageA=await contextA.newPage(),pageB=await contextB.newPage();
 const visitor=await visitorContext.newPage();
 let cleanupFailure;
 try{
  // Admin Auth API provisions disposable confirmed test users. No emails are sent.
  for(const suffix of ['a','b']){
   const email='qa-'+run+'-'+suffix+'@'+domain;
   const password='Qa!'+randomBytes(24).toString('base64url')+'z9';
   const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
   if(error||!data.user)throw new Error('QA Auth user bootstrap failed: '+(error?.message||'missing user'));
   accounts.push({id:data.user.id,email,password});
  }
  const [userA,userB]=accounts;
  const slugA='qa-'+run+'-a',slugB='qa-'+run+'-b';
  await login(pageA,userA);
  const shopA=await registerStore(pageA,admin,slugA);
  await login(pageB,userB);
  await registerStore(pageB,admin,slugB);

  // Owner A creates a category and active product with real stock.
  await pageA.goto('/admin/produtos');
  const categoryForm=pageA.locator('form.search-form').filter({has:pageA.locator('input[name=name]')});
  await categoryForm.locator('input[name=name]').fill('QA Camisetas');
  await categoryForm.getByRole('button',{name:'Criar categoria'}).click();
  await expect(pageA.getByText('QA Camisetas').first()).toBeVisible();
  const title='Camiseta QA '+run,sku='QA-'+run+'-M';
  const productForm=pageA.locator('form').filter({has:pageA.locator('input[name=sku]')}).first();
  await productForm.locator('input[name=title]').fill(title);
  await productForm.locator('input[name=sku]').fill(sku);
  await productForm.locator('input[name=price]').fill('29.90');
  await productForm.locator('input[name=stock]').fill('5');
  await productForm.locator('select[name=category_id]').selectOption({label:'QA Camisetas'});
  await productForm.locator('input[name=active]').check();
  await productForm.getByRole('button',{name:'Cadastrar produto'}).click();
  await expect(pageA.locator('tbody tr').filter({hasText:title})).toBeVisible();
  const {data:product,error:productError}=await admin.from('products')
    .select('id,store_id').eq('store_id',shopA.id).eq('title',title).single();
  if(productError||!product)throw new Error('Product did not persist');
  const productId=product.id;
  const variant=await admin.from('product_variants').select('id,stock_on_hand')
    .eq('product_id',productId).eq('sku',sku).single();
  if(variant.error||variant.data?.stock_on_hand!==5)throw new Error('Initial stock was not created');

  // Another real Auth session may not view draft tenant A or mutate its inventory.
  await pageB.goto('/admin/produtos');
  await expect(pageB.locator('tbody tr').filter({hasText:title})).toHaveCount(0);
  const forbidden=await pageB.goto('/admin/produtos/'+productId);
  expect(forbidden?.status()).toBe(404);
  const bApi=createClient(url,publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const loginResult=await bApi.auth.signInWithPassword({email:userB.email,password:userB.password});
  if(loginResult.error)throw loginResult.error;
  const foreign=await bApi.from('products').select('id').eq('id',productId);
  expect(foreign.data||[]).toHaveLength(0);
  const illegal=await bApi.rpc('adjust_inventory',{
   p_variant_id:variant.data.id,p_delta:1,p_reason:'QA unauthorized'
  });
  expect(illegal.error).toBeTruthy();

  // A edits SKU, uploads a real PNG and verifies that the browser can display it.
  await pageA.goto('/admin/produtos/'+productId);
  const newVariant=pageA.locator('form.variant-editor').last();
  await newVariant.locator('input[name=sku]').fill('QA-'+run+'-G');
  await newVariant.locator('input[name=label]').fill('Grande');
  await newVariant.locator('input[name=color]').fill('Preto');
  await newVariant.locator('input[name=size]').fill('G');
  await newVariant.locator('input[name=initial_stock]').fill('3');
  await newVariant.getByRole('button',{name:'Adicionar SKU'}).click();
  await expect(pageA.getByText('Grande').first()).toBeVisible();
  await pageA.locator('input[name=file][accept*=image]').setInputFiles({
   name:'qa.png',mimeType:'image/png',buffer:onePixelPng
  });
  await pageA.getByRole('button',{name:'Adicionar imagem'}).click();
  await expect(pageA.locator('.product-media img')).toHaveCount(1);
  const imageWidth=await pageA.locator('.product-media img').first().evaluate(async(img)=>{
   if(!img.complete)await new Promise(resolve=>{
    img.addEventListener('load',resolve,{once:true});
    img.addEventListener('error',resolve,{once:true});
   });
   return img.naturalWidth;
  });
  expect(imageWidth).toBeGreaterThan(0);
  await pageA.getByRole('button',{name:'Remover imagem'}).click();
  await expect(pageA.locator('.product-media img')).toHaveCount(0);

  // A updates low-stock threshold, records entry and reconciles a physical count.
  await pageA.goto('/admin/estoque');
  const row=()=>pageA.locator('table.admin-table').first().locator('tbody tr').filter({hasText:sku}).first();
  await row().locator('input[name=reorder_point]').fill('6');
  await row().getByRole('button',{name:'Salvar limite'}).click();
  await expect(row()).toContainText('Estoque baixo');
  await row().locator('details').first().locator('summary').click();
  await row().locator('input[name=delta]').fill('2');
  await row().locator('details').first().locator('input[name=reason]').fill('QA reposição');
  await row().getByRole('button',{name:'Registrar ajuste'}).click();
  await row().locator('details').nth(1).locator('summary').click();
  await row().locator('input[name=counted_quantity]').fill('6');
  await row().locator('details').nth(1).locator('input[name=reason]').fill('QA conferência');
  await row().getByRole('button',{name:'Confirmar contagem'}).click();
  await expect(pageA.getByText('QA conferência')).toBeVisible();

  // Import via the actual administrative form (one extra draft).
  await pageA.goto('/admin/produtos');
  const csv='title;sku;price;stock;description;category_slug\n'
   +'QA Importado '+run+';QA-'+run+'-CSV;15,90;2;Item QA;qa-camisetas';
  await pageA.locator('input[type=file][accept*=csv]').setInputFiles({
   name:'qa-import.csv',mimeType:'text/csv',buffer:Buffer.from(csv)
  });
  await pageA.getByRole('button',{name:'Importar produtos'}).click();
  await expect(pageA.getByText('1 produtos importados como rascunho.')).toBeVisible();

  // Publishing is owner-only; guest sees the live storefront, not drafts.
  await visitor.goto('/loja/'+slugA);
  await expect(visitor.getByText(title)).toHaveCount(0);
  await pageA.goto('/admin/lojas');
  await pageA.locator('.merchant-shop-card').filter({hasText:slugA})
    .getByRole('button',{name:'Publicar vitrine'}).click();
  await visitor.goto('/loja/'+slugA+'/catalogo');
  await expect(visitor.getByText(title).first()).toBeVisible();

  // Invitation, acceptance, non-owner restrictions and revocation.
  await pageA.goto('/admin/equipe');
  await pageA.locator('input[name=email]').fill(userB.email);
  await pageA.getByRole('button',{name:'Registrar convite'}).click();
  await pageB.goto('/admin/convites');
  await pageB.getByRole('button',{name:'Aceitar convite e acessar'}).click();
  await expect(pageB).toHaveURL(/\/admin(?:\?|$)/);
  await pageB.goto('/admin/produtos');
  await expect(pageB.locator('tbody tr').filter({hasText:title})).toBeVisible();
  await pageB.goto('/admin/configuracoes');
  await expect(pageB).toHaveURL(/\/admin(?:\?|$)/);
  await pageA.goto('/admin/equipe');
  await pageA.getByRole('button',{name:'Remover acesso'}).click();
  await pageB.goto('/admin/produtos');
  await expect(pageB.locator('tbody tr').filter({hasText:title})).toHaveCount(0);

  // Owner-only domain proposal and removal.
  await pageA.goto('/admin/dominios');
  const hostname='qa-'+run+'.test';
  await pageA.locator('input[name=hostname]').fill(hostname);
  await pageA.getByRole('button',{name:'Registrar solicitação'}).click();
  await expect(pageA.getByText(hostname)).toBeVisible();
  await pageA.getByRole('button',{name:'Remover solicitação'}).click();

  await pageA.goto('/admin/produtos/'+productId);
  await pageA.getByRole('button',{name:'Arquivar produto'}).click();
  await visitor.goto('/loja/'+slugA+'/catalogo');
  await expect(visitor.getByText(title)).toHaveCount(0);
  await pageA.goto('/admin/produtos/'+productId);
  await pageA.getByRole('button',{name:'Restaurar como rascunho'}).click();
  await visitor.goto('/loja/'+slugA+'/catalogo');
  await expect(visitor.getByText(title)).toHaveCount(0);
  await pageB.goto('/admin/estoque');
  const size=await pageB.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
  expect(size.scroll).toBeLessThanOrEqual(size.width+2);
 }finally{
  await Promise.allSettled([contextA.close(),contextB.close(),visitorContext.close()]);
  try{await cleanup(admin,accounts.map(a=>a.id));}
  catch(error){cleanupFailure=error;console.error('QA cleanup failed. Only disposable QA accounts/stores may be removed:',error.message);}
  if(cleanupFailure)throw cleanupFailure;
 }
});
