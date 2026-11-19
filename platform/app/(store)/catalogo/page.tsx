import CatalogView from '@/components/catalog-view';
export const dynamic='force-dynamic';
export default async function Catalog({searchParams}:{searchParams:Promise<{busca?:string;categoria?:string}>}){
 return <CatalogView params={await searchParams}/>;
}
