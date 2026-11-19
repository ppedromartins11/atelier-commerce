import Link from 'next/link';
import {redirect} from 'next/navigation';
import {sessionClient} from '@/lib/supabase';
import {acceptInvite} from '@/app/admin/onboarding-actions';
export const dynamic='force-dynamic';
export default async function Invitations({searchParams}:{searchParams:Promise<{erro?:string}>}){
 const db=await sessionClient();if(!db)redirect('/admin/login');
 const {data:{user}}=await db.auth.getUser();if(!user)redirect('/admin/login');
 const {data:invitations}=await db.from('store_invitations')
  .select('id,store_id,email,role,expires_at,accepted_at,stores(name,slug)')
  .eq('email',(user.email||'').toLowerCase()).order('created_at',{ascending:false});
 const q=await searchParams;
 return <main className="admin-shell"><div className="shell narrow">
 <Link href="/admin/lojas" className="text-link">← Suas lojas</Link><div className="admin-title"><div><span className="eyebrow">COLABORAÇÃO</span><h1>Convites recebidos</h1><p>Entre em uma empresa somente se seu e-mail foi convidado pelo proprietário.</p></div></div>
 {q.erro&&<p className="alert">{q.erro}</p>}
 <div className="card-list">{(invitations||[]).map(i=><div className="panel" key={i.id}>
 <h2>{i.stores?.[0]?.name||'Empresa convidante'}</h2><p>Papel: administrador · Convite para {i.email}</p>
 {i.accepted_at?<span className="status">Aceito</span>:new Date(i.expires_at)<=new Date()?<span className="status off">Expirado</span>:<form action={acceptInvite}><input type="hidden" name="invite_id" value={i.id}/><button className="btn btn-dark" type="submit">Aceitar convite e acessar</button></form>}
 </div>)}</div>{!invitations?.length&&<div className="empty"><h2>Sem convites pendentes.</h2><p>Peça ao proprietário para registrar um convite com seu e-mail confirmado.</p></div>}
 </div></main>;
}
