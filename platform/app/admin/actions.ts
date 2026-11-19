'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin, sessionClient, clearStoreCookie } from '@/lib/supabase';
import { slugify, priceToCents, nonNegativeInt } from '@/lib/format';
function read(form:FormData,key:string){return String(form.get(key)||'').trim();}
function fail(message:string, destination='/admin/produtos'):never{redirect(destination+'?erro='+encodeURIComponent(message));}
async function access(){
  const context = await requireAdmin();
  if (!context) redirect('/admin/login?erro=acesso');
  return context;
}
export async function signIn(form:FormData){
  const db=await sessionClient();
  if(!db) redirect('/admin/login?erro=config');
  const email=read(form,'email');
  const password=read(form,'password');
  if(!email||!password) redirect('/admin/login?erro=dados');
  const { error }=await db.auth.signInWithPassword({email,password});
  if(error) redirect('/admin/login?erro=credenciais');
  redirect('/admin/lojas');
}
export async function signOut(){
  const db=await sessionClient();
  if(db)await db.auth.signOut();
  await clearStoreCookie();
  redirect('/admin/login');
}
export async function createCategory(form:FormData){
  const {db,shop}=await access();
  const name=read(form,'name').slice(0,100);
  if(name.length<2)fail('Informe uma categoria válida.');
  const slug=slugify(name);
  const {error}=await db.from('categories').insert({store_id:shop.id,name,slug});
  if(error)fail('Não foi possível cadastrar a categoria: '+error.message);
  revalidatePath('/admin/produtos');
  revalidatePath('/catalogo');
  redirect('/admin/produtos');
}
export async function createProduct(form:FormData){
  const {db,shop}=await access();
  const title=read(form,'title').slice(0,180);
  if(title.length<3)fail('Informe o nome do produto.');
  const sku=read(form,'sku').slice(0,80);
  if(sku.length<2)fail('Informe um SKU único.');
  const image=read(form,'image');
  if(image && (!image.startsWith('https://')||image.length>2000))fail('Informe uma URL HTTPS de imagem.');
  let price:number,stock:number;
  try{price=priceToCents(read(form,'price'));stock=nonNegativeInt(read(form,'stock'),'Estoque');}catch(e){fail((e as Error).message);}
  if(stock>500000)fail('Estoque inicial deve ser de até 500.000 unidades.');
  const slug=slugify(title);
  if(slug.length<3)fail('Informe um nome de produto com letras ou números suficientes.');
  const category=read(form,'category_id')||null;
  const {error}=await db.rpc('create_product_with_initial_stock',{
    p_store_id:shop.id,p_title:title,p_slug:slug,
    p_description:read(form,'description').slice(0,5000),p_image_url:image||null,
    p_price_cents:price,p_category_id:category,p_sku:sku,p_stock:stock,
    p_active:form.get('active')==='on'
  });
  if(error)fail(error.code==='23505'
    ?'Já existe um produto com esse nome ou SKU nesta loja.'
    :error.code==='23503'
      ?'A categoria selecionada não pertence a esta loja ou foi removida.'
      :'Cadastro indisponível. Verifique os dados, a conexão e a migração de catálogo.');
  revalidatePath('/');
  revalidatePath('/catalogo');
  revalidatePath('/admin');
  redirect('/admin/produtos');
}
export async function toggleProduct(form:FormData){
  const {db,shop}=await access();
  const id=read(form,'id');
  const active=read(form,'active')==='true';
  const {error}=await db.from('products').update({active}).eq('id',id).eq('store_id',shop.id);
  if(error)fail('Não foi possível alterar o produto: '+error.message);
  revalidatePath('/');
  revalidatePath('/catalogo');
  redirect('/admin/produtos');
}
export async function adjustStock(form:FormData){
  const {db}=await access();
  const variantId=read(form,'variant_id');
  const delta=Number(read(form,'delta'));
  if(!Number.isSafeInteger(delta)||delta===0||Math.abs(delta)>500000)fail('Ajuste inválido.','/admin/estoque');
  const reason=read(form,'reason');
  if(reason.length<3||reason.length>300)fail('Informe um motivo com pelo menos 3 caracteres.','/admin/estoque');
  const {error}=await db.rpc('adjust_inventory',{p_variant_id:variantId,p_delta:delta,p_reason:reason});
  if(error)fail('Movimentação não aplicada: '+error.message,'/admin/estoque');
  revalidatePath('/admin/estoque'); revalidatePath('/admin'); revalidatePath('/catalogo');
  redirect('/admin/estoque');
}
export async function updateSettings(form:FormData){
  const {db,shop,role}=await access();
  if(role!=='owner')fail('Somente o proprietário pode alterar a identidade da loja.','/admin/lojas');
  const name=read(form,'name').slice(0,160);
  if(name.length<2)fail('Nome inválido.','/admin/configuracoes');
  const hero_image_url=read(form,'hero_image_url');
  if(hero_image_url&&(!hero_image_url.startsWith('https://')||hero_image_url.length>2000))fail('Use uma URL HTTPS para a imagem.','/admin/configuracoes');
  const {error}=await db.from('stores').update({
    name,hero_title:read(form,'hero_title').slice(0,160),
    hero_text:read(form,'hero_text').slice(0,1000),
    hero_image_url:hero_image_url||null, description:read(form,'description').slice(0,1000)
  }).eq('id',shop.id);
  if(error)fail('Não foi possível salvar: '+error.message,'/admin/configuracoes');
  revalidatePath('/');
  redirect('/admin/configuracoes?salvo=1');
}
