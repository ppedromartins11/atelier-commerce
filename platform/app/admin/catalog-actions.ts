'use server';

import {randomUUID} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/supabase';
import {slugify,priceToCents,nonNegativeInt} from '@/lib/format';

const BUCKET='catalog-images';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const input=(form:FormData,name:string)=>String(form.get(name)||'').trim();
function fail(id:string,message:string):never {
 redirect('/admin/produtos/'+encodeURIComponent(id)+'?erro='+encodeURIComponent(message));
}
function refresh(slug:string) {
 revalidatePath('/admin/produtos');
 revalidatePath('/admin/estoque');
 revalidatePath('/catalogo');
 revalidatePath('/');
 revalidatePath('/loja/'+slug);
 revalidatePath('/loja/'+slug+'/catalogo');
}
async function context() {
 const a=await requireAdmin();
 if(!a)redirect('/admin/login');
 return a;
}
async function productInStore(id:string) {
 const a=await context();
 if(!UUID.test(id))fail(id,'Produto inválido.');
 const {data,error}=await a.db.from('products')
   .select('id,images,archived_at').eq('id',id).eq('store_id',a.shop.id).maybeSingle();
 if(error||!data)fail(id,'Produto não encontrado nesta loja.');
 return {a,product:data};
}

export async function saveProductDetails(form:FormData) {
 const id=input(form,'product_id');
 const {a,product}=await productInStore(id);
 if(product.archived_at)fail(id,'Restaure o produto antes de editar.');
 const title=input(form,'title');
 const slug=slugify(input(form,'slug')||title);
 if(title.length<3||title.length>180||slug.length<3||slug.length>180)fail(id,'Nome ou endereço inválido.');
 const description=input(form,'description');
 if(description.length>5000)fail(id,'Descrição muito longa.');
 const category_id=input(form,'category_id')||null;
 if(category_id){
  if(!UUID.test(category_id))fail(id,'Categoria inválida.');
  const {data:category,error:catError}=await a.db.from('categories')
    .select('id').eq('store_id',a.shop.id).eq('id',category_id).maybeSingle();
  if(catError||!category)fail(id,'Categoria não encontrada nesta loja.');
 }
 let price_cents:number;
 try {price_cents=priceToCents(input(form,'price'));}catch{fail(id,'Informe um preço válido.');}
 const {data,error}=await a.db.from('products').update({
   title,slug,description,category_id,price_cents,
   active:form.get('active')==='on'
 }).eq('id',id).eq('store_id',a.shop.id).is('archived_at',null).select('id').maybeSingle();
 if(error||!data)fail(id,error?.code==='23505'?'Endereço já usado nesta loja.':'Não foi possível salvar o produto.');
 refresh(a.shop.slug);
 redirect('/admin/produtos/'+id+'?salvo=1');
}

export async function setProductArchive(form:FormData) {
 const id=input(form,'product_id');
 const {a,product}=await productInStore(id);
 const archive=input(form,'archive')==='true';
 if(archive && product.archived_at)fail(id,'Produto já arquivado.');
 if(!archive && !product.archived_at)fail(id,'Produto não está arquivado.');
 const {error}=await a.db.from('products').update({
  archived_at:archive?new Date().toISOString():null,active:false
 }).eq('store_id',a.shop.id).eq('id',id);
 if(error)fail(id,'Não foi possível alterar o arquivamento.');
 refresh(a.shop.slug);
 redirect('/admin/produtos/'+id+'?salvo=1');
}

export async function saveCategoryName(form:FormData) {
 const a=await context();
 const id=input(form,'category_id');
 const name=input(form,'name');
 if(!UUID.test(id)||name.length<2||name.length>100)
  redirect('/admin/produtos?erro='+encodeURIComponent('Nome da categoria inválido.'));
 const {data,error}=await a.db.from('categories').update({name,slug:slugify(name)})
  .eq('store_id',a.shop.id).eq('id',id).select('id').maybeSingle();
 if(error||!data)redirect('/admin/produtos?erro='+encodeURIComponent('Falha ao alterar categoria. Verifique duplicações.'));
 refresh(a.shop.slug);
 redirect('/admin/produtos?salvo=1');
}

export async function removeEmptyCategory(form:FormData) {
 const a=await context();
 const id=input(form,'category_id');
 if(!UUID.test(id))redirect('/admin/produtos?erro='+encodeURIComponent('Categoria inválida.'));
 const {data:existing,error:queryError}=await a.db.from('products')
   .select('id').eq('store_id',a.shop.id).eq('category_id',id).limit(1);
 if(queryError || (existing&&existing.length>0))
   redirect('/admin/produtos?erro='+encodeURIComponent('Desvincule os produtos antes de excluir a categoria.'));
 const {error}=await a.db.from('categories').delete().eq('store_id',a.shop.id).eq('id',id);
 if(error)redirect('/admin/produtos?erro='+encodeURIComponent('Não foi possível excluir a categoria.'));
 refresh(a.shop.slug);
 redirect('/admin/produtos?salvo=1');
}

