-- Run this entire file in Supabase SQL Editor.
-- IMPORTANT: the admin role is assigned manually below, never by a public signup form.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'reader' check (role in ('reader','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  body text not null,
  author_name text not null,
  author_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key text primary key,
  content text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  email text not null,
  title text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.site_content enable row level security;
alter table public.submissions enable row level security;

-- A signed-in user may read only their own profile/role.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select
using (auth.uid() = id);

-- Helper checks the signed-in user's role.
create or replace function public.is_site_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Anyone can read published articles, but only the admin can create/update/delete articles.
drop policy if exists "Published articles are public" on public.articles;
create policy "Published articles are public" on public.articles for select
using (status = 'published' or public.is_site_admin());

drop policy if exists "Admin inserts articles" on public.articles;
create policy "Admin inserts articles" on public.articles for insert
with check (public.is_site_admin());

drop policy if exists "Admin updates articles" on public.articles;
create policy "Admin updates articles" on public.articles for update
using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "Admin deletes articles" on public.articles;
create policy "Admin deletes articles" on public.articles for delete
using (public.is_site_admin());

drop policy if exists "About content public read" on public.site_content;
create policy "About content public read" on public.site_content for select using (true);

drop policy if exists "Admin manages content" on public.site_content;
create policy "Admin manages content" on public.site_content for all
using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "Anyone can submit for review" on public.submissions;
create policy "Anyone can submit for review" on public.submissions for insert
with check (
  length(trim(author_name)) between 1 and 80 and
  length(trim(email)) between 3 and 200 and
  length(trim(title)) between 1 and 160 and
  length(trim(body)) between 1 and 30000
);

drop policy if exists "Only admin can read submissions" on public.submissions;
create policy "Only admin can read submissions" on public.submissions for select
using (public.is_site_admin());

drop policy if exists "Only admin can review submissions" on public.submissions;
create policy "Only admin can review submissions" on public.submissions for update
using (public.is_site_admin()) with check (public.is_site_admin());

drop policy if exists "Only admin can delete submissions" on public.submissions;
create policy "Only admin can delete submissions" on public.submissions for delete
using (public.is_site_admin());

-- Create your account in Supabase Authentication first, then replace YOUR_AUTH_USER_UUID
-- below with that user's UUID from Authentication > Users and run this statement:
-- insert into public.profiles (id, role) values ('YOUR_AUTH_USER_UUID', 'admin')
-- on conflict (id) do update set role = 'admin';

-- Optional: add an initial About page:
insert into public.site_content(key, content)
values ('about', 'Hey, I’m Miles. This is my personal corner of the internet — a place for my writing, interests, projects, and ideas.')
on conflict (key) do nothing;
