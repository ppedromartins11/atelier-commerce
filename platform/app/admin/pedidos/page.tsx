import {redirect} from 'next/navigation';
import AdminNav from '@/components/admin-nav';
import {requireAdmin} from '@/lib/supabase';
import {money} from '@/lib/format';
export const dynamic='force-dynamic';
export default async function Orders(){
 const a=await requireAdmin();if(!a)redirect('/admin/login');
 const {data,error}=await a.db.from('orders').select('id,order_number,customer_email,status,payment_status,total_cents,created_at').eq('store_id',a.shop.id).order('created_at',{ascending:false}).limit(100);
 return <AdminNav><div className="admin-title"><div><span className="eyebrow">OPERAÇÃO</span><h1>Pedidos</h1><p>Pedidos reais vinculados à loja.</p></div></div>
 <div className="panel"><h2>Histórico</h2>{error&&<p className="alert">Erro ao consultar pedidos: {error.message}</p>}
 <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Número</th><th>Cliente</th><th>Status</th><th>Pagamento</th><th>Total</th><th>Data</th></tr></thead><tbody>{(data||[]).map(o=><tr key={o.id}><td>{o.order_number}</td><td>{o.customer_email}</td><td>{o.status}</td><td>{o.payment_status}</td><td>{money(o.total_cents)}</td><td>{new Date(o.created_at).toLocaleDateString('pt-BR')}</td></tr>)}</tbody></table></div>{!data?.length&&<p>Nenhum pedido registrado. O checkout estará disponível somente após conectar pagamentos, frete e proteção de estoque.</p>}</div></AdminNav>;
}
