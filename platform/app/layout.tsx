import type { Metadata } from 'next';
import Header from '@/components/header';
import './globals.css';
export const metadata: Metadata = { title: { default:'Atelier Commerce',template:'%s | Atelier Commerce' },description:'Plataforma brasileira de comércio eletrônico.' };
export default function RootLayout({ children }: Readonly<{children:React.ReactNode}>) {
  return <html lang="pt-BR"><body><Header />{children}<footer><div className="shell footer-content"><div><strong className="brand">ATELIER<span>.</span></strong><p>Comércio eletrônico com identidade própria.</p></div><div><a href="/catalogo">Catálogo</a><a href="/admin">Administração</a><a href="/contato">Contato</a></div><small>© {new Date().getFullYear()} Atelier Commerce</small></div></footer></body></html>;
}
