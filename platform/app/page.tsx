import Link from 'next/link';
import ProductCard from '@/components/product-card';
import { catalog } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const { shop, products } = await catalog();
  return <main><section className="hero"><div className="shell hero-inner"><div className="hero-copy"><span className="eyebrow">CURADORIA & ESTILO</span><h1>{shop?.hero_title || 'Sua marca, sua vitrine.'}</h1><p>{shop?.hero_text || 'Uma experiência de compra pensada para cada detalhe. Em breve, descubra nossa coleção.'}</p><Link className="btn btn-light" href="/catalogo">Explorar catálogo <span>↗</span></Link></div><div className="hero-art" style={shop?.hero_image_url ? {backgroundImage: 'url(' + shop.hero_image_url + ')'} : undefined}><span>{shop?.name || 'ATELIER'}</span></div></div></section>
  <section className="shell spacing"><div className="section-heading"><div><span className="eyebrow">NOVIDADES</span><h2>Escolhas da coleção</h2></div><Link href="/catalogo" className="text-link">Ver todos os produtos ↗</Link></div>{products.length ? <div className="products-grid">{products.slice(0,8).map(p => <ProductCard key={p.id} item={p}/>)}</div> : <div className="empty"><h3>Novidades em preparação</h3><p>Os produtos aparecerão aqui assim que a loja cadastrar e publicar seu catálogo.</p></div>}</section>
  <section className="editorial"><div className="shell editorial-grid"><span className="eyebrow">NOSSA ESSÊNCIA</span><div><h2>Uma loja com o seu jeito de vender.</h2><p>Peças, coleções e histórias escolhidas para quem busca uma experiência diferente. Cada marca pode configurar produtos, identidade visual e operações no painel.</p></div></div></section></main>;
}
