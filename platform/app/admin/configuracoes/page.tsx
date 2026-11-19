import {redirect} from 'next/navigation';
import AdminNav from '@/components/admin-nav';
import {requireAdmin} from '@/lib/supabase';
import {updateSettings} from '@/app/admin/actions';
export const dynamic='force-dynamic';
export default async function Settings({searchParams}:{searchParams:Promise<{erro?:string;salvo?:string}>}){
 const a=await requireAdmin();if(!a)redirect('/admin/login');
 const {data:s}=await a.db.from('stores').select('name,description,hero_title,hero_text,hero_image_url').eq('id',a.shop.id).single();
 const params=await searchParams;
 return <AdminNav><div className="admin-title"><div><span className="eyebrow">SUA MARCA</span><h1>Personalização</h1><p>Ajuste textos e identidade visual da vitrine.</p></div></div>
 {params.erro&&<p className="alert">{params.erro}</p>}{params.salvo&&<p className="notice">Configurações salvas.</p>}
 <div className="panel"><form className="field-grid" action={updateSettings}>
 <label className="field">Nome da loja<input required name="name" defaultValue={s?.name||''}/></label>
 <label className="field">Imagem principal (URL HTTPS)<input type="url" name="hero_image_url" defaultValue={s?.hero_image_url||''}/></label>
 <label className="field wide">Título principal<input name="hero_title" defaultValue={s?.hero_title||''}/></label>
 <label className="field wide">Texto do banner<textarea name="hero_text" defaultValue={s?.hero_text||''}/></label>
 <label className="field wide">Descrição da marca<textarea name="description" defaultValue={s?.description||''}/></label>
 <div className="wide"><button className="btn btn-dark" type="submit">Salvar configurações</button></div></form></div>
 <div className="notice">Frete, meios de pagamento e dados fiscais serão gerenciados por integrações seguras em fases seguintes. Nenhuma credencial deve ser informada nos campos acima.</div></AdminNav>;
}
