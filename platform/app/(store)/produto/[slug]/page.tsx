import Link from 'next/link';
import { notFound } from 'next/navigation';
import CartButton from '@/components/cart-button';
import { money } from '@/lib/format';
import { catalog } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export default async function ProductPage({params}:{params:Promise<{slug:string}>}) {
  const {slug} = await params;
  const {products} = await catalog();
  const p = products.find(x=>x.slug === slug);
  if (!p) notFound();
  const variant = p.product_variants.find(v=>v.active && v.stock_on_hand - v.reserved > 0);
  return <main className="shell page"><div className="breadcrumb"><Link href="/catalogo">Catálogo</Link> / {p.title}</div><div className="product-layout"><div className="detail-gallery">{p.images?.length ? p.images.map((img,i)=><img key={img+i} src={img} alt={p.title+' — imagem '+(i+1)}/>) : <div className="no-image large">Imagem ainda não cadastrada</div>}</div><div className="detail-information"><span className="eyebrow">PRODUTO</span><h1>{p.title}</h1><strong className="detail-price">{money(p.price_cents)}</strong><p>{p.description || 'Detalhes deste produto em atualização.'}</p><div className="stock-label">{variant ? 'Disponível para adicionar ao carrinho' : 'Produto indisponível'}</div>{variant ? <CartButton productId={p.id} variantId={variant.id} title={p.title} price={p.price_cents} image={p.images?.[0] || ''} stock={variant.stock_on_hand-variant.reserved}/> : <button className="btn btn-dark" disabled>Indisponível</button>}<p className="muted small">A compra somente será finalizada após ativação dos meios de pagamento e cálculo de frete.</p></div></div></main>;
}
