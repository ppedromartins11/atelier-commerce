-- Corrige a permissão de atualização da loja deixada pela migração inicial.
-- Administradores mantêm acesso ao catálogo e estoque; publicação e identidade
-- da empresa são responsabilidade do proprietário.
drop policy if exists "stores_manage" on public.stores;
create policy "stores_owner_update" on public.stores
  for update to authenticated
  using ((select app_private.is_store_owner(id)))
  with check ((select app_private.is_store_owner(id)));

-- As escritas sensíveis ficam em app_private, fora da Data API. A função
-- privilegiada valida a identidade e a associação à loja antes de gravar.
-- Produto, variante e movimentação inicial pertencem à mesma transação RPC.
create or replace function app_private.create_product_with_initial_stock(
  p_store_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_image_url text,
  p_price_cents integer,
  p_category_id uuid,
  p_sku text,
  p_stock integer,
  p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
  v_variant_id uuid;
begin
  if (select auth.uid()) is null or not public.is_store_admin(p_store_id) then
    raise exception 'Acesso negado';
  end if;
  if length(trim(coalesce(p_title, ''))) not between 3 and 180
     or p_slug !~ '^[a-z0-9-]{3,180}$'
     or length(coalesce(p_description, '')) > 5000
     or length(trim(coalesce(p_sku, ''))) not between 2 and 80
     or p_price_cents is null or p_price_cents < 0
     or p_stock is null or p_stock < 0 or p_stock > 500000
     or (p_image_url is not null and
         (p_image_url !~ '^https://[^[:space:]]+$' or length(p_image_url) > 2000)) then
    raise exception 'Dados do produto inválidos';
  end if;

  insert into public.products
    (store_id, title, slug, description, images, price_cents, category_id, active)
  values
    (p_store_id, trim(p_title), p_slug, p_description,
     case when p_image_url is null then '{}'::text[] else array[p_image_url] end,
     p_price_cents, p_category_id, coalesce(p_active, false))
  returning id into v_product_id;

  insert into public.product_variants
    (store_id, product_id, sku, label, stock_on_hand)
  values (p_store_id, v_product_id, trim(p_sku), 'Padrão', p_stock)
  returning id into v_variant_id;

  if p_stock > 0 then
    insert into public.stock_movements
      (store_id, variant_id, delta, reason, actor_user_id)
    values
      (p_store_id, v_variant_id, p_stock, 'Estoque inicial do produto', (select auth.uid()));
  end if;

  return v_product_id;
end
$$;

revoke all on function app_private.create_product_with_initial_stock(
  uuid,text,text,text,text,integer,uuid,text,integer,boolean
) from public;
grant execute on function app_private.create_product_with_initial_stock(
  uuid,text,text,text,text,integer,uuid,text,integer,boolean
) to authenticated;

create or replace function public.create_product_with_initial_stock(
  p_store_id uuid, p_title text, p_slug text, p_description text,
  p_image_url text, p_price_cents integer, p_category_id uuid,
  p_sku text, p_stock integer, p_active boolean
)
returns uuid language sql security invoker set search_path = ''
as $$
  select app_private.create_product_with_initial_stock(
    p_store_id,p_title,p_slug,p_description,p_image_url,p_price_cents,
    p_category_id,p_sku,p_stock,p_active
  )
$$;
revoke all on function public.create_product_with_initial_stock(
  uuid,text,text,text,text,integer,uuid,text,integer,boolean
) from public, anon;
grant execute on function public.create_product_with_initial_stock(
  uuid,text,text,text,text,integer,uuid,text,integer,boolean
) to authenticated;

-- Substitui a implementação anterior sem mudar a assinatura usada no painel.
create or replace function app_private.adjust_inventory(
  p_variant_id uuid,p_delta integer,p_reason text
)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  v_store uuid;
  v_quantity integer;
begin
  if (select auth.uid()) is null or p_delta is null or p_delta = 0
     or p_delta < -500000 or p_delta > 500000
     or length(trim(coalesce(p_reason,''))) not between 3 and 300 then
    raise exception 'Movimentação inválida';
  end if;
  select store_id into v_store
  from public.product_variants where id = p_variant_id for update;
  if not found or not public.is_store_admin(v_store) then
    raise exception 'Acesso negado';
  end if;
  update public.product_variants
  set stock_on_hand = stock_on_hand + p_delta
  where id = p_variant_id
    and stock_on_hand + p_delta >= reserved
    and stock_on_hand + p_delta >= 0
  returning stock_on_hand into v_quantity;
  if not found then raise exception 'Estoque insuficiente'; end if;
  insert into public.stock_movements
    (store_id,variant_id,delta,reason,actor_user_id)
  values (v_store,p_variant_id,p_delta,trim(p_reason),(select auth.uid()));
  return v_quantity;
end
$$;
revoke all on function app_private.adjust_inventory(uuid,integer,text) from public;
grant execute on function app_private.adjust_inventory(uuid,integer,text) to authenticated;

create or replace function public.adjust_inventory(
  p_variant_id uuid,p_delta integer,p_reason text
)
returns integer language sql security invoker set search_path = ''
as $$
  select app_private.adjust_inventory(p_variant_id,p_delta,p_reason)
$$;
revoke all on function public.adjust_inventory(uuid,integer,text) from public,anon;
grant execute on function public.adjust_inventory(uuid,integer,text) to authenticated;

-- A Data API não pode criar produtos parciais nem alterar saldo ou histórico
-- diretamente. As leituras continuam sujeitas às políticas RLS existentes.
revoke all on public.products, public.product_variants, public.stock_movements
  from public, anon, authenticated;
grant select on public.products, public.product_variants to anon, authenticated;
grant update on public.products to authenticated;
grant select on public.stock_movements to authenticated;

-- As leituras e o cadastro de categorias também precisam de grants explícitos
-- quando o projeto não concede acesso padrão às tabelas da Data API.
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant select on public.orders, public.order_items, public.payments,
  public.fiscal_documents, public.shipping_methods to authenticated;
