import Link from 'next/link';
import {redirect} from 'next/navigation';
import AdminNav from '@/components/admin-nav';
import {requireAdmin} from '@/lib/supabase';
import {money} from '@/lib/format';
import {createCategory,createProduct,toggleProduct} from '@/app/admin/actions';
import {saveCategoryName,removeEmptyCategory} from '@/app/admin/catalog-actions';
export const dynamic='force-dynamic';
export default async function Products({searchParams}:{searchParams:Promise<{erro?:string;salvo?:string}>}){
 const a=await requireAdmin();if(!a)redirect('/admin/login');
 const [prod,cats]=await Promise.all([
   a.db.from('products').select('id,title,slug,price_cents,active,archived_at,product_variants(sku,stock_on_hand,reserved)').eq('store_id',a.shop.id).order('created_at',{ascending:false}).limit(100),
   a.db.from('categories').select('id,name').eq('store_id',a.shop.id).order('name')
 ]);
 const params=await searchParams;
 return <AdminNav>
 <div className="admin-title"><div><span className="eyebrow">CATÁLOGO</span><h1>Produtos</h1><p>Crie e organize produtos reais por loja. Depois, edite imagens, SKUs e variações.</p></div></div>
 {params.erro&&<p className="alert" role="alert">{params.erro}</p>}
 {params.salvo&&<p className="notice" role="status">Cadastro atualizado.</p>}
 {prod.error&&<p className="alert" role="alert">Falha ao consultar produtos. Verifique a conexão e tente novamente.</p>}
 {cats.error&&<p className="alert" role="alert">Falha ao consultar categorias. Verifique a conexão e tente novamente.</p>}
 <div className="panel"><h2>Cadastrar produto</h2><p>O novo produto pode iniciar como rascunho. Depois do cadastro, abra Editar para enviar imagens e adicionar SKUs.</p>
 <form action={createProduct} className="field-grid">
 <label className="field">Nome do produto<input name="title" required minLength={3} maxLength={180} placeholder="Ex.: Camiseta básica preta"/></label>
 <label className="field">SKU inicial<input name="sku" required minLength={2} maxLength={80} placeholder="Ex.: CAM-PRETA-M"/></label>
 <label className="field">Preço (R$)<input type="number" min="0" step="0.01" name="price" required placeholder="149.90"/></label>
 <label className="field">Estoque inicial<input type="number" min="0" max="500000" step="1" name="stock" required defaultValue="0"/></label>
 <label className="field wide">Categoria<select name="category_id"><option value="">Sem categoria</option>{(cats.data||[]).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
 <label className="field wide">Descrição<textarea name="description" rows={4} maxLength={5000}/></label>
 <label className="field wide"><span><input type="checkbox" name="active" style={{width:'auto',minHeight:0,marginRight:8}}/>Disponibilizar na vitrine quando a loja estiver publicada</span></label>
 <div className="wide"><button type="submit" className="btn btn-dark">Cadastrar produto</button></div>
 </form></div>
 <div className="panel"><h2>Categorias</h2>
  <form action={createCategory} className="search-form"><input name="name" required placeholder="Ex.: Camisetas" minLength={2}/><button className="btn btn-dark" type="submit">Criar categoria</button></form>
  {!cats.error && (cats.data?.length ? <div className="category-manage">{cats.data.map(c=><div className="category-manage-row" key={c.id}>
   <form action={saveCategoryName} className="category-manage-edit"><input type="hidden" name="category_id" value={c.id}/><input name="name" defaultValue={c.name} required minLength={2} maxLength={100} aria-label={'Nome da categoria '+c.name}/><button type="submit" className="text-link">Renomear</button></form>
   <form action={removeEmptyCategory}><input type="hidden" name="category_id" value={c.id}/><button type="submit" className="text-link danger">Excluir vazia</button></form>
  </div>)}</div>:<p>Nenhuma categoria cadastrada.</p>)}
 </div>
 <div className="panel"><h2>Produtos cadastrados</h2>
 {!prod.error&&<><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nome / SKU</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead><tbody>{(prod.data||[]).map(p=><tr key={p.id}><td><strong>{p.title}</strong><br/><span className="muted">{p.product_variants?.map(v=>v.sku).join(', ')||'—'}</span></td><td>{money(p.price_cents)}</td><td>{p.product_variants?.reduce((s,v)=>s+v.stock_on_hand-v.reserved,0)||0}</td><td><span className={'status '+(p.active&&!p.archived_at?'':'off')}>{p.archived_at?'Arquivado':p.active?'Publicado':'Rascunho'}</span></td><td><div className="product-row-actions"><Link href={'/admin/produtos/'+p.id} className="text-link">Editar</Link>{!p.archived_at&&<form action={toggleProduct}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="active" value={p.active?'false':'true'}/><button type="submit" className="text-link">{p.active?'Despublicar':'Publicar'}</button></form>}</div></td></tr>)}</tbody></table></div>{!prod.data?.length&&<p>Nenhum produto cadastrado ainda.</p>}</>}
 </div>
 </AdminNav>;
}
