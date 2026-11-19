import {redirect} from 'next/navigation';
import AdminNav from '@/components/admin-nav';
import {requireAdmin} from '@/lib/supabase';
import {adjustStock} from '@/app/admin/actions';
export const dynamic='force-dynamic';
export default async function Inventory({searchParams}:{searchParams:Promise<{erro?:string}>}){
 const a=await requireAdmin();if(!a)redirect('/admin/login');
 const [variants,movements]=await Promise.all([
   a.db.from('product_variants').select('id,sku,label,stock_on_hand,reserved,products(title)').eq('store_id',a.shop.id).order('created_at'),
   a.db.from('stock_movements').select('id,delta,reason,created_at,product_variants(sku)').eq('store_id',a.shop.id).order('created_at',{ascending:false}).limit(25)
 ]);
 const params=await searchParams;
 return <AdminNav><div className="admin-title"><div><span className="eyebrow">OPERAÇÃO</span><h1>Estoque</h1><p>Movimentações atômicas com histórico e controle de quantidades.</p></div></div>
 {params.erro&&<p className="alert">{params.erro}</p>}
 <div className="panel"><h2>Saldo por SKU</h2><p>Informe quantidade positiva para entrada, negativa para saída. O sistema impede saldo negativo.</p>
 <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Produto</th><th>SKU</th><th>Saldo</th><th>Reservado</th><th>Movimentar</th></tr></thead><tbody>{(variants.data||[]).map(v=><tr key={v.id}><td>{v.products?.title||'Produto'}</td><td>{v.sku}</td><td><strong>{v.stock_on_hand}</strong></td><td>{v.reserved}</td><td><form action={adjustStock} className="inventory-form"><input type="hidden" name="variant_id" value={v.id}/><input name="delta" type="number" step="1" required placeholder="+/-"/><input name="reason" required minLength={3} maxLength={300} placeholder="Motivo do ajuste"/><button className="btn btn-dark" type="submit">Salvar</button></form></td></tr>)}</tbody></table></div>{!variants.data?.length&&<p>Cadastre produtos para começar a controlar o estoque.</p>}</div>
 <div className="panel"><h2>Histórico recente</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Data</th><th>SKU</th><th>Variação</th><th>Motivo</th></tr></thead><tbody>{(movements.data||[]).map(m=><tr key={m.id}><td>{new Date(m.created_at).toLocaleString('pt-BR')}</td><td>{m.product_variants?.sku||'—'}</td><td><strong>{m.delta>0?'+':''}{m.delta}</strong></td><td>{m.reason}</td></tr>)}</tbody></table></div>{!movements.data?.length&&<p>Sem movimentações registradas.</p>}</div></AdminNav>;
}
