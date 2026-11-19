import {notFound} from 'next/navigation';
import Header from '@/components/header';
import StoreFooter from '@/components/store-footer';
import {store} from '@/lib/supabase';
export const dynamic='force-dynamic';
export default async function TenantLayout({children,params}:{children:React.ReactNode;params:Promise<{tenant:string}>}){
 const {tenant}=await params;
 const shop=await store(tenant);
 if(!shop)notFound();
 const basePath='/loja/'+tenant;
 return <><Header tenantSlug={tenant} basePath={basePath}/>{children}<StoreFooter basePath={basePath}/></>;
}
