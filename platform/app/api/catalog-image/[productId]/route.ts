import {NextRequest,NextResponse} from 'next/server';
import {sessionClient} from '@/lib/supabase';
import {productImageSrc} from '@/lib/catalog-image';
export const dynamic='force-dynamic';
export const runtime='nodejs';

export async function GET(request:NextRequest,{params}:{params:Promise<{productId:string}>}) {
 const {productId}=await params;
 const indexText=request.nextUrl.searchParams.get('index')||'0';
 if(!/^(?:[0-7])$/.test(indexText)||!/^[0-9a-f-]{36}$/i.test(productId))
   return new NextResponse('Imagem inválida',{status:400});
 const index=Number(indexText);
 const db=await sessionClient();
 if(!db)return new NextResponse('Serviço indisponível',{status:503});
 // The SELECT is subject to normal product RLS: drafts require store membership.
 const {data:product,error}=await db.from('products').select('images')
   .eq('id',productId).maybeSingle();
 if(error||!product || !product.images?.[index])
   return new NextResponse('Imagem não encontrada',{status:404});
 const path=product.images[index];
 if(!productImageSrc(productId,path,index))
   return new NextResponse('Imagem inválida',{status:404});
 if(path.startsWith('https://')) {
  return NextResponse.redirect(path,{status:302,headers:{'Cache-Control':'private, no-store'}});
 }
 const {data,error:signError}=await db.storage.from('catalog-images').createSignedUrl(path,60);
 if(signError||!data?.signedUrl)return new NextResponse('Imagem não disponível',{status:404});
 return NextResponse.redirect(data.signedUrl,{
   status:302,
   headers:{'Cache-Control':'private, no-store'}
 });
}
