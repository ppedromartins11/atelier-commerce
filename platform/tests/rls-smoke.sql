-- Sprint 3.2 — real RLS smoke test on a dedicated DEVELOPMENT database.
-- Execute the ENTIRE script as a PostgreSQL administrator in the SQL Editor.
-- Requires at least one private shop with its owner membership.
-- It impersonates role authenticated/anon and ALWAYS rolls back its test writes.
-- These checks are DB-level impersonation, NOT a substitute for two real Auth sessions.
BEGIN;
SELECT set_config('qa.store_id',(SELECT id::text FROM public.stores ORDER BY created_at LIMIT 1),true);
SELECT set_config('request.jwt.claim.sub',
  (SELECT owner_user_id::text FROM public.stores WHERE id=current_setting('qa.store_id')::uuid),true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.stores WHERE id=current_setting('qa.store_id')::uuid) THEN
    RAISE EXCEPTION 'Owner cannot read its private store';
  END IF;
END $$;
SELECT set_config('qa.product_id',public.create_product_with_initial_stock(
 current_setting('qa.store_id')::uuid, 'QA RLS temporario', 'qa-rls-temporario',
 'Produto reversivel para teste', NULL, 3000, NULL, 'QA-RLS-SKU-1', 7, false
)::text,true);
SELECT set_config('qa.variant_id',
 (SELECT id::text FROM public.product_variants
  WHERE product_id=current_setting('qa.product_id')::uuid LIMIT 1),true);
DO $$
BEGIN
  IF (SELECT stock_on_hand FROM public.product_variants WHERE id=current_setting('qa.variant_id')::uuid) <> 7
    OR (SELECT count(*) FROM public.stock_movements WHERE variant_id=current_setting('qa.variant_id')::uuid) <> 1 THEN
    RAISE EXCEPTION 'Product + initial stock RPC is not atomic';
  END IF;
  IF has_table_privilege('authenticated','public.product_variants','UPDATE') THEN
    RAISE EXCEPTION 'Direct inventory UPDATE should be forbidden';
  END IF;
END $$;
SELECT public.adjust_inventory(current_setting('qa.variant_id')::uuid,3,'QA ajuste temporario');
DO $$
BEGIN
  IF (SELECT stock_on_hand FROM public.product_variants WHERE id=current_setting('qa.variant_id')::uuid) <> 10
    OR (SELECT count(*) FROM public.stock_movements WHERE variant_id=current_setting('qa.variant_id')::uuid) <> 2 THEN
    RAISE EXCEPTION 'Stock RPC left inconsistent history';
  END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.stores WHERE id=current_setting('qa.store_id')::uuid)
    OR EXISTS (SELECT 1 FROM public.products WHERE id=current_setting('qa.product_id')::uuid) THEN
    RAISE EXCEPTION 'Other authenticated user can read private store or product';
  END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.stores WHERE id=current_setting('qa.store_id')::uuid)
    OR EXISTS (SELECT 1 FROM public.products WHERE id=current_setting('qa.product_id')::uuid)
    OR EXISTS (SELECT 1 FROM public.product_variants WHERE id=current_setting('qa.variant_id')::uuid) THEN
    RAISE EXCEPTION 'Anonymous user can read unpublished objects';
  END IF;
  PERFORM count(*) FROM public.categories; -- Also detects anon permission errors.
END $$;
RESET ROLE;
UPDATE public.stores SET is_published=true WHERE id=current_setting('qa.store_id')::uuid;
UPDATE public.products SET active=true WHERE id=current_setting('qa.product_id')::uuid;
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id=current_setting('qa.store_id')::uuid)
    OR NOT EXISTS (SELECT 1 FROM public.products WHERE id=current_setting('qa.product_id')::uuid)
    OR NOT EXISTS (SELECT 1 FROM public.product_variants WHERE id=current_setting('qa.variant_id')::uuid) THEN
    RAISE EXCEPTION 'Published storefront is not visible to visitors';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: DB RLS smoke test passed (changes rolled back)' AS status;
