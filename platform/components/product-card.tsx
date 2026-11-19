import Link from 'next/link';
import { money } from '@/lib/format';
import type { Item } from '@/lib/catalog';
export default function ProductCard({ item,basePath='' }: {item: Item;basePath?:string}) {
  const available = item.product_variants.some(v => v.active && v.stock_on_hand - v.reserved > 0);
  return <Link className="product-card" href={basePath+'/produto/' + item.slug}>
    <div className="product-image">{item.images?.[0] ? <img loading="lazy" alt={item.title} src={item.images[0]} /> : <div className="no-image">Imagem indisponível</div>}</div>
    <div className="product-details"><div><strong>{item.title}</strong><small>{available ? 'Disponível' : 'Esgotado'}</small></div><strong>{money(item.price_cents)}</strong></div>
  </Link>;
}
