import CartView from '@/components/cart-view';
export default async function TenantCart({params}:{params:Promise<{tenant:string}>}){
 const {tenant}=await params;
 return <CartView tenantSlug={tenant} basePath={'/loja/'+tenant}/>;
}
