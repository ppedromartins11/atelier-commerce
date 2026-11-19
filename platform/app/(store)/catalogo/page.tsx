import Link from 'next/link';
import ProductCard from '@/components/product-card';
import { catalog, categories } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export default async function Catalog({searchParams}:{searchParams:Promise<{busca?:string;categoria?:string}>}) {
  const params = await searchParams;
  const [result, cats] = await Promise.all([catalog(params.busca,params.categoria),categories()]);
  return <main className="shell page"><span className="eyebrow">CATÁLOGO COMPLETO</span><div className="page-heading"><h1>Explore a coleção</h1><p>Encontre a peça certa para você.</p></div>
    <form className="search-form" action="/catalogo"><input type="search" name="busca" placeholder="Buscar produtos por nome" defaultValue={params.busca || ''}/><button className="btn btn-dark" type="submit">Buscar</button></form>
    <div className="category-nav"><Link href="/catalogo" className={!params.categoria?'selected':''}>Todos</Link>{cats.map(c => <Link className={params.categoria === c.id?'selected':''} key={c.id} href={'/catalogo?categoria=' + encodeURIComponent(c.id)}>{c.name}</Link>)}</div>
    {result.products.length ? <div className="products-grid">{result.products.map(p=><ProductCard key={p.id} item={p}/>)}</div> : <div className="empty"><h2>Nenhum produto encontrado</h2><p>O catálogo exibe apenas produtos reais cadastrados e publicados pelo lojista.</p></div>}
  </main>;
}
