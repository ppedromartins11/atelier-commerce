import Link from 'next/link';
import Header from '@/components/header';
export default function StoreLayout({children}:{children:React.ReactNode}) {
  return <><Header/>{children}<footer className="store-footer"><div className="shell store-footer-top"><div>
    <Link href="/" className="brand">ATELIER<span>.</span></Link>
    <p>Uma experiência de compra que valoriza cada detalhe.</p>
  </div><div className="store-footer-links"><Link href="/catalogo">Todos os produtos</Link>
    <Link href="/sobre">Nossa história</Link><Link href="/contato">Contato</Link><Link href="/carrinho">Carrinho</Link></div>
  </div><div className="shell store-footer-bottom"><small>© {new Date().getFullYear()} Atelier Commerce</small><Link href="/admin/login">Área do lojista</Link></div></footer></>;
}
