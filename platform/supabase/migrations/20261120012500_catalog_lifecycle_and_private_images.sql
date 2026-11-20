-- Sprint 3.3 | catalog lifecycle, variants and private product media
-- Applied only to the dedicated Atelier Commerce DEVELOPMENT project.
alter table public.products add column if not exists archived_at timestamptz;
create index if not exists products_store_archived_idx
 on public.products(store_id, archived_at, created_at desc);

-- Prevent even authorized operators of multiple stores from reassigning row identity.
create or replace function app_private.prevent_catalog_reparent()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if (tg_table_name = 'products' and new.store_id is distinct from old.store_id)
    or (tg_table_name = 'product_variants' and (
      new.store_id is distinct from old.store_id or new.product_id is distinct from old.product_id
    )) then
   raise exception 'Não é permitido transferir o cadastro entre lojas ou produtos';
 end if;
 return new;
end
$$;
revoke all on function app_private.prevent_catalog_reparent() from public;
drop trigger if exists prevent_product_reparent on public.products;
create trigger prevent_product_reparent
 before update on public.products for each row
 execute function app_private.prevent_catalog_reparent();
drop trigger if exists prevent_variant_reparent on public.product_variants;
create trigger prevent_variant_reparent
 before update on public.product_variants for each row
 execute function app_private.prevent_catalog_reparent();

-- Archiving is reversible. Deleting products breaks catalog/order references.
drop policy if exists "products_delete" on public.products;
drop policy if exists "products_published_read" on public.products;
create policy "products_published_read" on public.products
 for select to anon, authenticated
 using (active and archived_at is null and exists (
  select 1 from public.stores s where s.id = store_id and s.is_published
 ));
drop policy if exists "variants_published_read" on public.product_variants;
create policy "variants_published_read" on public.product_variants
 for select to anon, authenticated
 using (active and exists (
  select 1 from public.products p
  join public.stores s on s.id = p.store_id
  where p.id=product_id and p.active and p.archived_at is null and s.is_published
 ));

-- Add or update a SKU atomically. Stock balance remains RPC-only.
create or replace function app_private.save_product_variant(
 p_store_id uuid, p_product_id uuid, p_variant_id uuid,
 p_sku text, p_label text, p_barcode text, p_attributes jsonb,
 p_initial_stock integer
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
 if (select auth.uid()) is null or not public.is_store_admin(p_store_id) then
   raise exception 'Acesso negado';
 end if;
 if not exists (select 1 from public.products where id=p_product_id
   and store_id=p_store_id and archived_at is null) then
   raise exception 'Produto indisponível';
 end if;
 if length(trim(coalesce(p_sku,''))) not between 2 and 80
    or length(trim(coalesce(p_label,''))) not between 1 and 80
    or length(coalesce(p_barcode,'')) > 80
    or p_attributes is null or jsonb_typeof(p_attributes) <> 'object'
    or p_initial_stock is null or p_initial_stock < 0 or p_initial_stock > 500000 then
   raise exception 'Variante inválida';
 end if;
 if p_variant_id is null then
   insert into public.product_variants(store_id,product_id,sku,label,barcode,attributes,stock_on_hand)
   values (p_store_id,p_product_id,trim(p_sku),trim(p_label),
     nullif(trim(p_barcode),''),p_attributes,p_initial_stock)
   returning id into v_id;
   if p_initial_stock > 0 then
     insert into public.stock_movements(store_id,variant_id,delta,reason,actor_user_id)
     values (p_store_id,v_id,p_initial_stock,'Estoque inicial da variante',(select auth.uid()));
   end if;
 else
   if p_initial_stock <> 0 then raise exception 'Atualize estoque somente pela movimentação'; end if;
   update public.product_variants
     set sku=trim(p_sku),label=trim(p_label),
     barcode=nullif(trim(p_barcode),''),attributes=p_attributes
    where id=p_variant_id and store_id=p_store_id and product_id=p_product_id
    returning id into v_id;
   if v_id is null then raise exception 'Variante não encontrada'; end if;
 end if;
 return v_id;
end
$$;
revoke all on function app_private.save_product_variant(uuid,uuid,uuid,text,text,text,jsonb,integer) from public, anon;
grant execute on function app_private.save_product_variant(uuid,uuid,uuid,text,text,text,jsonb,integer) to authenticated;
create or replace function public.save_product_variant(
 p_store_id uuid,p_product_id uuid,p_variant_id uuid,
 p_sku text,p_label text,p_barcode text,p_attributes jsonb,p_initial_stock integer
)
returns uuid language sql security invoker set search_path = ''
as $$
 select app_private.save_product_variant(p_store_id,p_product_id,p_variant_id,p_sku,p_label,p_barcode,p_attributes,p_initial_stock)
$$;
revoke all on function public.save_product_variant(uuid,uuid,uuid,text,text,text,jsonb,integer) from public, anon;
grant execute on function public.save_product_variant(uuid,uuid,uuid,text,text,text,jsonb,integer) to authenticated;

-- Never grant broad writes to product_variants or stock_movements.
revoke insert, update, delete on public.product_variants,public.stock_movements
 from public,anon,authenticated;
revoke delete on public.products from public,anon,authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 values ('catalog-images','catalog-images',false,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict (id) do update set public=false,file_size_limit=5242880,
 allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- A path is <store_uuid>/<product_uuid>/<random_uuid>.<extension>.
-- Protect public reads by checking BOTH publication and an attached image path.
create policy "atelier_catalog_image_public_read" on storage.objects
 for select to anon,authenticated
 using (bucket_id='catalog-images' and exists (
   select 1 from public.products p
   join public.stores s on s.id=p.store_id
   where s.is_published and p.active and p.archived_at is null
   and name=any(p.images)
   and name like p.store_id::text || '/' || p.id::text || '/%'
 ));
create policy "atelier_catalog_image_member_read" on storage.objects
 for select to authenticated
 using (bucket_id='catalog-images' and exists (
   select 1 from public.products p
   where name like p.store_id::text || '/' || p.id::text || '/%'
   and public.is_store_admin(p.store_id)
 ));
create policy "atelier_catalog_image_member_insert" on storage.objects
 for insert to authenticated
 with check (bucket_id='catalog-images' and exists (
   select 1 from public.products p
   where name like p.store_id::text || '/' || p.id::text || '/%'
   and p.archived_at is null and public.is_store_admin(p.store_id)
 ));
create policy "atelier_catalog_image_member_delete" on storage.objects
 for delete to authenticated
 using (bucket_id='catalog-images' and exists (
   select 1 from public.products p
   where name like p.store_id::text || '/' || p.id::text || '/%'
   and public.is_store_admin(p.store_id)
 ));
