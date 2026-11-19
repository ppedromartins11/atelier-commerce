-- Sprint 3.2: public storefront policies must not invoke member-only lookups.
-- Anonymous visitors lack SELECT on store_members, so is_store_admin (invoker)
-- must never run inside a policy that targets role anon.
drop policy if exists "stores_visible" on public.stores;
create policy "stores_published_read" on public.stores
  for select to anon, authenticated using (is_published);
create policy "stores_member_read" on public.stores
  for select to authenticated using ((select public.is_store_admin(id)));

drop policy if exists "categories_read" on public.categories;
create policy "categories_published_read" on public.categories
  for select to anon, authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.is_published));
create policy "categories_member_read" on public.categories
  for select to authenticated using ((select public.is_store_admin(store_id)));

drop policy if exists "products_read" on public.products;
create policy "products_published_read" on public.products
  for select to anon, authenticated
  using (active and exists (select 1 from public.stores s where s.id = store_id and s.is_published));
create policy "products_member_read" on public.products
  for select to authenticated using ((select public.is_store_admin(store_id)));

drop policy if exists "variants_read" on public.product_variants;
create policy "variants_published_read" on public.product_variants
  for select to anon, authenticated
  using (
    active and exists (
      select 1 from public.products p
      join public.stores s on s.id = p.store_id
      where p.id = product_id and p.active and s.is_published
    )
  );
create policy "variants_member_read" on public.product_variants
  for select to authenticated using ((select public.is_store_admin(store_id)));
