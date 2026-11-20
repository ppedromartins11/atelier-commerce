-- Sprint 4.1 — homologacao RLS (ambiente de DESENVOLVIMENTO).
-- User and store fixtures are created in a single transaction and discarded.
-- Execute the entire file, never fragments. This impersonates PostgreSQL JWT
-- claims; it is NOT a replacement for two real Supabase Auth browser sessions.
begin;
with u as (
 insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(gen_random_uuid(),'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 'qa-homologacao-a@example.invalid',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}',now(),now()) returning id
) select set_config('qa.a',id::text,true) from u;
with u as (
 insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values(gen_random_uuid(),'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
 'qa-homologacao-b@example.invalid',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{}',now(),now()) returning id
) select set_config('qa.b',id::text,true) from u;

-- Owner A creates its store, one category and one product.
select set_config('request.jwt.claim.sub',current_setting('qa.a'),true),
 set_config('request.jwt.claims',
 jsonb_build_object('sub',current_setting('qa.a'),'email','qa-homologacao-a@example.invalid','role','authenticated')::text,true);
set local role authenticated;
with s as (insert into public.stores(name,slug,owner_user_id,is_published)
 values('QA Homologacao A','qa-homologacao-a-'||left(current_setting('qa.a'),8),
 current_setting('qa.a')::uuid,false) returning id)
 select set_config('qa.sa',id::text,true) from s;
with c as (insert into public.categories(store_id,name,slug)
 values(current_setting('qa.sa')::uuid,'QA Categoria A','qa-categoria-a') returning id)
 select set_config('qa.ca',id::text,true) from c;
select set_config('qa.pa',public.create_product_with_initial_stock(
 current_setting('qa.sa')::uuid,'QA Produto A','qa-produto-a','QA temporario',
 null,1990,current_setting('qa.ca')::uuid,'QA-SKU-A41',5,true)::text,true);

do $$
begin
 if (select count(*) from public.store_members
  where store_id=current_setting('qa.sa')::uuid and role='owner')<>1
 or (select count(*) from public.products where id=current_setting('qa.pa')::uuid)<>1 then
  raise exception 'FAILED: Owner A onboarding/catalog';
 end if;
end $$;

-- B owns another private store, with no rights over A.
reset role;
select set_config('request.jwt.claim.sub',current_setting('qa.b'),true),
 set_config('request.jwt.claims',
 jsonb_build_object('sub',current_setting('qa.b'),'email','qa-homologacao-b@example.invalid','role','authenticated')::text,true);
set local role authenticated;
with s as (insert into public.stores(name,slug,owner_user_id,is_published)
 values('QA Homologacao B','qa-homologacao-b-'||left(current_setting('qa.b'),8),
 current_setting('qa.b')::uuid,false) returning id)
 select set_config('qa.sb',id::text,true) from s;
do $$
begin
 if exists(select 1 from public.stores where id=current_setting('qa.sa')::uuid)
 or exists(select 1 from public.products where id=current_setting('qa.pa')::uuid)
 or exists(select 1 from public.categories where id=current_setting('qa.ca')::uuid)
 or exists(select 1 from public.product_variants where store_id=current_setting('qa.sa')::uuid)
 or exists(select 1 from public.stock_movements where store_id=current_setting('qa.sa')::uuid) then
  raise exception 'FAILED: Cross-tenant private read';
 end if;
 begin
  perform public.create_product_with_initial_stock(
   current_setting('qa.sa')::uuid,'Invasao','invasao',null,null,
   1400,null,'QA-ILLEGAL-SKU',0,false);
  raise exception 'QA_BYPASS: Unauthorized product insert';
 exception when others then
  if sqlerrm='QA_BYPASS: Unauthorized product insert' then raise; end if;
  if sqlerrm<>'Acesso negado' then raise; end if;
 end;
 begin
  insert into public.store_members(store_id,user_id,role)
   values(current_setting('qa.sa')::uuid,current_setting('qa.b')::uuid,'admin');
  raise exception 'QA_BYPASS: Joined without invitation';
 exception when others then
  if sqlerrm='QA_BYPASS: Joined without invitation' then raise; end if;
 end;
end $$;

-- A invites B; B accepts; invite is consumed.
reset role;
select set_config('request.jwt.claim.sub',current_setting('qa.a'),true),
 set_config('request.jwt.claims',
 jsonb_build_object('sub',current_setting('qa.a'),'email','qa-homologacao-a@example.invalid','role','authenticated')::text,true);
set local role authenticated;
with i as (insert into public.store_invitations(store_id,email,role,invited_by)
values(current_setting('qa.sa')::uuid,'qa-homologacao-b@example.invalid',
'admin',current_setting('qa.a')::uuid) returning id)
 select set_config('qa.invite',id::text,true) from i;
reset role;
select set_config('request.jwt.claim.sub',current_setting('qa.b'),true),
 set_config('request.jwt.claims',
 jsonb_build_object('sub',current_setting('qa.b'),'email','qa-homologacao-b@example.invalid','role','authenticated')::text,true);
set local role authenticated;
do $$
begin
 if not exists(select 1 from public.store_invitations
 where id=current_setting('qa.invite')::uuid)
 or not exists(select 1 from public.stores where id=current_setting('qa.sa')::uuid)
 then raise exception 'FAILED: invitation visibility'; end if;
end $$;
insert into public.store_members(store_id,user_id,role)
 values(current_setting('qa.sa')::uuid,current_setting('qa.b')::uuid,'admin');
do $$
begin
 if not exists(select 1 from public.products where id=current_setting('qa.pa')::uuid)
 or not exists(select 1 from public.store_invitations
  where id=current_setting('qa.invite')::uuid and accepted_at is not null)
 then raise exception 'FAILED: invitation acceptance'; end if;
end $$;

-- Admin cannot change owner-only store settings.
update public.stores set name='ILLEGAL ADMIN UPDATE'
where id=current_setting('qa.sa')::uuid;
reset role;
select set_config('request.jwt.claim.sub',current_setting('qa.a'),true),
 set_config('request.jwt.claims',
 jsonb_build_object('sub',current_setting('qa.a'),'email','qa-homologacao-a@example.invalid','role','authenticated')::text,true);
set local role authenticated;
do $$
begin
 if exists(select 1 from public.stores where id=current_setting('qa.sa')::uuid
 and name='ILLEGAL ADMIN UPDATE') then
  raise exception 'FAILED: Admin changed store identity';
 end if;
end $$;
delete from public.store_members
 where store_id=current_setting('qa.sa')::uuid
 and user_id=current_setting('qa.b')::uuid and role='admin';

reset role;
select set_config('request.jwt.claim.sub',current_setting('qa.b'),true),
 set_config('request.jwt.claims',
 jsonb_build_object('sub',current_setting('qa.b'),'email','qa-homologacao-b@example.invalid','role','authenticated')::text,true);
set local role authenticated;
do $$
begin
 if exists(select 1 from public.products where id=current_setting('qa.pa')::uuid)
 then raise exception 'FAILED: Revoked user reads private product'; end if;
 begin
  insert into public.store_members(store_id,user_id,role)
   values(current_setting('qa.sa')::uuid,current_setting('qa.b')::uuid,'admin');
  raise exception 'QA_BYPASS: Reused accepted invitation';
 exception when others then
  if sqlerrm='QA_BYPASS: Reused accepted invitation' then raise; end if;
 end;
end $$;
reset role;
rollback;
select 'PASS: two-tenant registration, isolation, invitations, revocation, owner rights; rollback' as status;
