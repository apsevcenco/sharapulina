create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  page text not null check (page in ('home', 'works', 'collections', 'about', 'journal', 'contacts')),
  locale text not null check (locale in ('ru', 'fr', 'en')),
  nav_label text not null,
  title text not null,
  body text not null default '',
  image_url text not null default '/images/art-nouveau-hero.png',
  image_alt text not null default '',
  updated_at timestamptz not null default now(),
  primary key (page, locale)
);

alter table public.site_admins enable row level security;
alter table public.site_content enable row level security;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.site_admins, public.site_content to service_role;

drop policy if exists "site admins can read own membership" on public.site_admins;
create policy "site admins can read own membership"
  on public.site_admins for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "site admins manage site content" on public.site_content;
create policy "site admins manage site content"
  on public.site_content for all to authenticated
  using (exists (select 1 from public.site_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.site_admins where user_id = (select auth.uid())));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 12582912, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site media admins can upload" on storage.objects;
create policy "site media admins can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and exists (select 1 from public.site_admins where user_id = (select auth.uid())));

drop policy if exists "site media admins can update" on storage.objects;
create policy "site media admins can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and exists (select 1 from public.site_admins where user_id = (select auth.uid())))
  with check (bucket_id = 'site-media' and exists (select 1 from public.site_admins where user_id = (select auth.uid())));

drop policy if exists "site media admins can delete" on storage.objects;
create policy "site media admins can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and exists (select 1 from public.site_admins where user_id = (select auth.uid())));

insert into public.site_content (page, locale, nav_label, title, body, image_url, image_alt) values
  ('home','ru','ГЛАВНАЯ','Hellen Charafoulina','','/images/art-nouveau-hero.png','Женщина в зелёном родстере у здания в стиле ар-деко, ирисы и золотая модерновая рамка'),
  ('works','ru','РАБОТЫ','Работы','Авторские исследования, эссе и визуальные истории о стиле, формах и предметах искусства.','/images/art-nouveau-hero.png','Женщина в зелёном родстере у здания в стиле ар-деко'),
  ('collections','ru','КОЛЛЕКЦИИ','Коллекции','Отобранные предметы, редкие издания и частные собрания с вниманием к истории и происхождению.','/images/art-nouveau-hero.png','Ирисы и архитектурный фон в стиле ар-деко'),
  ('about','ru','О ХУДОЖНИЦЕ','О художнице','Личный взгляд на искусство, где исторический контекст встречается с интуицией коллекционера.','/images/art-nouveau-hero.png','Женщина в зелёном родстере у здания в стиле ар-деко'),
  ('journal','ru','ЖУРНАЛ','Журнал','Заметки о декоративном искусстве, архитектуре, антиквариате и людях, создавших язык эпохи.','/images/art-nouveau-hero.png','Ирисы и архитектурный фон в стиле ар-деко'),
  ('contacts','ru','КОНТАКТЫ','Контакты','Для предложений о проектах, публикациях и частных коллекциях.','/images/art-nouveau-hero.png','Золотая рамка в стиле ар-нуво'),
  ('home','fr','ACCUEIL','Hellen Charafoulina','','/images/art-nouveau-hero.png','Une femme dans un roadster vert devant un bâtiment Art déco, des iris et un cadre doré Art nouveau'),
  ('works','fr','PROJETS','Projets','Recherches, essais et récits visuels autour du style, des formes et des objets d’art.','/images/art-nouveau-hero.png','Une femme dans un roadster vert devant un bâtiment Art déco'),
  ('collections','fr','COLLECTIONS','Collections','Objets choisis, éditions rares et collections privées, présentés avec soin et sens de leur provenance.','/images/art-nouveau-hero.png','Iris et architecture Art déco'),
  ('about','fr','À PROPOS','À propos de l’artiste','Un regard personnel sur l’art, entre contexte historique et intuition de collectionneuse.','/images/art-nouveau-hero.png','Une femme dans un roadster vert devant un bâtiment Art déco'),
  ('journal','fr','JOURNAL','Journal','Notes sur les arts décoratifs, l’architecture, les antiquités et les créateurs d’une époque.','/images/art-nouveau-hero.png','Iris et architecture Art déco'),
  ('contacts','fr','CONTACT','Contact','Pour parler de projets, de publications et de collections privées.','/images/art-nouveau-hero.png','Cadre doré Art nouveau'),
  ('home','en','HOME','Hellen Charafoulina','','/images/art-nouveau-hero.png','A woman in a green roadster beside an Art Deco building, irises and a gilded Art Nouveau frame'),
  ('works','en','PROJECTS','Projects','Original research, essays and visual stories about style, form and works of art.','/images/art-nouveau-hero.png','A woman in a green roadster beside an Art Deco building'),
  ('collections','en','COLLECTIONS','Collections','Selected objects, rare editions and private collections, presented with care for their history and provenance.','/images/art-nouveau-hero.png','Irises and an Art Deco architectural backdrop'),
  ('about','en','ABOUT','About the artist','A personal view of art, where historical context meets the intuition of a collector.','/images/art-nouveau-hero.png','A woman in a green roadster beside an Art Deco building'),
  ('journal','en','JOURNAL','Journal','Notes on decorative arts, architecture, antiques and the people who shaped an era.','/images/art-nouveau-hero.png','Irises and an Art Deco architectural backdrop'),
  ('contacts','en','CONTACT','Contact','For enquiries about projects, publications and private collections.','/images/art-nouveau-hero.png','A gilded Art Nouveau frame')
on conflict (page, locale) do nothing;

-- After creating the first editor in Supabase Auth, grant access with:
-- insert into public.site_admins (user_id) values ('<auth.users.id>');
