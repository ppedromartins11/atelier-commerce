import Link from 'next/link';
import {notFound} from 'next/navigation';
import {publicClient,store} from '@/lib/supabase';
import CartButton from '@/components/cart-button';
import {money} from '@/lib/format';
import type {Item} from '@/lib/catalog';
import {productImageSrc} from '@/lib/catalog-image';
export default async function StoreProduct({slug,tenantSlug,basePath=''}:{slug:string;tenantSlug?:string;basePath?:string}){
 const shop=await store(tenantSlug);
 const db=publicClient();
 if(!shop||!db)notFound();
 const {data:p,error}=await db.from('products').select('id,slug,title,description,price_cents,compare_at_cents,images,product_variants(id,sku,label,stock_on_hand,reserved,active)')
  .eq('store_id',shop.id).eq('slug',slug).eq('active',true).maybeSingle();
 if(error||!p)notFound();
 const item=p as Item;
 const variant=item.product_variants.find(v=>v.active&&v.stock_on_hand-v.reserved>0);
 return <main className="shell page"><div className="breadcrumb"><Link href={basePath+'/catalogo'}>Catálogo</Link> / {item.title}</div>
 <div className="product-layout"><div className="detail-gallery">{item.images?.length?item.images.map((image,i)=><img key={image+i} src={productImageSrc(item.id,image,i)} alt={item.title+' — imagem '+(i+1)}/>):<div className="no-image large">Imagem ainda não cadastrada</div>}</div>
 <div className="detail-information"><span className="eyebrow">PRODUTO</span><h1>{item.title}</h1><strong className="detail-price">{money(item.price_cents)}</strong><p>{item.description||'Detalhes em atualização.'}</p>
 <div className="stock-label">{variant?'Disponível para adicionar ao carrinho':'Produto indisponível'}</div>
 {variant?<CartButton productId={item.id} variantId={variant.id} title={item.title} price={item.price_cents} image={productImageSrc(item.id,item.images?.[0]||'')} stock={variant.stock_on_hand-variant.reserved} tenantSlug={tenantSlug||''}/>:<button className="btn btn-dark" disabled>Indisponível</button>}
 <p className="muted small">O pagamento só estará disponível após a integração e homologação do checkout.</p>
 </div></div></main>;
}
