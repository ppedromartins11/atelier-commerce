import Link from 'next/link';
import {redirect} from 'next/navigation';
import AdminNav from '@/components/admin-nav';
import {requireAdmin} from '@/lib/supabase';
import {adjustStock} from '@/app/admin/actions';
import {reconcilePhysicalCount,setReorderPoint} from '@/app/admin/inventory-actions';
import {availableInventory,inventoryState,inventorySummary} from '@/lib/inventory';

export const dynamic='force-dynamic';
type Filter='todos'|'baixo'|'esgotado';
export default async function Inventory({searchParams}:{
 searchParams:Promise<{erro?:string;salvo?:string;filtro?:string;busca?:string}>
}) {
 const a=await requireAdmin();
 if(!a)redirect('/admin/login');
 const query=await searchParams;
 const filter:Filter=query.filtro==='baixo'||query.filtro==='esgotado'?query.filtro:'todos';
 const search=(query.busca||'').trim().slice(0,80);
 let variantQuery=a.db.from('product_variants')
   .select('id,sku,label,stock_on_hand,reserved,reorder_point,products(title,archived_at)')
   .eq('store_id',a.shop.id)
   .order('sku',{ascending:true}).limit(500);
 if(search) variantQuery=variantQuery.ilike('sku','%'+search.replace(/[%_\\]/g,'')+'%');
 const [variants,movements,counts]=await Promise.all([
  variantQuery,
  a.db.from('stock_movements')
   .select('id,delta,reason,created_at,product_variants(sku)')
   .eq('store_id',a.shop.id).order('created_at',{ascending:false}).limit(40),
  a.db.from('inventory_counts')
   .select('id,counted_quantity,previous_quantity,delta,reason,created_at,product_variants(sku)')
   .eq('store_id',a.shop.id).order('created_at',{ascending:false}).limit(20)
 ]);
 const items=variants.data||[];
 const {out,low}=inventorySummary(items);
 const visible=items.filter(v=>filter==='esgotado'?inventoryState(v)==='out'
     :filter==='baixo'?inventoryState(v)==='low':true);
 const filterHref=(name:Filter)=>'/admin/estoque?filtro='+name+(search?'&busca='+encodeURIComponent(search):'');
 return <AdminNav>
  <div className="admin-title">
   <div><span className="eyebrow">OPERAÇÃO / INVENTÁRIO</span>
    <h1>Estoque</h1>
    <p>Saldo disponível, alertas de reposição, movimentações e contagens físicas auditadas.</p>
   </div>
  </div>
  {query.erro&&<p className="alert" role="alert">{query.erro}</p>}
  {query.salvo&&<p className="notice" role="status">Estoque atualizado com sucesso.</p>}
  {variants.error&&<p className="alert" role="alert">Não foi possível carregar os SKUs. Nenhum saldo foi alterado.</p>}
  {movements.error&&<p className="alert" role="alert">Não foi possível carregar as movimentações.</p>}
  {counts.error&&<p className="alert" role="alert">Não foi possível carregar as contagens físicas.</p>}
  {!variants.error&&<>
   <div className="inventory-stats" aria-label="Resumo dos SKUs exibidos">
    <div className="stat"><small>SKUs consultados</small><strong>{items.length}</strong></div>
    <div className="stat"><small>Reposição necessária</small><strong>{low}</strong></div>
    <div className="stat"><small>Esgotados</small><strong>{out}</strong></div>
   </div>
   <div className="panel">
    <div className="inventory-toolbar">
     <form action="/admin/estoque" className="inventory-search">
      <label htmlFor="inventory-sku">Buscar SKU</label>
      <input id="inventory-sku" type="search" name="busca" defaultValue={search} placeholder="Digite o SKU"/>
      <button className="btn btn-dark" type="submit">Buscar</button>
     </form>
     <nav className="inventory-filters" aria-label="Filtrar saldo">
      <Link href={filterHref('todos')} aria-current={filter==='todos'?'page':undefined}>Todos</Link>
      <Link href={filterHref('baixo')} aria-current={filter==='baixo'?'page':undefined}>Estoque baixo</Link>
      <Link href={filterHref('esgotado')} aria-current={filter==='esgotado'?'page':undefined}>Esgotados</Link>
     </nav>
    </div>
    <h2>Saldo e alertas por SKU</h2>
    <p>Saldo disponível = quantidade física menos unidades reservadas. O limite mínimo igual a zero desativa o aviso de reposição.</p>
    {items.length>=500&&<p className="notice">Exibindo até 500 SKUs. Refine a busca para localizar outros itens; os indicadores se referem apenas aos resultados carregados.</p>}
    <div className="admin-table-wrap">
     <table className="admin-table"><thead><tr>
      <th>Produto / SKU</th><th>Físico</th><th>Reservado</th><th>Disponível</th><th>Alerta</th><th>Operações</th>
     </tr></thead><tbody>
     {visible.map(v=>{
      const qty=availableInventory(v);
      const state=inventoryState(v);
      const status=state==='out'?'Esgotado':state==='low'?'Estoque baixo':'Normal';
      return <tr key={v.id}>
       <td><strong>{v.products?.[0]?.title||'Produto'}</strong><br/><span className="muted">{v.label} / {v.sku}</span>
        {v.products?.[0]?.archived_at&&<small className="muted"> · Arquivado</small>}
       </td>
       <td>{v.stock_on_hand}</td><td>{v.reserved}</td><td><strong>{qty}</strong></td>
       <td><span className={'status '+(status==='Normal'?'':'off')}>{status}</span></td>
       <td>
        <div className="inventory-operations">
         <form action={setReorderPoint} className="inventory-reorder">
          <input type="hidden" name="variant_id" value={v.id}/>
          <label>Limite mínimo <input name="reorder_point" type="number" min="0" max="500000" step="1" defaultValue={v.reorder_point} required/></label>
          <button className="text-link" type="submit">Salvar limite</button>
         </form>
         <details><summary>Entrada / saída</summary>
          <form action={adjustStock} className="inventory-drawer">
           <input type="hidden" name="variant_id" value={v.id}/>
           <label>Variação <input name="delta" type="number" step="1" min="-500000" max="500000" required placeholder="+10 ou -2"/></label>
           <label>Motivo <input name="reason" required minLength={3} maxLength={300} placeholder="Ex.: recebimento"/></label>
           <button className="btn btn-dark" type="submit">Registrar ajuste</button>
          </form>
         </details>
         <details><summary>Contagem física</summary>
          <form action={reconcilePhysicalCount} className="inventory-drawer">
           <input type="hidden" name="variant_id" value={v.id}/>
           <label>Quantidade contada <input name="counted_quantity" type="number" step="1" min={v.reserved} max="500000" defaultValue={v.stock_on_hand} required/></label>
           <label>Motivo <input name="reason" required minLength={3} maxLength={260} placeholder="Ex.: inventário mensal"/></label>
           <button className="btn btn-dark" type="submit">Confirmar contagem</button>
          </form>
         </details>
        </div>
       </td>
      </tr>;
     })}
     </tbody></table>
    </div>
    {visible.length===0&&<p>Nenhum SKU corresponde aos filtros selecionados.</p>}
   </div>
  </>}
  <div className="panel"><h2>Movimentações recentes</h2>
   {!movements.error&&<>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Data</th><th>SKU</th><th>Variação</th><th>Motivo</th></tr></thead><tbody>
    {(movements.data||[]).map(m=><tr key={m.id}>
     <td>{new Date(m.created_at).toLocaleString('pt-BR')}</td>
     <td>{m.product_variants?.[0]?.sku||'—'}</td>
     <td><strong>{m.delta>0?'+':''}{m.delta}</strong></td><td>{m.reason}</td>
    </tr>)}
    </tbody></table></div>
    {movements.data?.length===0&&<p>Sem movimentações registradas.</p>}
   </>}
  </div>
  <div className="panel"><h2>Histórico de contagens físicas</h2>
   <p>Registra inclusive conferências sem diferença. Ajustes de quantidade aparecem também nas movimentações acima.</p>
   {!counts.error&&<>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Data</th><th>SKU</th><th>Antes</th><th>Contado</th><th>Diferença</th><th>Justificativa</th></tr></thead><tbody>
    {(counts.data||[]).map(c=><tr key={c.id}>
     <td>{new Date(c.created_at).toLocaleString('pt-BR')}</td>
     <td>{c.product_variants?.[0]?.sku||'—'}</td>
     <td>{c.previous_quantity}</td><td>{c.counted_quantity}</td>
     <td>{c.delta>0?'+':''}{c.delta}</td><td>{c.reason}</td>
    </tr>)}
    </tbody></table></div>
    {counts.data?.length===0&&<p>Nenhuma contagem física registrada.</p>}
   </>}
  </div>
 </AdminNav>;
}
