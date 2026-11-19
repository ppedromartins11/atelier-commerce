import Header from '@/components/header';
import StoreFooter from '@/components/store-footer';
export default function StoreLayout({children}:{children:React.ReactNode}){
 return <><Header/>{children}<StoreFooter/></>;
}
