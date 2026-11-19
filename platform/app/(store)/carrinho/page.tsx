'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
type CartItem = {productId:string;variantId:string;title:string;price:number;image:string;quantity:number};
const money = (cents:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export default function CartPage() {
  const [items,setItems] = useState<CartItem[]>([]);
  const [ready,setReady] = useState(false);
  useEffect(()=>{try {const raw=localStorage.getItem('atelier-cart-v1'); if(raw){const list=JSON.parse(raw);if(Array.isArray(list))setItems(list.filter(x=>typeof x.variantId==='string'&&Number.isSafeInteger(x.quantity)&&x.quantity>0));}}catch{}setReady(true);},[]);
  const save=(next:CartItem[])=>{setItems(next);localStorage.setItem('atelier-cart-v1',JSON.stringify(next));};
  const total=items.reduce((sum,p)=>sum+p.price*p.quantity,0);
  return <main className="shell page"><span className="eyebrow">SUA SELEÇÃO</span><h1>Carrinho</h1>{!ready ? <p>Carregando…</p> : items.length ? <div className="checkout-grid"><div className="cart-items">{items.map(i=><article className="cart-item" key={i.variantId}>{i.image?<img src={i.image} alt="" />:<div className="mini-image"/>}<div><strong>{i.title}</strong><p>{money(i.price)}</p><div className="quantity-control"><button aria-label={'Diminuir quantidade de '+i.title} onClick={()=>save(items.map(p=>p.variantId===i.variantId?{...p,quantity:Math.max(1,p.quantity-1)}:p))}>−</button><span>{i.quantity}</span><button aria-label={'Aumentar quantidade de '+i.title} onClick={()=>save(items.map(p=>p.variantId===i.variantId?{...p,quantity:p.quantity+1}:p))}>+</button></div><button className="text-link remove" onClick={()=>save(items.filter(p=>p.variantId!==i.variantId))}>Remover</button></div><strong>{money(i.price*i.quantity)}</strong></article>)}</div><aside className="summary"><h2>Resumo</h2><div className="summary-line"><span>Subtotal</span><strong>{money(total)}</strong></div><p>Frete e estoque serão confirmados na finalização.</p><button className="btn btn-dark full" disabled>Finalização indisponível</button><p className="muted small">O checkout será ativado após a conexão segura do provedor de pagamento. Nenhum pedido ou cobrança é criado nesta etapa.</p></aside></div> : <div className="empty"><h2>Seu carrinho está vazio.</h2><p>Explore o catálogo e escolha seus produtos.</p><Link className="btn btn-dark" href="/catalogo">Ir para o catálogo</Link></div>}</main>;
}
