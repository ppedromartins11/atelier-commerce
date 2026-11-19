import Link from 'next/link';
import {redirect} from 'next/navigation';
import {memberStores} from '@/lib/supabase';
import {registerStore} from '@/app/admin/onboarding-actions';
export const dynamic='force-dynamic';
export default async function NewStore({searchParams}:{searchParams:Promise<{erro?:string}>}){
 const s=await memberStores(); if(!s)redirect('/admin/login');
 const q=await searchParams;
 return <main className="admin-shell"><div className="shell narrow">
   <Link href="/admin/lojas" className="text-link">← Voltar às minhas lojas</Link>
   <div className="admin-title"><div><span className="eyebrow">NOVO NEGÓCIO</span><h1>Cadastrar empresa</h1><p>Crie sua loja com nome e endereço exclusivos. Você poderá personalizar o site depois.</p></div></div>
   {q.erro&&<p className="alert">{q.erro}</p>}
   <div className="panel"><form action={registerStore} className="field-grid">
    <label className="field wide">Nome da loja<input type="text" name="name" required minLength={3} maxLength={120} placeholder="Ex.: Loja Aurora"/></label>
    <label className="field wide">Endereço da sua loja<input type="text" name="slug" maxLength={60} pattern="[a-zA-Z0-9-]+" placeholder="Ex.: loja-aurora"/><small>Usado no endereço: /loja/loja-aurora. Se vazio, será gerado a partir do nome.</small></label>
    <div className="wide notice">A empresa será criada como <strong>não publicada</strong>. É possível cadastrar produtos, organizar o estoque e revisar a vitrine antes da publicação.</div>
    <div className="wide"><button className="btn btn-dark" type="submit">Criar loja e acessar painel</button></div>
   </form></div>
 </div></main>;
}
