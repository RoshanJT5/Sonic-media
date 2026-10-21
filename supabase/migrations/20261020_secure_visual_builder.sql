-- ============================================================================
-- THE SONIC MEDIA: SECURE VISUAL BUILDER & DEDICATED DRAFTS MIGRATION
-- File: supabase/migrations/20261020_secure_visual_builder.sql
-- ============================================================================

-- STEP 1: Add published sections column to portfolio_items
ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]'::jsonb NOT NULL;

-- STEP 2: Create dedicated portfolio_drafts table
CREATE TABLE IF NOT EXISTS public.portfolio_drafts (
  id text PRIMARY KEY,
  name text DEFAULT '' NOT NULL,
  sections jsonb DEFAULT '[]'::jsonb NOT NULL,
  listing_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- STEP 3: Enable RLS and isolate public.portfolio_drafts (Admin only)
ALTER TABLE public.portfolio_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portfolio_drafts FROM anon;
REVOKE ALL ON public.portfolio_drafts FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_drafts TO authenticated;

DROP POLICY IF EXISTS "Admin manage portfolio_drafts" ON public.portfolio_drafts;
CREATE POLICY "Admin manage portfolio_drafts"
ON public.portfolio_drafts
FOR ALL
TO authenticated
USING ((SELECT private.is_admin()))
WITH CHECK ((SELECT private.is_admin()));

-- STEP 4: Tighten public.portfolio_items RLS (Anon reads published only)
ALTER POLICY "Public read portfolio_items"
ON public.portfolio_items
TO anon
USING (status = 'published');

DROP POLICY IF EXISTS "Admin read all portfolio_items" ON public.portfolio_items;
CREATE POLICY "Admin read all portfolio_items"
ON public.portfolio_items
FOR SELECT
TO authenticated
USING ((SELECT private.is_admin()));
