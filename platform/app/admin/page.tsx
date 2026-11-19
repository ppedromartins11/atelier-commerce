import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminNav from '@/components/admin-nav';
import {requireAdmin} from '@/lib/supabase';
import {money} from '@/lib/format';
export const dynamic='force-dynamic';
export default async function AdminHome(){
 const a=await requireAdmin();
 if(!a)redirect('/admin/login');
 const [p,v,o] = await Promise.all([
   a.db.from('products').select('id',{count:'exact',head:true}).eq('store_id',a.shop.id),
   a.db.from('product_variants').select('id,stock_on_hand,reserved').eq('store_id',a.shop.id),
   a.db.from('orders').select('id,total_cents,status,created_at').eq('store_id',a.shop.id).order('created_at',{ascending:false}).limit(5)
 ]);
 const low=(v.data||[]).filter(x=>x.stock_on_hand-x.reserved<5).length;
 return <AdminNav><div className="admin-title"><div><span className="eyebrow">PAINEL DE GESTÃO</span><h1>Visão geral</h1><p>{a.shop.name} · dados atuais do banco</p></div></div>
 <div className="stats"><div className="stat"><small>Produtos cadastrados</small><strong>{p.count??0}</strong></div><div className="stat"><small>Pedidos recentes</small><strong>{o.data?.length??0}</strong><small>Últimos cinco registros</small></div><div className="stat"><small>SKUs com estoque baixo</small><strong>{low}</strong></div></div>
 <div className="panel"><h2>Últimos pedidos</h2>{o.data?.length?<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Pedido</th><th>Valor</th><th>Situação</th></tr></thead><tbody>{o.data.map(x=><tr key={x.id}><td>{x.id.slice(0,8)}</td><td>{money(x.total_cents)}</td><td>{x.status}</td></tr>)}</tbody></table></div>:<p>Nenhum pedido real registrado até o momento.</p>}<div className="quick-links"><Link href="/admin/produtos">Cadastrar produtos ↗</Link><Link href="/admin/estoque">Movimentar estoque ↗</Link></div></div>
 <div className="notice">Pagamentos, frete e autorização de notas fiscais serão ativados somente após contratação de provedores e homologação. O painel não inventa transações.</div>
 </AdminNav>;
}
