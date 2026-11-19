import Link from 'next/link';
import {store} from '@/lib/supabase';
import MobileMenu from '@/components/mobile-menu';
export default async function Header({tenantSlug,basePath=''}:{tenantSlug?:string;basePath?:string}={}){
 const shop=await store(tenantSlug);
 return <><div className="store-bar">{shop?.name||'ATELIER COMMERCE'} · EXPLORE A COLEÇÃO</div>
 <header className="site-header"><div className="shell store-header-inner">
 <div className="store-header-left"><MobileMenu basePath={basePath}/><Link href={basePath||'/'} className="brand">{shop?.name||'ATELIER'}<span>.</span></Link></div>
 <nav className="store-desktop-nav" aria-label="Navegação principal"><Link href={basePath||'/'}>Início</Link><Link href={basePath+'/catalogo'}>Produtos</Link><Link href={basePath+'/sobre'}>Sobre a marca</Link><Link href={basePath+'/contato'}>Contato</Link></nav>
 <Link className="store-cart-link" href={basePath+'/carrinho'} aria-label="Ver carrinho">Carrinho <span aria-hidden="true">↗</span></Link>
 </div></header></>;
}
