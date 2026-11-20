-- Sprint 3.3: avoid lost updates when multiple images are changed concurrently.
create or replace function app_private.attach_catalog_image(
 p_store_id uuid,p_product_id uuid,p_path text
)
returns text[] language plpgsql security definer set search_path=''
as $$
declare v_images text[];
begin
 if (select auth.uid()) is null or not public.is_store_admin(p_store_id) then
  raise exception 'Acesso negado';
 end if;
 if p_path is null
    or p_path not like p_store_id::text || '/' || p_product_id::text || '/%'
    or p_path !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$' then
  raise exception 'Caminho de imagem inválido';
 end if;
 update public.products set images=array_append(images,p_path)
  where id=p_product_id and store_id=p_store_id and archived_at is null
  and cardinality(images)<8 and not p_path=any(images)
  returning images into v_images;
 if v_images is null then raise exception 'Produto não encontrado ou limite de imagens atingido'; end if;
 return v_images;
end
$$;
revoke all on function app_private.attach_catalog_image(uuid,uuid,text) from public,anon;
grant execute on function app_private.attach_catalog_image(uuid,uuid,text) to authenticated;
create or replace function public.attach_catalog_image(p_store_id uuid,p_product_id uuid,p_path text)
returns text[] language sql security invoker set search_path=''
as $$ select app_private.attach_catalog_image(p_store_id,p_product_id,p_path) $$;
revoke all on function public.attach_catalog_image(uuid,uuid,text) from public,anon;
grant execute on function public.attach_catalog_image(uuid,uuid,text) to authenticated;

create or replace function app_private.detach_catalog_image(p_store_id uuid,p_product_id uuid,p_path text)
returns text[] language plpgsql security definer set search_path=''
as $$
declare v_images text[];
begin
 if (select auth.uid()) is null or not public.is_store_admin(p_store_id) then
  raise exception 'Acesso negado';
 end if;
 update public.products set images=array_remove(images,p_path)
  where id=p_product_id and store_id=p_store_id and p_path=any(images)
  returning images into v_images;
 if v_images is null then raise exception 'Imagem não encontrada'; end if;
 return v_images;
end
$$;
revoke all on function app_private.detach_catalog_image(uuid,uuid,text) from public,anon;
grant execute on function app_private.detach_catalog_image(uuid,uuid,text) to authenticated;
create or replace function public.detach_catalog_image(p_store_id uuid,p_product_id uuid,p_path text)
returns text[] language sql security invoker set search_path=''
as $$ select app_private.detach_catalog_image(p_store_id,p_product_id,p_path) $$;
revoke all on function public.detach_catalog_image(uuid,uuid,text) from public,anon;
grant execute on function public.detach_catalog_image(uuid,uuid,text) to authenticated;
