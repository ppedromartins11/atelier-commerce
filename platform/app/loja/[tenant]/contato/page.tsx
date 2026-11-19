import {notFound} from 'next/navigation';
import {store} from '@/lib/supabase';
export default async function TenantContact({params}:{params:Promise<{tenant:string}>}){
 const {tenant}=await params;
 const shop=await store(tenant);if(!shop)notFound();
 return <main className="shell page narrow"><span className="eyebrow">CONTATO</span><h1>Fale com {shop.name}</h1><p>Os canais oficiais de atendimento serão exibidos após a empresa cadastrar e verificar seus contatos.</p></main>;
}
