import StoreProduct from '@/components/store-product';
export const dynamic='force-dynamic';
export default async function TenantProduct({params}:{params:Promise<{slug:string;tenant:string}>}){
 const {slug,tenant}=await params;
 return <StoreProduct slug={slug} tenantSlug={tenant} basePath={'/loja/'+tenant}/>;
}
