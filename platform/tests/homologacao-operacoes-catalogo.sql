-- Sprint 4.1 catalogue/category/domain smoke test. DEV only; all writes roll back.
begin;
select set_config('qa.shop',(select id::text from public.stores where is_published=false limit 1),true);
select set_config('qa.owner',(select owner_user_id::text from public.stores where id=current_setting('qa.shop')::uuid),true);
select set_config('request.jwt.claim.sub',current_setting('qa.owner'),true);
set local role authenticated;
do $$
begin
 begin
  perform public.import_catalog_batch(current_setting('qa.shop')::uuid,
   '[{"title":"QA CSV 41 A","slug":"qa-csv-41-a","sku":"QA-CSV41-DUP","price_cents":1990,"stock":2,"description":"","category_id":null},
     {"title":"QA CSV 41 B","slug":"qa-csv-41-b","sku":"QA-CSV41-DUP","price_cents":2500,"stock":1,"description":"","category_id":null}]'::jsonb);
  raise exception 'QA_BYPASS: invalid CSV imported';
 exception when others then
  if sqlerrm='QA_BYPASS: invalid CSV imported' then raise; end if;
 end;
 if exists(select 1 from public.products where slug='qa-csv-41-a') then
  raise exception 'FAILED: partial CSV import persisted';
 end if;
end $$;
select public.import_catalog_batch(current_setting('qa.shop')::uuid,
 '[{"title":"QA CSV 41 OK A","slug":"qa-csv-41-ok-a","sku":"QA-CSV41-OKA","price_cents":1990,"stock":2,"description":"","category_id":null},
   {"title":"QA CSV 41 OK B","slug":"qa-csv-41-ok-b","sku":"QA-CSV41-OKB","price_cents":2500,"stock":0,"description":"","category_id":null}]'::jsonb);
do $$
begin
 if (select count(*) from public.products where slug in ('qa-csv-41-ok-a','qa-csv-41-ok-b'))<>2
 or (select count(*) from public.product_variants where sku in ('QA-CSV41-OKA','QA-CSV41-OKB'))<>2
 or (select count(*) from public.products where slug in ('qa-csv-41-ok-a','qa-csv-41-ok-b') and active=false)<>2 then
  raise exception 'FAILED: valid CSV batch was incomplete';
 end if;
end $$;
select set_config('qa.product',(select id::text from public.products where slug='qa-csv-41-ok-a'),true);
select set_config('qa.image',current_setting('qa.shop')||'/'||current_setting('qa.product')||'/'||gen_random_uuid()||'.png',true);
select public.attach_catalog_image(current_setting('qa.shop')::uuid,current_setting('qa.product')::uuid,current_setting('qa.image'));
do $$
begin
 if not exists(select 1 from public.products where id=current_setting('qa.product')::uuid and current_setting('qa.image')=any(images)) then
  raise exception 'FAILED: image attach';
 end if;
end $$;
select public.detach_catalog_image(current_setting('qa.shop')::uuid,current_setting('qa.product')::uuid,current_setting('qa.image'));
do $$
begin
 if exists(select 1 from public.products where id=current_setting('qa.product')::uuid and current_setting('qa.image')=any(images)) then
  raise exception 'FAILED: image detach';
 end if;
end $$;
with c as (insert into public.categories(store_id,name,slug)
 values(current_setting('qa.shop')::uuid,'QA Categoria 41','qa-categoria-41') returning id)
select set_config('qa.cat',id::text,true) from c;
update public.categories set name='QA Categoria Renomeada',slug='qa-categoria-renomeada'
 where id=current_setting('qa.cat')::uuid;
do $$
begin
 if not exists(select 1 from public.categories where id=current_setting('qa.cat')::uuid and slug='qa-categoria-renomeada') then
  raise exception 'FAILED: category rename';
 end if;
end $$;
with d as (insert into public.store_domains(store_id,hostname)
values(current_setting('qa.shop')::uuid,'qa-pendente-41.example.invalid') returning id)
select set_config('qa.domain',id::text,true) from d;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$
begin
 if exists(select 1 from public.categories where id=current_setting('qa.cat')::uuid)
 or exists(select 1 from public.store_domains where id=current_setting('qa.domain')::uuid) then
  raise exception 'FAILED: cross tenant category/domain read';
 end if;
 begin
  insert into public.store_domains(store_id,hostname)
  values(current_setting('qa.shop')::uuid,'qa-intruso.example.invalid');
  raise exception 'QA_BYPASS: cross-tenant domain proposal';
 exception when others then
  if sqlerrm='QA_BYPASS: cross-tenant domain proposal' then raise; end if;
 end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('qa.owner'),true);
delete from public.store_domains where id=current_setting('qa.domain')::uuid;
delete from public.categories where id=current_setting('qa.cat')::uuid;
do $$
begin
 if exists(select 1 from public.store_domains where id=current_setting('qa.domain')::uuid)
 or exists(select 1 from public.categories where id=current_setting('qa.cat')::uuid) then
  raise exception 'FAILED: owner delete';
 end if;
end $$;
reset role;
rollback;
select 'PASS: CSV rollback, batch create, images, categories and pending domains; rollback' as status;
