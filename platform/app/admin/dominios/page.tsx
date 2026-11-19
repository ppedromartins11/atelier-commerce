import {redirect} from 'next/navigation';
import AdminNav from '@/components/admin-nav';
import {requireAdmin} from '@/lib/supabase';
import {proposeStoreDomain,removePendingDomain} from '@/app/admin/onboarding-actions';
export const dynamic='force-dynamic';
export default async function Domains({searchParams}:{searchParams:Promise<{erro?:string;registrado?:string}>}){
 const context=await requireAdmin();if(!context)redirect('/admin/login');
 if(context.role!=='owner')redirect('/admin');
 const {data:domains,error}=await context.db.from('store_domains')
  .select('id,hostname,verified_at,created_at').eq('store_id',context.shop.id).order('created_at',{ascending:false});
 const q=await searchParams;
 return <AdminNav><div className="admin-title"><div><span className="eyebrow">IDENTIDADE DA MARCA</span><h1>Domínios</h1><p>Solicite um endereço próprio para sua loja.</p></div></div>
 {q.erro&&<p className="alert">{q.erro}</p>}
 {q.registrado&&<p className="notice">Domínio registrado como solicitação. Ele ainda não foi verificado nem conectado.</p>}
 <div className="panel"><h2>Solicitar um domínio</h2><p>Você poderá usar seu endereço comercial quando a verificação de propriedade por DNS estiver disponível. Nenhum DNS será alterado nesta etapa.</p>
 <form action={proposeStoreDomain} className="search-form"><input type="text" name="hostname" required maxLength={253} placeholder="www.sualoja.com.br" autoComplete="url"/><button className="btn btn-dark" type="submit">Registrar solicitação</button></form>
 </div>
 <div className="panel"><h2>Domínios cadastrados</h2>
 {error&&<p className="alert">Não foi possível consultar os domínios.</p>}
 <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Domínio</th><th>Situação</th><th>Ação</th></tr></thead><tbody>
 {(domains||[]).map(d=><tr key={d.id}><td>{d.hostname}</td><td><span className={'status '+(d.verified_at?'':'off')}>{d.verified_at?'Verificado':'Aguardando verificação'}</span></td><td>{d.verified_at?'—':<form action={removePendingDomain}><input type="hidden" name="domain_id" value={d.id}/><button className="text-link danger" type="submit">Remover solicitação</button></form>}</td></tr>)}
 </tbody></table></div>{!domains?.length&&<p>Nenhum domínio solicitado.</p>}</div>
 <div className="notice">Os domínios registrados não são ativados automaticamente. A conexão exigirá comprovação DNS e configuração no provedor de hospedagem.</div></AdminNav>;
}
