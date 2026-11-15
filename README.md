# Hellen Charafoulina

TypeScript monorepo for the multilingual art and collections website.

## Apps

- `apps/web`: React + Vite public site and editor UI.
- `apps/api`: TypeScript API, Supabase Auth checks, content editor endpoints, image upload and optional AI translation.
- `supabase/migrations`: database tables, access policies, image bucket and initial RU/FR/EN content.

## Local setup

1. Install dependencies from the repository root: `npm install`.
2. Copy `apps/api/.env.example` to `apps/api/.env` and fill the Supabase URL, publishable key and server secret key.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` and set the Supabase URL and publishable key.
4. Apply `supabase/migrations/20261115090000_site_content.sql` in the Supabase SQL editor.
5. Run `npm run dev` from the repository root.

The Vite development server proxies `/api` to the local API on port 10000.

## Supabase setup

Create a project in the EU region, then run the migration. In Supabase Auth, create the first editor account. Add its user UUID to `public.site_admins`:

```sql
insert into public.site_admins (user_id) values ('<auth.users.id>');
```

Use the publishable key only in the frontend. Keep the secret key on the API server. The image bucket is public for delivery, while uploads and edits require an authenticated site admin.

## Optional AI translation

Set `OPENAI_API_KEY` on the API server. In the admin panel, select a source language and use “Подготовить перевод”. AI output is a draft; review it and save it explicitly. Optionally set `OPENAI_TRANSLATION_MODEL` to select a model.

## Render

The root `render.yaml` defines one free Node web service that builds and serves the frontend and API together. Connect the `apsevcenco/sharapulina` GitHub repository to Render and use its Blueprint flow. Add the Supabase and OpenAI environment variables in Render. The API serves the built frontend and exposes `/api/health` as its health check.

Render's free web service can sleep when idle and has an ephemeral filesystem. Uploaded images are stored in Supabase Storage, not on the Render instance.
