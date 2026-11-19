'use client';
import {useState} from 'react';
import Link from 'next/link';
export default function MobileMenu({basePath=''}:{basePath?:string}){
  const [open,setOpen]=useState(false);
  return <div className="store-mobile-wrapper"><button className="store-menu-trigger" type="button" aria-expanded={open} aria-controls="store-mobile-nav" aria-label={open?'Fechar menu':'Abrir menu'} onClick={()=>setOpen(!open)}>
    <span aria-hidden="true">{open?'✕':'☰'}</span>
  </button><nav id="store-mobile-nav" className={'store-mobile-nav'+(open?' is-open':'')} aria-label="Menu móvel">
    <Link href={basePath||'/'} onClick={()=>setOpen(false)}>Início</Link><Link href={basePath+'/catalogo'} onClick={()=>setOpen(false)}>Produtos</Link>
    <Link href={basePath+'/sobre'} onClick={()=>setOpen(false)}>Nossa marca</Link><Link href={basePath+'/contato'} onClick={()=>setOpen(false)}>Contato</Link>
    <Link href={basePath+'/carrinho'} onClick={()=>setOpen(false)}>Carrinho</Link>
  </nav></div>;
}
