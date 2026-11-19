import Link from 'next/link';
import { store } from '@/lib/supabase';
export default async function Header() {
  const shop = await store();
  return <><div className="announcement">Uma plataforma pronta para sua próxima loja</div><header className="site-header">
    <div className="shell header-inner">
      <Link href="/" className="brand">{shop?.name || 'ATELIER'}<span>.</span></Link>
      <nav aria-label="Navegação principal"><Link href="/catalogo">Catálogo</Link><Link href="/sobre">Sobre a loja</Link><Link href="/contato">Contato</Link></nav>
      <Link className="cart-link" href="/carrinho" aria-label="Abrir carrinho">Carrinho <span aria-hidden="true">↗</span></Link>
    </div>
  </header></>;
}
