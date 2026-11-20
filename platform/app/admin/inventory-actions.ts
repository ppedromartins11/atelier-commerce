'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/supabase';
import {nonNegativeInt} from '@/lib/format';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const field=(form:FormData,name:string)=>String(form.get(name)||'').trim();
function fail(message:string):never {
 redirect('/admin/estoque?erro='+encodeURIComponent(message));
}
async function authorized() {
 const context=await requireAdmin();
 if(!context)redirect('/admin/login?erro=acesso');
 return context;
}
function invalidate(slug:string) {
 revalidatePath('/admin/estoque');
 revalidatePath('/admin/produtos');
 revalidatePath('/admin');
 revalidatePath('/catalogo');
 revalidatePath('/loja/'+slug);
 revalidatePath('/loja/'+slug+'/catalogo');
}

export async function setReorderPoint(form:FormData) {
 const {db,shop}=await authorized();
 const variantId=field(form,'variant_id');
 if(!UUID.test(variantId))fail('SKU inválido.');
 let point:number;
 try{point=nonNegativeInt(field(form,'reorder_point'),'Limite de reposição');}
 catch{fail('Informe um limite mínimo inteiro e não negativo.');}
 if(point>500000)fail('O limite máximo é 500.000.');
 const {error}=await db.rpc('set_inventory_reorder_point',{
  p_variant_id:variantId,p_reorder_point:point
 });
 if(error)fail('Não foi possível alterar o limite. Confira as permissões da loja.');
 invalidate(shop.slug);
 redirect('/admin/estoque?salvo=1');
}

export async function reconcilePhysicalCount(form:FormData) {
 const {db,shop}=await authorized();
 const variantId=field(form,'variant_id');
 if(!UUID.test(variantId))fail('SKU inválido.');
 let counted:number;
 try{counted=nonNegativeInt(field(form,'counted_quantity'),'Contagem física');}
 catch{fail('Informe a quantidade efetivamente contada.');}
 if(counted>500000)fail('A contagem máxima é 500.000 unidades.');
 const reason=field(form,'reason');
 if(reason.length<3||reason.length>260)fail('Informe um motivo entre 3 e 260 caracteres.');
 const {error}=await db.rpc('reconcile_inventory_count',{
  p_variant_id:variantId,p_counted_quantity:counted,p_reason:reason
 });
 if(error)fail('Contagem não aplicada. Confira o SKU, o estoque reservado e suas permissões.');
 invalidate(shop.slug);
 redirect('/admin/estoque?salvo=1');
}
