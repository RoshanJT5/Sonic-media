-- Read-path indexes for the admin dashboard and published collection pages.
-- These are non-destructive and preserve all existing table behaviour.

create index if not exists portfolio_items_status_display_order_idx
  on public.portfolio_items (status, display_order);

create index if not exists case_studies_status_display_order_idx
  on public.case_studies (status, display_order);

create index if not exists journal_posts_status_display_order_idx
  on public.journal_posts (status, display_order);

create index if not exists portfolio_drafts_updated_at_idx
  on public.portfolio_drafts (updated_at desc);
