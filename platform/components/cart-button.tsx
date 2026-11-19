'use client';
import { useState } from 'react';
export default function CartButton({ productId, variantId, title, price, image, stock,tenantSlug='' }: { productId:string; variantId:string; title:string; price:number; image:string; stock:number; tenantSlug?:string }) {
  const [notice, setNotice] = useState('');
  const add = () => {
    try {
      const raw = localStorage.getItem('atelier-cart-v1:'+tenantSlug);
      const items = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(items) ? items : [];
      const found = list.find((x: {variantId:string}) => x.variantId === variantId);
      if (found && found.quantity >= stock) { setNotice('Quantidade máxima disponível.'); return; }
      if (found) found.quantity += 1;
      else list.push({ productId, variantId, title, price, image, quantity: 1 });
      localStorage.setItem('atelier-cart-v1:'+tenantSlug, JSON.stringify(list));
      setNotice('Produto adicionado ao carrinho.');
    } catch { setNotice('Não foi possível atualizar o carrinho.'); }
  };
  return <div><button className="btn btn-dark" onClick={add} disabled={stock < 1}>{stock < 1 ? 'Indisponível' : 'Adicionar ao carrinho'}</button><p aria-live="polite" className="form-note">{notice}</p></div>;
}
