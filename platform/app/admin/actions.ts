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
  const slug=slugify(title);
  const category=read(form,'category_id')||null;
  const {data:product,error}=await db.from('products').insert({
    store_id:shop.id,title,slug,description:read(form,'description').slice(0,5000),
    images:image?[image]:[],price_cents:price,category_id:category,active:form.get('active')==='on'
  }).select('id').single();
  if(error||!product)fail('Não foi possível criar o produto: '+(error?.message||'erro desconhecido'));
  const {data:variant,error:variantError}=await db.from('product_variants').insert({
    store_id:shop.id,product_id:product.id,sku,label:'Padrão',stock_on_hand:stock
  }).select('id').single();
  if(variantError||!variant){
    await db.from('products').delete().eq('id',product.id).eq('store_id',shop.id);
    fail('Não foi possível cadastrar SKU/estoque: '+(variantError?.message||'erro desconhecido'));
  }
  if(stock>0){
    const {error:movementError}=await db.from('stock_movements').insert({
      store_id:shop.id,variant_id:variant.id,delta:stock,reason:'Estoque inicial do produto',actor_user_id:(await db.auth.getUser()).data.user?.id
    });
    if(movementError)fail('Produto criado, mas histórico de estoque inicial indisponível: '+movementError.message);
  }
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
  const {db,shop}=await access();
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
