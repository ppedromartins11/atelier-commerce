import {redirect} from 'next/navigation';
import AdminNav from '@/components/admin-nav';
import {requireAdmin} from '@/lib/supabase';
export const dynamic='force-dynamic';
export default async function Fiscal(){
 const a=await requireAdmin();if(!a)redirect('/admin/login');
 const {data}=await a.db.from('fiscal_documents').select('id,model,status,number,series,access_key,created_at').eq('store_id',a.shop.id).order('created_at',{ascending:false}).limit(100);
 return <AdminNav><div className="admin-title"><div><span className="eyebrow">CONTROLE FISCAL</span><h1>Notas fiscais</h1><p>Emissão e consulta de documentos fiscais.</p></div></div><div className="notice"><strong>Emissão ainda não habilitada.</strong> NF-e e NFC-e precisam de CNPJ/inscrição estadual, parâmetros fiscais, certificado digital e um emissor homologado com autorização da SEFAZ. O sistema não gera notas sem autorização oficial.</div><div className="panel" style={{marginTop:20}}><h2>Documentos registrados</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Modelo</th><th>Número</th><th>Série</th><th>Situação</th><th>Chave</th></tr></thead><tbody>{(data||[]).map(d=><tr key={d.id}><td>{d.model}</td><td>{d.number||'—'}</td><td>{d.series||'—'}</td><td>{d.status}</td><td>{d.access_key||'—'}</td></tr>)}</tbody></table></div>{!data?.length&&<p>Não existem documentos fiscais emitidos.</p>}</div></AdminNav>;
}
