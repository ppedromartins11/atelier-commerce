import Link from 'next/link';
import {store} from '@/lib/supabase';
import MobileMenu from '@/components/mobile-menu';
export default async function Header(){
 const shop=await store();
 return <><div className="store-bar">ATELIER COMMERCE · EXPLORE A COLEÇÃO</div>
  <header className="site-header"><div className="shell store-header-inner">
  <div className="store-header-left"><MobileMenu/><Link href="/" className="brand">{shop?.name || 'ATELIER'}<span>.</span></Link></div>
  <nav className="store-desktop-nav" aria-label="Navegação principal"><Link href="/">Início</Link><Link href="/catalogo">Produtos</Link><Link href="/sobre">Sobre a marca</Link><Link href="/contato">Contato</Link></nav>
  <Link className="store-cart-link" href="/carrinho" aria-label="Ver carrinho">Carrinho <span aria-hidden="true">↗</span></Link></div></header></>;
}
