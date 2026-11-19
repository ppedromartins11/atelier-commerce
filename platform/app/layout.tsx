import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: {default:'Atelier Commerce',template:'%s | Atelier Commerce'},
  description:'Loja virtual com identidade própria e catálogo de produtos.'
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
