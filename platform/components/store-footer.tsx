import Link from 'next/link';
export default function StoreFooter({basePath=''}:{basePath?:string}){
 return <footer className="store-footer">
 <div className="shell store-footer-top">
  <div><Link href={basePath||'/'} className="brand">ATELIER<span>.</span></Link><p>Uma experiência de compra que valoriza cada detalhe.</p></div>
  <div className="store-footer-links"><Link href={basePath+'/catalogo'}>Todos os produtos</Link><Link href={basePath+'/sobre'}>Nossa história</Link><Link href={basePath+'/contato'}>Contato</Link><Link href={basePath+'/carrinho'}>Carrinho</Link></div>
 </div><div className="shell store-footer-bottom"><small>© {new Date().getFullYear()} Atelier Commerce</small><Link href="/admin/login">Área do lojista</Link></div></footer>;
}
