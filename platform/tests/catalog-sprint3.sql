-- Sprint 3.3 — non-destructive database smoke test. DEVELOPMENT ONLY.
-- Run the entire script in the SQL Editor, never individual statements.
-- All data changes are rolled back.
begin;
select set_config('qa.store_id',(select id::text from public.stores order by created_at limit 1),true);
select set_config('request.jwt.claim.sub',
 (select owner_user_id::text from public.stores where id=current_setting('qa.store_id')::uuid),true);
set local role authenticated;

select set_config('qa.product_id',public.create_product_with_initial_stock(
 current_setting('qa.store_id')::uuid,'QA produto sprint 3','qa-produto-sprint-3',
 'Teste de catalogo reversivel',null,3500,null,'QA-SPRINT3-PADRAO',3,false
)::text,true);

select set_config('qa.variant_id',public.save_product_variant(
 current_setting('qa.store_id')::uuid,current_setting('qa.product_id')::uuid,
 null,'QA-SPRINT3-VERDE','Verde / M',null,
 '{"color":"Verde","size":"M"}'::jsonb,4
)::text,true);

select public.save_product_variant(
 current_setting('qa.store_id')::uuid,current_setting('qa.product_id')::uuid,
 current_setting('qa.variant_id')::uuid,'QA-SPRINT3-VERDE','Verde / G','BARCODE123',
 '{"color":"Verde","size":"G"}'::jsonb,0
);

do $$
begin
 if (select count(*) from public.product_variants
     where product_id=current_setting('qa.product_id')::uuid) <> 2
     or (select stock_on_hand from public.product_variants
       where id=current_setting('qa.variant_id')::uuid) <> 4
     or (select count(*) from public.stock_movements
       where variant_id=current_setting('qa.variant_id')::uuid) <> 1 then
    raise exception 'Variant RPC returned inconsistent data';
 end if;
 if has_table_privilege('authenticated','public.product_variants','UPDATE') then
    raise exception 'Authenticated users can update stock directly';
 end if;
end $$;

-- Make store and the item visible within this transaction only.
reset role;
update public.stores set is_published=true where id=current_setting('qa.store_id')::uuid;
update public.products set active=true where id=current_setting('qa.product_id')::uuid;
set local role anon;
do $$
begin
 if not exists (select 1 from public.products where id=current_setting('qa.product_id')::uuid)
 then raise exception 'Published product not visible'; end if;
end $$;
reset role;
update public.products set archived_at=now(),active=false where id=current_setting('qa.product_id')::uuid;
set local role anon;
do $$
begin
 if exists (select 1 from public.products where id=current_setting('qa.product_id')::uuid)
 then raise exception 'Archived product exposed to visitor'; end if;
end $$;
reset role;

do $$
begin
 if (select public from storage.buckets where id='catalog-images') is distinct from false
 then raise exception 'Product media bucket is not private'; end if;
end $$;
rollback;
select 'PASS: variant and archive smoke test, rollback complete' as status;
