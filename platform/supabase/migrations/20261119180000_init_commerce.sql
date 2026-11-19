-- Atelier Commerce | v1 | PostgreSQL / Supabase
-- Cada entidade operacional pertence a uma loja. Sem dados fictícios.
create extension if not exists pgcrypto;

create table if not exists public.stores (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
 name text not null,
 description text,
 hero_title text,
 hero_text text,
 hero_image_url text,
 logo_url text,
 is_published boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.store_members (
 store_id uuid not null references public.stores(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin')),
 created_at timestamptz not null default now(),
 primary key (store_id,user_id)
);
create or replace function public.is_store_admin(p_store_id uuid)
returns boolean language sql stable security invoker set search_path=public as $$
 select exists(select 1 from public.store_members where store_id=p_store_id and user_id=(select auth.uid()) and role in ('owner','admin'))
$$;
create table if not exists public.categories (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 name text not null,
 slug text not null,
 sort_order int not null default 0,
 unique(store_id,slug),
 unique(store_id,id)
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 category_id uuid,
 title text not null,
 slug text not null,
 description text,
 images text[] not null default '{}',
 price_cents integer not null check(price_cents >= 0),
 compare_at_cents integer check(compare_at_cents >= 0),
 active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(store_id,slug),
 unique(store_id,id),
 foreign key(store_id,category_id) references public.categories(store_id,id)
);
create table if not exists public.product_variants (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 product_id uuid not null,
 sku text not null,
 label text not null default 'Padrão',
 barcode text,
 attributes jsonb not null default '{}'::jsonb,
 stock_on_hand integer not null default 0 check(stock_on_hand >= 0),
 reserved integer not null default 0 check(reserved >= 0 and reserved <= stock_on_hand),
 weight_g integer check(weight_g >= 0),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(store_id,sku),
 unique(store_id,id),
 foreign key(store_id,product_id) references public.products(store_id,id) on delete cascade
);
create table if not exists public.stock_movements (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 variant_id uuid not null,
 delta integer not null check(delta <> 0),
 reason text not null check(length(trim(reason)) between 3 and 300),
 actor_user_id uuid references auth.users(id),
 created_at timestamptz not null default now(),
 foreign key(store_id,variant_id) references public.product_variants(store_id,id)
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 order_number bigint generated always as identity,
 customer_email text not null,
 customer_name text,
 status text not null default 'pending' check(status in ('pending','confirmed','fulfilling','shipped','delivered','cancelled','refunded')),
 payment_status text not null default 'unpaid' check(payment_status in ('unpaid','pending','paid','failed','refunded')),
 subtotal_cents integer not null check(subtotal_cents >= 0),
 shipping_cents integer not null default 0 check(shipping_cents >= 0),
 discount_cents integer not null default 0 check(discount_cents >= 0),
 total_cents integer not null check(total_cents >= 0),
 address jsonb,
 created_at timestamptz not null default now(),
 unique(store_id,id)
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 order_id uuid not null,
 product_id uuid,
 variant_id uuid,
 title_snapshot text not null,
 sku_snapshot text not null,
 quantity integer not null check(quantity > 0),
 unit_price_cents integer not null check(unit_price_cents >= 0),
 foreign key(store_id,order_id) references public.orders(store_id,id) on delete cascade,
 foreign key(store_id,product_id) references public.products(store_id,id) on delete set null (product_id),
 foreign key(store_id,variant_id) references public.product_variants(store_id,id) on delete set null (variant_id)
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 order_id uuid not null,
 provider text not null,
 provider_reference text,
 amount_cents integer not null check(amount_cents >= 0),
 status text not null check(status in ('pending','authorized','paid','failed','refunded')),
 created_at timestamptz not null default now(),
 unique(provider,provider_reference),
 foreign key(store_id,order_id) references public.orders(store_id,id)
);
create table if not exists public.fiscal_documents (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 order_id uuid not null,
 model text not null check(model in ('55','65')),
 status text not null default 'pending' check(status in ('pending','processing','authorized','rejected','cancelled')),
 number text, series text, access_key text check(access_key is null or length(access_key)=44),
 protocol text, xml_storage_path text, danfe_storage_path text, issuer_provider text, error_message text,
 created_at timestamptz not null default now(),
 foreign key(store_id,order_id) references public.orders(store_id,id)
);
create table if not exists public.shipping_methods (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.stores(id) on delete cascade,
 name text not null,
 provider text not null default 'manual',
 active boolean not null default false,
 metadata jsonb not null default '{}'::jsonb
);

create index if not exists products_store_active_idx on public.products(store_id,active,created_at desc);
create index if not exists variants_product_idx on public.product_variants(product_id);
create index if not exists orders_store_created_idx on public.orders(store_id,created_at desc);
create index if not exists stock_store_created_idx on public.stock_movements(store_id,created_at desc);

alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.stock_movements enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.fiscal_documents enable row level security;
alter table public.shipping_methods enable row level security;

create policy "members_select_own" on public.store_members for select to authenticated using (user_id=(select auth.uid()));
create policy "stores_visible" on public.stores for select to anon,authenticated using (is_published or (select public.is_store_admin(id)));
create policy "stores_manage" on public.stores for update to authenticated using ((select public.is_store_admin(id))) with check ((select public.is_store_admin(id)));

create policy "categories_read" on public.categories for select to anon,authenticated using ((select public.is_store_admin(store_id)) or exists (select 1 from public.stores s where s.id=store_id and s.is_published));
create policy "categories_insert" on public.categories for insert to authenticated with check ((select public.is_store_admin(store_id)));
create policy "categories_update" on public.categories for update to authenticated using ((select public.is_store_admin(store_id))) with check ((select public.is_store_admin(store_id)));
create policy "categories_delete" on public.categories for delete to authenticated using ((select public.is_store_admin(store_id)));

create policy "products_read" on public.products for select to anon,authenticated using ((select public.is_store_admin(store_id)) or (active and exists (select 1 from public.stores s where s.id=store_id and s.is_published)));
create policy "products_insert" on public.products for insert to authenticated with check ((select public.is_store_admin(store_id)));
create policy "products_update" on public.products for update to authenticated using ((select public.is_store_admin(store_id))) with check ((select public.is_store_admin(store_id)));
create policy "products_delete" on public.products for delete to authenticated using ((select public.is_store_admin(store_id)));

create policy "variants_read" on public.product_variants for select to anon,authenticated using ((select public.is_store_admin(store_id)) or (active and exists (select 1 from public.products p join public.stores s on s.id=p.store_id where p.id=product_id and p.active and s.is_published)));
create policy "variants_insert" on public.product_variants for insert to authenticated with check ((select public.is_store_admin(store_id)));
create policy "variants_update" on public.product_variants for update to authenticated using ((select public.is_store_admin(store_id))) with check ((select public.is_store_admin(store_id)));
create policy "variants_delete" on public.product_variants for delete to authenticated using ((select public.is_store_admin(store_id)));

create policy "movements_select" on public.stock_movements for select to authenticated using ((select public.is_store_admin(store_id)));
create policy "movements_insert" on public.stock_movements for insert to authenticated with check ((select public.is_store_admin(store_id)) and actor_user_id=(select auth.uid()));

create policy "orders_admin" on public.orders for select to authenticated using ((select public.is_store_admin(store_id)));
create policy "order_items_admin" on public.order_items for select to authenticated using ((select public.is_store_admin(store_id)));
create policy "payments_admin" on public.payments for select to authenticated using ((select public.is_store_admin(store_id)));
create policy "fiscal_admin" on public.fiscal_documents for select to authenticated using ((select public.is_store_admin(store_id)));
create policy "shipping_admin" on public.shipping_methods for select to authenticated using ((select public.is_store_admin(store_id)));

-- Estoque é alterado sob bloqueio da variante; falhas não geram histórico parcial.
create or replace function public.adjust_inventory(p_variant_id uuid,p_delta integer,p_reason text)
returns integer language plpgsql security invoker set search_path=public as $$
declare
 v_store uuid;
 v_quantity integer;
begin
 if p_delta=0 or abs(p_delta)>500000 or length(trim(coalesce(p_reason,''))) not between 3 and 300 then
   raise exception 'Movimentação inválida';
 end if;
 select store_id into v_store from public.product_variants where id=p_variant_id for update;
 if not found or not public.is_store_admin(v_store) then raise exception 'Acesso negado'; end if;
 update public.product_variants set stock_on_hand=stock_on_hand+p_delta
 where id=p_variant_id and stock_on_hand+p_delta>=reserved and stock_on_hand+p_delta>=0
 returning stock_on_hand into v_quantity;
 if not found then raise exception 'Estoque insuficiente'; end if;
 insert into public.stock_movements(store_id,variant_id,delta,reason,actor_user_id)
 values(v_store,p_variant_id,p_delta,trim(p_reason),(select auth.uid()));
 return v_quantity;
end
$$;
revoke execute on function public.adjust_inventory(uuid,integer,text) from public,anon;
grant execute on function public.adjust_inventory(uuid,integer,text) to authenticated;

-- Sem políticas públicas para criar pedidos, confirmar pagamento ou emitir NF-e.
-- Estas operações exigirão endpoints privados, verificação de webhook e idempotência.
