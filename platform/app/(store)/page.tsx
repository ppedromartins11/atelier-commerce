import Link from 'next/link';
import ProductCard from '@/components/product-card';
import {catalog,categories} from '@/lib/catalog';
export const dynamic='force-dynamic';
export default async function Home() {
 const [result,cats]=await Promise.all([catalog(),categories()]);
 const {shop,products}=result;
 return <main>
 <section className="store-hero" style={shop?.hero_image_url?{backgroundImage:"linear-gradient(90deg,rgba(12,14,12,.88),rgba(12,14,12,.25)),url("+JSON.stringify(shop.hero_image_url).slice(1,-1)+")"}:undefined}>
 <div className="shell store-hero-content"><span className="store-overline">UMA NOVA EXPERIÊNCIA</span>
 <h1>{shop?.hero_title || <>SEU ESTILO.<br/>SUA ESCOLHA.</>}</h1>
 <p>{shop?.hero_text || 'Descubra uma experiência de compra criada para quem valoriza personalidade e bons detalhes.'}</p>
 <Link href="/catalogo" className="store-hero-button">Explorar catálogo <span aria-hidden="true">↗</span></Link></div>
 </section>
 <section className="shell store-section" id="catalogo">
   <div className="store-section-heading"><div><span className="store-overline dark">NOVIDADES</span><h2>Seleção da loja</h2></div><Link className="text-link" href="/catalogo">Ver catálogo completo ↗</Link></div>
   {products.length ? <div className="products-grid">{products.slice(0,8).map(item=><ProductCard key={item.id} item={item}/>)}</div> : <div className="store-empty"><strong>O catálogo está sendo preparado.</strong><p>Os produtos aparecerão aqui quando a loja publicar seus primeiros itens.</p><Link href="/catalogo" className="text-link">Acessar catálogo ↗</Link></div>}
 </section>
 {cats.length>0 && <section className="store-categories"><div className="shell store-section">
   <div className="store-section-heading"><div><span className="store-overline dark">EXPLORE</span><h2>Encontre sua categoria</h2></div></div>
   <div className="store-category-grid">{cats.slice(0,6).map((cat,index)=><Link href={'/catalogo?categoria='+encodeURIComponent(cat.id)} key={cat.id} className="store-category"><span>0{index+1} / CATEGORIA</span><strong>{cat.name}</strong><span aria-hidden="true" className="store-category-arrow">↗</span></Link>)}</div>
 </div></section>}
 <section className="store-campaign"><div className="shell store-campaign-grid"><div className="store-campaign-art"><span>ATELIER</span><b>AC.</b></div><div className="store-campaign-copy"><span className="store-overline dark">NOSSA ESSÊNCIA</span><h2>Mais do que uma compra, uma experiência.</h2><p>{shop?.description || 'Um espaço para marcas que valorizam uma apresentação cuidadosa, produtos selecionados e uma navegação simples.'}</p><Link className="btn btn-dark" href="/sobre">Conheça nossa história ↗</Link></div></div></section>
 <section className="shell store-section"><div className="store-features">
  <div><span>01 /</span><h3>Escolha com tranquilidade</h3><p>Explore fotos, descrições e variações cadastradas pela loja.</p></div>
  <div><span>02 /</span><h3>Informações transparentes</h3><p>Consulte os dados dos produtos e a disponibilidade indicada.</p></div>
  <div><span>03 /</span><h3>Atendimento direto</h3><p>Encontre os canais de contato disponibilizados pela marca.</p></div>
 </div></section></main>;
}
