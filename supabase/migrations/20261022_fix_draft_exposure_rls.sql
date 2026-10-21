-- ============================================================================
-- THE SONIC MEDIA: FIX DRAFT EXPOSURE ON CASE STUDIES & JOURNAL POSTS
-- Migration: supabase/migrations/20261022_fix_draft_exposure_rls.sql
-- ============================================================================
-- Problem: Previous policies on case_studies and journal_posts had permissive
-- SELECT with `qual: true` for role {public}, allowing anonymous visitors to
-- read unpublished draft case studies and articles.
-- Resolution: Restrict anonymous SELECT to published items only, and grant
-- full SELECT to authenticated admins verified via private.is_admin().

-- 1. Tighten public read on case_studies to published only
DROP POLICY IF EXISTS "Public read case_studies" ON public.case_studies;
DROP POLICY IF EXISTS "Public read published case_studies" ON public.case_studies;
CREATE POLICY "Public read published case_studies"
ON public.case_studies FOR SELECT TO anon
USING (status = 'published');

DROP POLICY IF EXISTS "Admin read all case_studies" ON public.case_studies;
CREATE POLICY "Admin read all case_studies"
ON public.case_studies FOR SELECT TO authenticated
USING ((SELECT private.is_admin()));

-- 2. Tighten public read on journal_posts to published only
DROP POLICY IF EXISTS "Public read journal_posts" ON public.journal_posts;
DROP POLICY IF EXISTS "Public read published journal_posts" ON public.journal_posts;
CREATE POLICY "Public read published journal_posts"
ON public.journal_posts FOR SELECT TO anon
USING (status = 'published');

DROP POLICY IF EXISTS "Admin read all journal_posts" ON public.journal_posts;
CREATE POLICY "Admin read all journal_posts"
ON public.journal_posts FOR SELECT TO authenticated
USING ((SELECT private.is_admin()));
