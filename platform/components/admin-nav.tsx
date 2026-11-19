import Link from 'next/link';
import {signOut} from '@/app/admin/actions';
import {requireAdmin} from '@/lib/supabase';
export default async function AdminNav({children}:{children:React.ReactNode}) {
  const context=await requireAdmin();
  const name=context?.shop.name||'Administração';
  return <main className="admin-shell"><div className="shell admin-container">
    <aside className="admin-sidebar">
      <div className="admin-brand-label"><small>ATELIER · GESTÃO</small><strong>{name}</strong></div>
      <Link href="/admin">Visão geral</Link>
      <Link href="/admin/produtos">Produtos</Link>
      <Link href="/admin/estoque">Estoque</Link>
      <Link href="/admin/pedidos">Pedidos</Link>
      <Link href="/admin/fiscal">Notas fiscais</Link>
      <Link href="/admin/configuracoes">Configurações</Link>
      {context?.role==='owner'&&<Link href="/admin/equipe">Equipe e convites</Link>}
      <div className="admin-sidebar-divider"/>
      <Link href="/admin/lojas">Trocar de loja</Link>
      <Link href={'/loja/'+(context?.shop.slug||'')}>Abrir vitrine ↗</Link>
      <form action={signOut}><button type="submit">Sair da conta</button></form>
    </aside>
    <div>{children}</div>
  </div></main>;
}
