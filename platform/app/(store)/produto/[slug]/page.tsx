import StoreProduct from '@/components/store-product';
export const dynamic='force-dynamic';
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 return <StoreProduct slug={slug}/>;
}
