import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import AdminNav from '@/components/admin-nav';
import {requireAdmin} from '@/lib/supabase';
import {money} from '@/lib/format';
import {productImageSrc} from '@/lib/catalog-image';
import {
 saveProductDetails,setProductArchive,saveVariant,uploadProductImage,removeProductImage
} from '@/app/admin/catalog-actions';

export const dynamic='force-dynamic';
export default async function EditProduct({
 params,searchParams
}:{params:Promise<{id:string}>;searchParams:Promise<{erro?:string;salvo?:string}>}) {
 const [{id},query]=await Promise.all([params,searchParams]);
 const a=await requireAdmin();
 if(!a)redirect('/admin/login');
 const [result,categories,variants]=await Promise.all([
  a.db.from('products').select('id,title,slug,description,price_cents,category_id,images,active,archived_at')
   .eq('id',id).eq('store_id',a.shop.id).maybeSingle(),
  a.db.from('categories').select('id,name').eq('store_id',a.shop.id).order('name'),
  a.db.from('product_variants').select('id,sku,label,barcode,attributes,stock_on_hand,reserved,active')
   .eq('product_id',id).eq('store_id',a.shop.id).order('created_at')
 ]);
 if(result.error||!result.data)notFound();
 const p=result.data;
 const issues=[categories.error&&'Não foi possível consultar as categorias.',variants.error&&'Não foi possível consultar as variantes.'].filter(Boolean);
 return <AdminNav>
  <div className="admin-title"><div><span className="eyebrow">CATÁLOGO / EDIÇÃO</span>
   <h1>{p.title}</h1><p>{p.archived_at?'Produto arquivado — não aparece na vitrine.':'Gerencie dados, variações e imagens vinculados a esta loja.'}</p>
   <Link className="text-link" href="/admin/produtos">← Voltar aos produtos</Link>
  </div></div>
  {query.erro&&<p className="alert" role="alert">{query.erro}</p>}
  {query.salvo&&<p className="notice" role="status">Alterações salvas.</p>}
  {issues.map((issue,i)=><p className="alert" role="alert" key={i}>{issue}</p>)}
  <div className="panel">
   <h2>Informações do produto</h2>
   {p.archived_at?<p>Para editar o cadastro, restaure o produto primeiro.</p>:<form action={saveProductDetails} className="field-grid">
    <input type="hidden" name="product_id" value={p.id}/>
    <label className="field wide">Nome<input name="title" required minLength={3} maxLength={180} defaultValue={p.title}/></label>
    <label className="field">Endereço do produto<input name="slug" required minLength={3} maxLength={180} defaultValue={p.slug} pattern="[a-z0-9-]+"/></label>
    <label className="field">Preço (R$)<input name="price" type="number" min="0" step="0.01" required defaultValue={(p.price_cents/100).toFixed(2)}/></label>
    <label className="field wide">Categoria<select name="category_id" defaultValue={p.category_id||''}>
     <option value="">Sem categoria</option>{(categories.data||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
    </select></label>
    <label className="field wide">Descrição<textarea name="description" maxLength={5000} rows={5} defaultValue={p.description||''}/></label>
    <label className="field wide"><span><input type="checkbox" name="active" defaultChecked={p.active} style={{width:'auto',minHeight:0,marginRight:8}}/>Produto disponível na vitrine quando a loja estiver publicada</span></label>
    <div className="wide"><button type="submit" className="btn btn-dark">Salvar produto</button></div>
   </form>}
  </div>
  <div className="panel">
   <h2>Variantes e SKUs</h2>
   {variants.error?<p>Não foi possível carregar as variantes. Atualize a página e tente novamente.</p>:<>
    {(variants.data||[]).map(v=><form className="field-grid variant-editor" action={saveVariant} key={v.id}>
     <input type="hidden" name="product_id" value={p.id}/><input type="hidden" name="variant_id" value={v.id}/>
     <div className="wide"><strong>{v.label}</strong> · Saldo {v.stock_on_hand} ({v.reserved} reservado)</div>
     <label className="field">SKU<input name="sku" required minLength={2} maxLength={80} defaultValue={v.sku} disabled={!!p.archived_at}/></label>
     <label className="field">Nome da variação<input name="label" required maxLength={80} defaultValue={v.label} disabled={!!p.archived_at}/></label>
     <label className="field">Cor<input name="color" maxLength={80} defaultValue={String((v.attributes as Record<string,unknown>)?.color||'')} disabled={!!p.archived_at}/></label>
     <label className="field">Tamanho<input name="size" maxLength={80} defaultValue={String((v.attributes as Record<string,unknown>)?.size||'')} disabled={!!p.archived_at}/></label>
     <label className="field wide">Código de barras<input name="barcode" maxLength={80} defaultValue={v.barcode||''} disabled={!!p.archived_at}/></label>
     <div className="wide"><button className="btn btn-dark" type="submit" disabled={!!p.archived_at}>Atualizar variante</button></div>
    </form>)}
    {!p.archived_at&&<form action={saveVariant} className="field-grid variant-editor">
     <input type="hidden" name="product_id" value={p.id}/>
     <h3 className="wide">Adicionar variante</h3>
     <label className="field">SKU exclusivo<input name="sku" required minLength={2} maxLength={80} placeholder="CAM-PRETA-G"/></label>
     <label className="field">Nome<input name="label" required maxLength={80} placeholder="Preta / G"/></label>
     <label className="field">Cor<input name="color" maxLength={80}/></label>
     <label className="field">Tamanho<input name="size" maxLength={80}/></label>
     <label className="field">Código de barras<input name="barcode" maxLength={80}/></label>
     <label className="field">Estoque inicial<input type="number" name="initial_stock" min="0" max="500000" step="1" defaultValue="0" required/></label>
     <div className="wide"><button className="btn btn-dark" type="submit">Adicionar SKU</button></div>
    </form>}
   </>}
   <p className="help-text">Os ajustes posteriores de quantidade são registrados exclusivamente em <Link href="/admin/estoque" className="text-link">Estoque</Link>.</p>
  </div>
  <div className="panel">
   <h2>Imagens do produto</h2>
   <p>Até 8 arquivos JPG, PNG ou WebP de 5 MB. Os arquivos ficam privados e são apresentados somente a quem tiver acesso ao produto.</p>
   <div className="product-media-grid">
    {(p.images||[]).map((path:string,index:number)=><div className="product-media" key={path}>
     <img src={productImageSrc(p.id,path,index)} alt={p.title+' — imagem '+(index+1)}/>
     <form action={removeProductImage}><input type="hidden" name="product_id" value={p.id}/>
      <input type="hidden" name="image_path" value={path}/><button className="text-link danger" type="submit">Remover imagem</button>
     </form>
    </div>)}
   </div>
   {!p.archived_at&&(p.images||[]).length<8&&<form action={uploadProductImage} encType="multipart/form-data" className="field-grid">
    <input type="hidden" name="product_id" value={p.id}/>
    <label className="field wide">Enviar imagem<input type="file" name="file" accept="image/jpeg,image/png,image/webp" required/></label>
    <div className="wide"><button type="submit" className="btn btn-dark">Adicionar imagem</button></div>
   </form>}
  </div>
  <div className="panel"><h2>Arquivamento</h2>
   <p>{p.archived_at?'Ao restaurar, o produto volta como rascunho.':'Arquivar oculta o produto da vitrine sem apagar SKU, imagens ou histórico de estoque.'}</p>
   <form action={setProductArchive}>
    <input type="hidden" name="product_id" value={p.id}/>
    <input type="hidden" name="archive" value={p.archived_at?'false':'true'}/>
    <button className="btn btn-dark" type="submit">{p.archived_at?'Restaurar como rascunho':'Arquivar produto'}</button>
   </form>
  </div>
  <p className="muted small">Preço atual: {money(p.price_cents)} · Publicação comercial depende da homologação do checkout.</p>
 </AdminNav>;
}
