-- ============================================================================
-- THE SONIC MEDIA: UNIVERSAL VISUAL BUILDER FOR ALL CONTENT TYPES
-- Supports Portfolio Projects, Case Studies, and Journal Articles
-- File: supabase/migrations/20261020_universal_visual_builder.sql
-- ============================================================================

-- STEP 1: Add published sections column to case_studies & journal_posts
ALTER TABLE public.case_studies
  ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE public.journal_posts
  ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]'::jsonb NOT NULL;

-- STEP 2: Add content_type column to portfolio_drafts so drafts work universally
ALTER TABLE public.portfolio_drafts
  ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'portfolio' NOT NULL;

-- Optional comment for documentation
COMMENT ON COLUMN public.portfolio_drafts.content_type IS 'Target collection: portfolio, casestudies, or journal';
