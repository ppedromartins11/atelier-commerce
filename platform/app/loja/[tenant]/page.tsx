import StoreHome from '@/components/store-home';
export const dynamic='force-dynamic';
export default async function TenantHome({params}:{params:Promise<{tenant:string}>}){
 const {tenant}=await params;
 return <StoreHome tenantSlug={tenant} basePath={'/loja/'+tenant}/>;
}
