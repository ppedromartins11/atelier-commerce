-- Sprint 4.1: qualify the outer storage object path in the public media policy.
-- Without qualification, name resolved to stores.name inside the subquery,
-- making published product images inaccessible to anonymous visitors.
drop policy if exists "atelier_catalog_image_public_read" on storage.objects;
create policy "atelier_catalog_image_public_read" on storage.objects
 for select to anon, authenticated
 using (
   bucket_id='catalog-images'
   and exists (
     select 1
     from public.products p
     join public.stores s on s.id=p.store_id
     where s.is_published and p.active and p.archived_at is null
       and storage.objects.name=any(p.images)
       and storage.objects.name like p.store_id::text || '/' || p.id::text || '/%'
   )
 );
