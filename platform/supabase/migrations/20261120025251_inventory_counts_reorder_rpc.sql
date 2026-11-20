-- Sprint 4: inventory counts, reorder thresholds and auditable correction RPCs.
-- Run on the dedicated Atelier Commerce development database only.
alter table public.product_variants
  add column if not exists reorder_point integer not null default 0
    check (reorder_point between 0 and 500000);

alter table public.product_variants
  add constraint product_variants_reasonable_stock
    check (stock_on_hand between 0 and 500000);

create table public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  variant_id uuid not null,
  counted_quantity integer not null check (counted_quantity between 0 and 500000),
  previous_quantity integer not null check (previous_quantity between 0 and 500000),
  delta integer not null,
  reason text not null check (length(trim(reason)) between 3 and 260),
  actor_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (store_id, variant_id) references public.product_variants(store_id, id)
);
create index inventory_counts_store_created_idx
  on public.inventory_counts (store_id, created_at desc);
create index inventory_counts_variant_created_idx
  on public.inventory_counts (variant_id, created_at desc);
alter table public.inventory_counts enable row level security;
revoke all on public.inventory_counts from public, anon, authenticated;
grant select on public.inventory_counts to authenticated;
create policy "inventory_counts_store_read" on public.inventory_counts
  for select to authenticated using ((select public.is_store_admin(store_id)));

-- RLS is no substitute for row-level checks within privileged functions.
-- Reorder points cannot be changed by a direct update on product_variants.
create or replace function app_private.set_inventory_reorder_point(
  p_variant_id uuid, p_reorder_point integer
)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_store_id uuid;
begin
  if (select auth.uid()) is null
     or p_reorder_point is null or p_reorder_point < 0 or p_reorder_point > 500000 then
    raise exception 'Limite mínimo inválido';
  end if;
  select store_id into v_store_id
  from public.product_variants where id=p_variant_id for update;
  if not found or not public.is_store_admin(v_store_id) then
    raise exception 'Acesso negado';
  end if;
  update public.product_variants set reorder_point=p_reorder_point
  where id=p_variant_id;
  return p_reorder_point;
end
$$;
revoke all on function app_private.set_inventory_reorder_point(uuid,integer) from public, anon;
grant execute on function app_private.set_inventory_reorder_point(uuid,integer) to authenticated;
create or replace function public.set_inventory_reorder_point(
  p_variant_id uuid, p_reorder_point integer
)
returns integer language sql security invoker set search_path = ''
as $$
 select app_private.set_inventory_reorder_point(p_variant_id,p_reorder_point)
$$;
revoke all on function public.set_inventory_reorder_point(uuid,integer) from public, anon;
grant execute on function public.set_inventory_reorder_point(uuid,integer) to authenticated;

-- A physical count is serialized with stock adjustments using the same row lock.
-- It records zero-difference counts too; stock_movements still forbids delta=0.
create or replace function app_private.reconcile_inventory_count(
  p_variant_id uuid, p_counted_quantity integer, p_reason text
)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
 v_store_id uuid;
 v_previous integer;
 v_reserved integer;
 v_delta integer;
begin
 if (select auth.uid()) is null
    or p_counted_quantity is null or p_counted_quantity < 0
    or p_counted_quantity > 500000
    or length(trim(coalesce(p_reason,''))) not between 3 and 260 then
   raise exception 'Contagem inválida';
 end if;

 select store_id,stock_on_hand,reserved
 into v_store_id,v_previous,v_reserved
 from public.product_variants where id=p_variant_id for update;
 if not found or not public.is_store_admin(v_store_id) then
   raise exception 'Acesso negado';
 end if;
 if p_counted_quantity < v_reserved then
   raise exception 'Contagem inferior à quantidade reservada';
 end if;
 v_delta := p_counted_quantity-v_previous;

 update public.product_variants set stock_on_hand=p_counted_quantity
 where id=p_variant_id;
 insert into public.inventory_counts
 (store_id,variant_id,counted_quantity,previous_quantity,delta,reason,actor_user_id)
 values
 (v_store_id,p_variant_id,p_counted_quantity,v_previous,v_delta,
  trim(p_reason),(select auth.uid()));

 if v_delta<>0 then
   insert into public.stock_movements
    (store_id,variant_id,delta,reason,actor_user_id)
   values
    (v_store_id,p_variant_id,v_delta,
     'Inventário físico: '||trim(p_reason),(select auth.uid()));
 end if;
 return p_counted_quantity;
end
$$;
revoke all on function app_private.reconcile_inventory_count(uuid,integer,text) from public, anon;
grant execute on function app_private.reconcile_inventory_count(uuid,integer,text) to authenticated;
create or replace function public.reconcile_inventory_count(
  p_variant_id uuid,p_counted_quantity integer,p_reason text
)
returns integer language sql security invoker set search_path = ''
as $$
 select app_private.reconcile_inventory_count(
  p_variant_id,p_counted_quantity,p_reason
 )
$$;
revoke all on function public.reconcile_inventory_count(uuid,integer,text) from public, anon;
grant execute on function public.reconcile_inventory_count(uuid,integer,text) to authenticated;

-- Keep writes to counts, stock totals and movement history restricted to RPCs.
revoke insert,update,delete,truncate,trigger,references
  on public.inventory_counts from public,anon,authenticated;
revoke insert,update,delete on public.product_variants,public.stock_movements
  from public,anon,authenticated;
