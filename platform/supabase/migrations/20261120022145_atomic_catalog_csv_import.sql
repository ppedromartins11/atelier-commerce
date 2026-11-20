-- Sprint 3.3: atomic CSV batch import, maximum 100 products per request.
-- Every imported item starts as a draft and receives a default variant.
create or replace function app_private.import_catalog_batch(
 p_store_id uuid,p_rows jsonb
)
returns integer language plpgsql security definer set search_path=''
as $$
declare row_data jsonb; v_count integer:=0;
begin
 if (select auth.uid()) is null or not public.is_store_admin(p_store_id) then
  raise exception 'Acesso negado';
 end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array'
    or jsonb_array_length(p_rows) not between 1 and 100 then
  raise exception 'Envie de 1 a 100 produtos por importação';
 end if;
 for row_data in select value from jsonb_array_elements(p_rows) loop
  if jsonb_typeof(row_data)<>'object' then
   raise exception 'Registro CSV inválido';
  end if;
  perform app_private.create_product_with_initial_stock(
    p_store_id,row_data->>'title',row_data->>'slug',
    row_data->>'description',null,(row_data->>'price_cents')::integer,
    nullif(row_data->>'category_id','')::uuid,
    row_data->>'sku',(row_data->>'stock')::integer,false
  );
  v_count:=v_count+1;
 end loop;
 return v_count;
end
$$;
revoke all on function app_private.import_catalog_batch(uuid,jsonb) from public,anon;
grant execute on function app_private.import_catalog_batch(uuid,jsonb) to authenticated;
create or replace function public.import_catalog_batch(p_store_id uuid,p_rows jsonb)
returns integer language sql security invoker set search_path=''
as $$ select app_private.import_catalog_batch(p_store_id,p_rows) $$;
revoke all on function public.import_catalog_batch(uuid,jsonb) from public,anon;
grant execute on function public.import_catalog_batch(uuid,jsonb) to authenticated;
