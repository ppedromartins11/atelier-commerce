-- Sprint 4.1 Storage RLS regression. Requires an existing unpublished store.
-- Creates only database metadata (NOT a physical image object). All changes roll back.
-- Does not verify HTTP Storage upload/download/signing or browser rendering.
begin;
select set_config('qa.shop',
 (select id::text from public.stores where is_published=false order by created_at limit 1),true);
select set_config('request.jwt.claim.sub',
 (select owner_user_id::text from public.stores where id=current_setting('qa.shop')::uuid),true);
set local role authenticated;
select set_config('qa.product',public.create_product_with_initial_stock(
 current_setting('qa.shop')::uuid,'QA Imagem RLS','qa-imagem-rls',
 null,null,1500,null,'QA-IMAGE-H41',0,true)::text,true);
select set_config('qa.path',
 current_setting('qa.shop')||'/'||current_setting('qa.product')||'/'||gen_random_uuid()::text||'.png',true);
update public.products set images=ARRAY[current_setting('qa.path')]
where id=current_setting('qa.product')::uuid;
reset role;
insert into storage.objects(bucket_id,name,metadata)
 values('catalog-images',current_setting('qa.path'),'{"mimetype":"image/png","size":500}'::jsonb);
set local role anon;
do $$
begin
 if exists(select 1 from public.products where id=current_setting('qa.product')::uuid)
 or exists(select 1 from storage.objects where name=current_setting('qa.path'))
 then raise exception 'FAILED: unpublished product/media leaked'; end if;
end $$;
reset role;
update public.stores set is_published=true where id=current_setting('qa.shop')::uuid;
set local role anon;
do $$
begin
 if (select count(*) from public.products where id=current_setting('qa.product')::uuid)<>1
 or (select count(*) from storage.objects where name=current_setting('qa.path'))<>1
 then raise exception 'FAILED: published product/media not accessible'; end if;
end $$;
reset role;
update public.products set archived_at=now(),active=false
where id=current_setting('qa.product')::uuid;
set local role anon;
do $$
begin
 if exists(select 1 from public.products where id=current_setting('qa.product')::uuid)
 or exists(select 1 from storage.objects where name=current_setting('qa.path'))
 then raise exception 'FAILED: archived product/media still public'; end if;
end $$;
reset role;
rollback;
select 'PASS: public storage metadata RLS, draft/published/archive; rollback' as status;
