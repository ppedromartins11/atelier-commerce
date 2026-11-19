import {notFound} from 'next/navigation';
import {store} from '@/lib/supabase';
export default async function TenantAbout({params}:{params:Promise<{tenant:string}>}){
 const {tenant}=await params;
 const shop=await store(tenant);if(!shop)notFound();
 return <main className="shell page narrow"><span className="eyebrow">SOBRE A MARCA</span><h1>{shop.name}</h1><p>{shop.description||'A loja ainda não publicou sua história.'}</p></main>;
}
