-- Public visitors may only read published content. Authenticated admins retain
-- access through the existing authenticated write/read policies.

update public.portfolio_items
set status = case
  when btrim(coalesce(status, '')) = '' then 'published'
  when lower(btrim(coalesce(status, ''))) = 'published' then 'published'
  else 'draft'
end;

update public.case_studies
set status = case
  when btrim(coalesce(status, '')) = '' then 'published'
  when lower(btrim(coalesce(status, ''))) = 'published' then 'published'
  else 'draft'
end;

update public.journal_posts
set status = case
  when btrim(coalesce(status, '')) = '' then 'published'
  when lower(btrim(coalesce(status, ''))) = 'published' then 'published'
  else 'draft'
end;

alter table public.portfolio_items alter column status set default 'draft';
alter table public.case_studies alter column status set default 'draft';
alter table public.journal_posts alter column status set default 'draft';

alter table public.portfolio_items alter column status set not null;
alter table public.case_studies alter column status set not null;
alter table public.journal_posts alter column status set not null;

alter table public.portfolio_items enable row level security;
alter table public.case_studies enable row level security;
alter table public.journal_posts enable row level security;

alter table public.portfolio_items drop constraint if exists portfolio_items_status_check;
alter table public.case_studies drop constraint if exists case_studies_status_check;
alter table public.journal_posts drop constraint if exists journal_posts_status_check;

alter table public.portfolio_items
  add constraint portfolio_items_status_check check (status in ('draft', 'published'));
alter table public.case_studies
  add constraint case_studies_status_check check (status in ('draft', 'published'));
alter table public.journal_posts
  add constraint journal_posts_status_check check (status in ('draft', 'published'));

drop policy if exists "Public read portfolio_items" on public.portfolio_items;
drop policy if exists "Public read case_studies" on public.case_studies;
drop policy if exists "Public read journal_posts" on public.journal_posts;
drop policy if exists "Public read published portfolio_items" on public.portfolio_items;
drop policy if exists "Public read published case_studies" on public.case_studies;
drop policy if exists "Public read published journal_posts" on public.journal_posts;
drop policy if exists "Admin write portfolio_items" on public.portfolio_items;
drop policy if exists "Admin write case_studies" on public.case_studies;
drop policy if exists "Admin write journal_posts" on public.journal_posts;

create policy "Public read published portfolio_items"
on public.portfolio_items for select to anon
using (status = 'published');

create policy "Public read published case_studies"
on public.case_studies for select to anon
using (status = 'published');

create policy "Public read published journal_posts"
on public.journal_posts for select to anon
using (status = 'published');

create policy "Admin write portfolio_items"
on public.portfolio_items for all to authenticated
using (true) with check (true);

create policy "Admin write case_studies"
on public.case_studies for all to authenticated
using (true) with check (true);

create policy "Admin write journal_posts"
on public.journal_posts for all to authenticated
using (true) with check (true);
