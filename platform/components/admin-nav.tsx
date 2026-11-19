import Link from 'next/link';
import { signOut } from '@/app/admin/actions';
export default function AdminNav({children}:{children:React.ReactNode}) {
  return <main className="admin-shell"><div className="shell admin-container">
    <aside className="admin-sidebar"><strong>GESTÃO DA LOJA</strong>
      <Link href="/admin">Visão geral</Link><Link href="/admin/produtos">Produtos</Link>
      <Link href="/admin/estoque">Estoque</Link><Link href="/admin/pedidos">Pedidos</Link>
      <Link href="/admin/fiscal">Notas fiscais</Link><Link href="/admin/configuracoes">Configurações</Link>
      <form action={signOut}><button type="submit">Sair da conta</button></form>
    </aside><div>{children}</div>
  </div></main>;
}
