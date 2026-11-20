-- Sprint 4: repeatable transactional QA. Run ENTIRE file on dedicated dev DB.
-- No test products or stock updates survive the ROLLBACK.
begin;
select set_config('qa.store_id',
 (select id::text from public.stores order by created_at limit 1),true);
select set_config('request.jwt.claim.sub',
 (select owner_user_id::text from public.stores
  where id=current_setting('qa.store_id')::uuid),true);
set local role authenticated;

select set_config('qa.product_id',public.create_product_with_initial_stock(
 current_setting('qa.store_id')::uuid,
 'QA Sprint 4 Estoque','qa-sprint-4-estoque',null,null,
 2000,null,'QA-SPRINT-4-STOCK',7,false
)::text,true);
select set_config('qa.variant_id',(select id::text from public.product_variants
 where product_id=current_setting('qa.product_id')::uuid),true);

select public.set_inventory_reorder_point(current_setting('qa.variant_id')::uuid,5);
do $$
begin
 if (select reorder_point from public.product_variants where id=current_setting('qa.variant_id')::uuid) <> 5 then
   raise exception 'Could not set reorder threshold';
 end if;
 if has_table_privilege('authenticated','public.inventory_counts','INSERT')
 or has_table_privilege('authenticated','public.product_variants','UPDATE') then
   raise exception 'Authenticated user has direct inventory write grants';
 end if;
 if has_function_privilege('anon', 'public.reconcile_inventory_count(uuid,integer,text)', 'EXECUTE') then
   raise exception 'Anonymous user can reconcile inventory';
 end if;
end $$;

-- Admin-only fixture: simulate 3 units reserved for a future transaction.
reset role;
update public.product_variants set reserved=3
 where id=current_setting('qa.variant_id')::uuid;
set local role authenticated;
do $$
begin
 begin
  perform public.reconcile_inventory_count(
    current_setting('qa.variant_id')::uuid,2,'Tentativa inválida');
  raise exception 'FAILED: count below reserved was allowed';
 exception when others then
  if sqlerrm='FAILED: count below reserved was allowed' then raise; end if;
  if sqlerrm<>'Contagem inferior à quantidade reservada' then raise; end if;
 end;
end $$;

select public.reconcile_inventory_count(
 current_setting('qa.variant_id')::uuid,6,'Contagem física de teste');
select public.reconcile_inventory_count(
 current_setting('qa.variant_id')::uuid,6,'Conferência sem diferenças');

do $$
begin
 if (select count(*) from public.inventory_counts
  where variant_id=current_setting('qa.variant_id')::uuid) <> 2
 or (select count(*) from public.stock_movements
  where variant_id=current_setting('qa.variant_id')::uuid) <> 2
 or (select stock_on_hand from public.product_variants
  where id=current_setting('qa.variant_id')::uuid) <> 6 then
   raise exception 'Inventory count or movement history is inconsistent';
 end if;
end $$;

do $$
begin
 begin
  perform public.adjust_inventory(
    current_setting('qa.variant_id')::uuid,-4,'Retirada acima do disponível');
  raise exception 'FAILED: reserved stock was consumed';
 exception when others then
  if sqlerrm='FAILED: reserved stock was consumed' then raise; end if;
  if sqlerrm<>'Estoque insuficiente' then raise; end if;
 end;
end $$;
select public.adjust_inventory(
 current_setting('qa.variant_id')::uuid,-3,'Saída de estoque autorizada');
do $$
begin
 if (select stock_on_hand from public.product_variants
  where id=current_setting('qa.variant_id')::uuid) <> 3
 or (select reserved from public.product_variants
  where id=current_setting('qa.variant_id')::uuid) <> 3
 or (select count(*) from public.stock_movements
  where variant_id=current_setting('qa.variant_id')::uuid) <> 3 then
   raise exception 'Stock was not reconciled or protected correctly';
 end if;
end $$;

select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$
begin
 if exists(select 1 from public.inventory_counts
  where variant_id=current_setting('qa.variant_id')::uuid) then
   raise exception 'Other tenant can read physical counts';
 end if;
 begin
  perform public.set_inventory_reorder_point(
   current_setting('qa.variant_id')::uuid,0);
  raise exception 'FAILED: unauthorized user changed reorder point';
 exception when others then
  if sqlerrm='FAILED: unauthorized user changed reorder point' then raise; end if;
  if sqlerrm<>'Acesso negado' then raise; end if;
 end;
 begin
  perform public.reconcile_inventory_count(
   current_setting('qa.variant_id')::uuid,3,'Tentativa sem autorização');
  raise exception 'FAILED: unauthorized user changed stock';
 exception when others then
  if sqlerrm='FAILED: unauthorized user changed stock' then raise; end if;
  if sqlerrm<>'Acesso negado' then raise; end if;
 end;
end $$;
reset role;
rollback;
select 'PASS: inventory counts, grants, stock reservations, adjustments and RLS; rollback complete' as status;