export async function saveVariant(form:FormData) {
 const productId=input(form,'product_id');
 const {a,product}=await productInStore(productId);
 if(product.archived_at)fail(productId,'Restaure o produto para editar suas variantes.');
 const variantId=input(form,'variant_id')||null;
 if(variantId && !UUID.test(variantId))fail(productId,'Variante inválida.');
 const sku=input(form,'sku');
 const label=input(form,'label');
 const barcode=input(form,'barcode');
 const color=input(form,'color');
 const size=input(form,'size');
 if(sku.length<2||sku.length>80||label.length<1||label.length>80
    ||barcode.length>80||color.length>80||size.length>80)
    fail(productId,'Revise os dados da variante.');
 const attributes:Record<string,string>={};
 if(color)attributes.color=color;
 if(size)attributes.size=size;
 let stock=0;
 try{stock=nonNegativeInt(input(form,'initial_stock')||'0','Estoque');}catch{fail(productId,'Estoque inválido.');}
 if(stock>500000||variantId&&stock!==0)fail(productId,'Altere o saldo existente somente em Estoque.');
 const {error}=await a.db.rpc('save_product_variant',{
  p_store_id:a.shop.id,p_product_id:productId,p_variant_id:variantId,
  p_sku:sku,p_label:label,p_barcode:barcode,p_attributes:attributes,p_initial_stock:stock
 });
 if(error)fail(productId,error.code==='23505'?'SKU já cadastrado nesta loja.':'Não foi possível salvar a variante.');
 refresh(a.shop.slug);
 redirect('/admin/produtos/'+productId+'?salvo=1');
}

export async function uploadProductImage(form:FormData) {
 const id=input(form,'product_id');
 const {a,product}=await productInStore(id);
 if(product.archived_at)fail(id,'Restaure o produto para adicionar imagens.');
 if(product.images.length>=8)fail(id,'Limite de 8 imagens por produto.');
 const file=form.get('file');
 if(!(file instanceof File)||file.size===0||file.size>5242880)
   fail(id,'Escolha uma imagem de até 5 MB.');
 const types:Record<string,{ext:string;magic:(buf:Uint8Array)=>boolean}>={
  'image/jpeg':{ext:'jpg',magic:b=>b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},
  'image/png':{ext:'png',magic:b=>b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47},
  'image/webp':{ext:'webp',magic:b=>String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP'}
 };
 const kind=types[file.type];
 if(!kind)fail(id,'Formato não permitido: use JPG, PNG ou WebP.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!kind.magic(bytes))fail(id,'O arquivo não corresponde a uma imagem válida.');
 const path=a.shop.id+'/'+id+'/'+randomUUID()+'.'+kind.ext;
 const {error:uploadError}=await a.db.storage.from(BUCKET).upload(path,bytes,{
   contentType:file.type,upsert:false,cacheControl:'3600'
 });
 if(uploadError)fail(id,'Não foi possível enviar a imagem ao armazenamento.');
 const {error:linkError}=await a.db.rpc('attach_catalog_image',{
   p_store_id:a.shop.id,p_product_id:id,p_path:path
 });
 if(linkError) {
   await a.db.storage.from(BUCKET).remove([path]);
   fail(id,'Imagem enviada, mas não vinculada ao produto. Tente novamente.');
 }
 refresh(a.shop.slug);
 redirect('/admin/produtos/'+id+'?salvo=1');
}

export async function removeProductImage(form:FormData) {
 const id=input(form,'product_id');
 const {a,product}=await productInStore(id);
 const path=input(form,'image_path');
 if(!product.images.includes(path))fail(id,'Imagem não associada a este produto.');
 const {error}=await a.db.rpc('detach_catalog_image',{
  p_store_id:a.shop.id,p_product_id:id,p_path:path
 });
 if(error)fail(id,'Não foi possível desvincular a imagem.');
 if(path.startsWith(a.shop.id+'/'+id+'/')){
  const {error:storageError}=await a.db.storage.from(BUCKET).remove([path]);
  if(storageError) {
   refresh(a.shop.slug);
   redirect('/admin/produtos/'+id+'?erro='+encodeURIComponent('Imagem retirada do catálogo; limpeza do arquivo pendente.'));
  }
 }
 refresh(a.shop.slug);
 redirect('/admin/produtos/'+id+'?salvo=1');
}
