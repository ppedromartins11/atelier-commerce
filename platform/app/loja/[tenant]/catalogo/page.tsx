import CatalogView from '@/components/catalog-view';
export const dynamic='force-dynamic';
export default async function TenantCatalog({params,searchParams}:{params:Promise<{tenant:string}>;searchParams:Promise<{busca?:string;categoria?:string}>}){
 const [{tenant},query]=await Promise.all([params,searchParams]);
 return <CatalogView tenantSlug={tenant} basePath={'/loja/'+tenant} params={query}/>;
}
