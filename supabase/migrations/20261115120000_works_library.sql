create table if not exists public.site_works (
  id uuid primary key default gen_random_uuid(),
  title_ru text not null,
  title_fr text not null,
  title_en text not null,
  description_ru text not null default '',
  description_fr text not null default '',
  description_en text not null default '',
  cover_url text not null,
  file_url text not null,
  file_name text not null,
  year integer not null default 2026,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_works enable row level security;
grant select, insert, update, delete on public.site_works to service_role;

drop policy if exists "site admins manage works" on public.site_works;
create policy "site admins manage works"
  on public.site_works for all to authenticated
  using (exists (select 1 from public.site_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.site_admins where user_id = (select auth.uid())));

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf'],
    file_size_limit = 16777216
where id = 'site-media';
