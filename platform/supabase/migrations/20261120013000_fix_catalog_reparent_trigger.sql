-- Sprint 3.3: PL/pgSQL record NEW has table-specific fields.
-- Separate branches prevent referencing product_id on public.products.
create or replace function app_private.prevent_catalog_reparent()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 if tg_table_name = 'products' then
   if new.store_id is distinct from old.store_id then
     raise exception 'Não é permitido transferir produto entre lojas';
   end if;
 elsif tg_table_name = 'product_variants' then
   if new.store_id is distinct from old.store_id or
      new.product_id is distinct from old.product_id then
     raise exception 'Não é permitido transferir variante entre lojas ou produtos';
   end if;
 end if;
 return new;
end
$$;
revoke all on function app_private.prevent_catalog_reparent() from public;
