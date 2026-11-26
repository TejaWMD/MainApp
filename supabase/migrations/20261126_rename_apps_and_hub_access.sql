-- ============================================================================
-- MainApp Migration: Rename Websites & Per-User Website Access
-- Safe, non-destructive, idempotent migration for MainApp Supabase
-- (https://omkpwhlvidwyhdivqpoe.supabase.co)
-- ============================================================================

-- 1. Ensure public.users has required columns without touching existing data
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Rename 'Sales Prediction' (prediction) -> 'Purchase' (purchase)
--    and 'QAQC Web' (qaqc) -> 'Factory (QAQC)' (keeping id = 'qaqc')
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'apps') THEN
    -- Handle prediction -> purchase cleanly
    IF EXISTS (SELECT 1 FROM public.apps WHERE id = 'prediction')
       AND NOT EXISTS (SELECT 1 FROM public.apps WHERE id = 'purchase') THEN
      UPDATE public.apps
      SET
        id = 'purchase',
        name = 'Purchase',
        badge = 'Purchase'
      WHERE id = 'prediction';
    ELSIF EXISTS (SELECT 1 FROM public.apps WHERE id = 'purchase') THEN
      UPDATE public.apps
      SET
        name = 'Purchase',
        badge = 'Purchase',
        is_active = TRUE
      WHERE id = 'purchase';

      -- Deactivate legacy prediction row if both existed
      UPDATE public.apps
      SET is_active = FALSE
      WHERE id = 'prediction';
    ELSE
      INSERT INTO public.apps (id, name, url, badge, color, allowed_roles, allowed_departments, is_active)
      VALUES (
        'purchase',
        'Purchase',
        'https://wmgteja.github.io/PredictionSales/',
        'Purchase',
        '#83121c',
        ARRAY['admin'],
        ARRAY['All', 'Purchase'],
        TRUE
      );
    END IF;

    -- Rename QAQC Web -> Factory (QAQC), keeping internal id = 'qaqc'
    UPDATE public.apps
    SET name = 'Factory (QAQC)'
    WHERE id = 'qaqc';
  END IF;
END $$;

-- 3. Update any existing users.accessible_apps entries from 'prediction' -> 'purchase'
--    Supports both text[] and jsonb column types safely.
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type
  INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'accessible_apps';

  IF col_type = 'ARRAY' THEN
    UPDATE public.users
    SET accessible_apps = (
      SELECT ARRAY(
        SELECT DISTINCT CASE WHEN elem = 'prediction' THEN 'purchase' ELSE elem END
        FROM unnest(accessible_apps) AS elem
      )
    )
    WHERE accessible_apps IS NOT NULL
      AND 'prediction' = ANY(accessible_apps);
  ELSIF col_type = 'jsonb' THEN
    UPDATE public.users
    SET accessible_apps = (
      SELECT COALESCE(
        jsonb_agg(DISTINCT to_jsonb(CASE WHEN elem = 'prediction' THEN 'purchase' ELSE elem END)),
        '[]'::jsonb
      )
      FROM jsonb_array_elements_text(accessible_apps) AS elem
    )
    WHERE accessible_apps IS NOT NULL
      AND accessible_apps @> '["prediction"]'::jsonb;
  END IF;
END $$;
