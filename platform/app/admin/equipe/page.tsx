import Link from 'next/link';
import {redirect} from 'next/navigation';
import AdminNav from '@/components/admin-nav';
import {requireAdmin} from '@/lib/supabase';
import {inviteStoreAdmin,cancelInvite,removeTeamMember} from '@/app/admin/onboarding-actions';
export const dynamic='force-dynamic';
export default async function Team({searchParams}:{searchParams:Promise<{erro?:string;enviado?:string}>}){
 const ctx=await requireAdmin(); if(!ctx)redirect('/admin/login');
 if(ctx.role!=='owner')redirect('/admin');
 const [members,invitations]=await Promise.all([
   ctx.db.from('store_members').select('user_id,role,created_at').eq('store_id',ctx.shop.id).order('created_at'),
   ctx.db.from('store_invitations').select('id,email,role,expires_at,accepted_at').eq('store_id',ctx.shop.id).order('created_at',{ascending:false})
 ]);
 const q=await searchParams;
 return <AdminNav><div className="admin-title"><div><span className="eyebrow">ACESSOS</span><h1>Equipe</h1><p>Convide administradores e revise quem tem acesso a esta empresa.</p></div></div>
 {q.erro&&<p className="alert">{q.erro}</p>}{q.enviado&&<p className="notice">Convite registrado. Oriente a pessoa a criar conta com esse e-mail e aceitar o convite em <Link href="/admin/convites">Meus convites</Link>.</p>}
 <div className="panel"><h2>Convidar administrador</h2><p>Administradores podem gerir o catálogo e o estoque desta loja. Convites expiram em sete dias. O envio automático por e-mail será integrado posteriormente.</p>
   <form action={inviteStoreAdmin} className="search-form"><input name="email" type="email" maxLength={254} required placeholder="funcionario@empresa.com.br"/><button className="btn btn-dark" type="submit">Registrar convite</button></form>
 </div>
 <div className="panel"><h2>Usuários com acesso</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Usuário</th><th>Papel</th><th>Desde</th><th>Ação</th></tr></thead><tbody>
 {(members.data||[]).map(m=><tr key={m.user_id}><td>{m.user_id===ctx.user.id?'Sua conta':m.user_id.slice(0,8)+'…'}</td><td>{m.role==='owner'?'Proprietário':'Administrador'}</td><td>{new Date(m.created_at).toLocaleDateString('pt-BR')}</td><td>{m.role==='owner'?'—':<form action={removeTeamMember}><input type="hidden" name="user_id" value={m.user_id}/><button type="submit" className="text-link danger">Remover acesso</button></form>}</td></tr>)}
 </tbody></table></div></div>
 <div className="panel"><h2>Convites enviados</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Destinatário</th><th>Situação</th><th>Validade</th><th>Ação</th></tr></thead><tbody>
 {(invitations.data||[]).map(i=><tr key={i.id}><td>{i.email}</td><td>{i.accepted_at?'Aceito':new Date(i.expires_at)<=new Date()?'Expirado':'Pendente'}</td><td>{new Date(i.expires_at).toLocaleDateString('pt-BR')}</td><td>{!i.accepted_at?<form action={cancelInvite}><input type="hidden" name="invite_id" value={i.id}/><button className="text-link danger" type="submit">Cancelar</button></form>:'—'}</td></tr>)}
 </tbody></table></div>{!invitations.data?.length&&<p>Nenhum convite registrado.</p>}</div></AdminNav>;
}
