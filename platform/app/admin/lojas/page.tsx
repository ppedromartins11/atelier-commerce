import Link from 'next/link';
import {redirect} from 'next/navigation';
import {memberStores} from '@/lib/supabase';
import {changeActiveStore,changeStoreVisibility} from '@/app/admin/onboarding-actions';
import {signOut} from '@/app/admin/actions';
export const dynamic='force-dynamic';
export default async function Stores({searchParams}:{searchParams:Promise<{erro?:string}>}){
 const context=await memberStores();
 if(!context)redirect('/admin/login');
 const q=await searchParams;
 return <main className="admin-shell"><div className="shell">
   <div className="merchant-top"><Link href="/" className="brand">ATELIER<span>.</span></Link><form action={signOut}><button className="text-link" type="submit">Sair</button></form></div>
   <div className="admin-title"><div><span className="eyebrow">CENTRAL DO LOJISTA</span><h1>Suas lojas</h1><p>Escolha a empresa que deseja administrar. Cada loja tem seu próprio catálogo, estoque e operações.</p></div>
   <Link href="/admin/lojas/nova" className="btn btn-dark">+ Cadastrar loja</Link></div>
   {q.erro&&<p className="alert">{q.erro}</p>}
   {!context.shops.length&&<div className="empty"><h2>Você ainda não cadastrou nenhuma loja.</h2><p>Adicione sua empresa para configurar o catálogo e começar a preparar as vendas.</p><Link className="btn btn-dark" href="/admin/lojas/nova">Criar minha primeira loja</Link></div>}
   <div className="merchant-shop-grid">{context.shops.map(shop=><article className="panel merchant-shop-card" key={shop.id}>
     <div className="merchant-shop-head"><span className="eyebrow">SUA EMPRESA</span><span className={'status '+(shop.is_published?'':'off')}>{shop.is_published?'Vitrine visível':'Vitrine não publicada'}</span></div>
     <h2>{shop.name}</h2><p>/loja/{shop.slug}</p><p className="help-text">Permissão: {shop.role==='owner'?'Proprietário':'Administrador'}</p>
     <form action={changeActiveStore}><input name="store_id" type="hidden" value={shop.id}/><button className="btn btn-dark full" type="submit">Abrir administração ↗</button></form>
     <div className="merchant-shop-actions"><Link href={'/loja/'+shop.slug} className="text-link">Visualizar loja ↗</Link>
      {shop.role==='owner'&&<form action={changeStoreVisibility}><input type="hidden" name="store_id" value={shop.id}/><input type="hidden" name="visible" value={shop.is_published?'false':'true'}/><button className="text-link" type="submit">{shop.is_published?'Ocultar loja':'Publicar vitrine'}</button></form>}</div>
   </article>)}</div>
   <p className="help-text">Publicar uma vitrine não habilita pagamentos nem emissão fiscal. Esses recursos exigem integração e validação próprias.</p>
 </div></main>;
}
