-- WaterTech Match PIT - Supabase Schema

create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  cnpj text unique not null,
  razao_social text not null,
  municipio text not null,
  uf text not null,
  tags_produtos_servicos text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists municipalities (
  id uuid primary key default gen_random_uuid(),
  cnpj text unique not null,
  nome_prefeitura text not null,
  municipio text not null,
  uf text not null,
  bacia_hidrografica text,
  bacias_hidrograficas text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists fehidro_dictionary (
  id uuid primary key default gen_random_uuid(),
  tipologia_codigo text unique not null,
  descricao_tipologia text not null,
  subpdc_codigo text,
  pdc_codigo text
);

create table if not exists demands (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references municipalities(id) on delete cascade,
  descricao_problema text not null,
  tipologia_sugerida uuid references fehidro_dictionary(id) on delete cascade,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references demands(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  score_compatibilidade numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (demand_id, company_id)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  titulo text not null,
  resumo text,
  valor_custo_empresa numeric not null default 0,
  margem_pit_percentual numeric not null default 0,
  valor_total_fehidro numeric generated always as (
    valor_custo_empresa + (valor_custo_empresa * (margem_pit_percentual / 100))
  ) stored,
  created_at timestamptz not null default now()
);

create index if not exists idx_demands_municipality_id on demands(municipality_id);
create index if not exists idx_demands_tipologia_sugerida on demands(tipologia_sugerida);
create index if not exists idx_matches_demand_id on matches(demand_id);
create index if not exists idx_matches_company_id on matches(company_id);
create index if not exists idx_projects_match_id on projects(match_id);

alter table companies add column if not exists updated_at timestamptz not null default now();
alter table municipalities add column if not exists updated_at timestamptz not null default now();
alter table demands add column if not exists updated_at timestamptz not null default now();
alter table matches add column if not exists updated_at timestamptz not null default now();
alter table projects add column if not exists updated_at timestamptz not null default now();
alter table fehidro_dictionary add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table companies add constraint companies_cnpj_digits_chk check (cnpj ~ '^[0-9]{14}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table municipalities add constraint municipalities_cnpj_digits_chk check (cnpj ~ '^[0-9]{14}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table companies add constraint companies_uf_chk check (uf ~ '^[A-Z]{2}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table municipalities add constraint municipalities_uf_chk check (uf ~ '^[A-Z]{2}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table demands add constraint demands_status_chk check (status in ('open', 'aberta', 'matched', 'closed'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table matches add constraint matches_score_chk check (score_compatibilidade >= 0 and score_compatibilidade <= 100);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table projects add constraint projects_valor_custo_chk check (valor_custo_empresa >= 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table projects add constraint projects_margem_chk check (margem_pit_percentual >= 0 and margem_pit_percentual <= 1000);
exception when duplicate_object then null; end $$;

-- RLS hardening
alter table companies enable row level security;
alter table municipalities enable row level security;
alter table demands enable row level security;
alter table matches enable row level security;
alter table projects enable row level security;
alter table fehidro_dictionary enable row level security;

drop policy if exists "Public read companies" on companies;
create policy "Public read companies" on companies for select using (true);

drop policy if exists "Public read municipalities" on municipalities;
create policy "Public read municipalities" on municipalities for select using (true);

drop policy if exists "Public read demands" on demands;
create policy "Public read demands" on demands for select using (true);

drop policy if exists "Public read matches" on matches;
create policy "Public read matches" on matches for select using (true);

drop policy if exists "Public read projects" on projects;
create policy "Public read projects" on projects for select using (true);

drop policy if exists "Public read fehidro_dictionary" on fehidro_dictionary;
create policy "Public read fehidro_dictionary" on fehidro_dictionary for select using (true);

drop policy if exists "Service role full companies" on companies;
create policy "Service role full companies" on companies
  for all using ((auth.jwt() ->> 'role') = 'service_role')
  with check ((auth.jwt() ->> 'role') = 'service_role');

drop policy if exists "Service role full municipalities" on municipalities;
create policy "Service role full municipalities" on municipalities
  for all using ((auth.jwt() ->> 'role') = 'service_role')
  with check ((auth.jwt() ->> 'role') = 'service_role');

drop policy if exists "Service role full demands" on demands;
create policy "Service role full demands" on demands
  for all using ((auth.jwt() ->> 'role') = 'service_role')
  with check ((auth.jwt() ->> 'role') = 'service_role');

drop policy if exists "Service role full matches" on matches;
create policy "Service role full matches" on matches
  for all using ((auth.jwt() ->> 'role') = 'service_role')
  with check ((auth.jwt() ->> 'role') = 'service_role');

drop policy if exists "Service role full projects" on projects;
create policy "Service role full projects" on projects
  for all using ((auth.jwt() ->> 'role') = 'service_role')
  with check ((auth.jwt() ->> 'role') = 'service_role');

drop policy if exists "Service role full fehidro_dictionary" on fehidro_dictionary;
create policy "Service role full fehidro_dictionary" on fehidro_dictionary
  for all using ((auth.jwt() ->> 'role') = 'service_role')
  with check ((auth.jwt() ->> 'role') = 'service_role');

create table if not exists company_tipologias (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  tipologia_id uuid not null references fehidro_dictionary(id) on delete cascade,
  status text not null default 'suggested',
  source text not null default 'hybrid',
  confidence numeric not null default 0,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, tipologia_id)
);

create table if not exists company_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  status text not null default 'pending',
  attempts integer not null default 0,
  error text,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_tipologias_company_id on company_tipologias(company_id);
create index if not exists idx_company_tipologias_tipologia_id on company_tipologias(tipologia_id);
create index if not exists idx_company_tipologias_status on company_tipologias(status);
create index if not exists idx_company_enrichment_jobs_company_id on company_enrichment_jobs(company_id);
create index if not exists idx_company_enrichment_jobs_status on company_enrichment_jobs(status);
create index if not exists idx_company_enrichment_jobs_created_at on company_enrichment_jobs(created_at);

do $$ begin
  alter table company_tipologias add constraint company_tipologias_status_chk check (status in ('suggested', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table company_tipologias add constraint company_tipologias_source_chk check (source in ('manual', 'api', 'web', 'llm', 'hybrid'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table company_tipologias add constraint company_tipologias_confidence_chk check (confidence >= 0 and confidence <= 1);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table company_enrichment_jobs add constraint company_enrichment_jobs_status_chk check (status in ('pending', 'processing', 'completed', 'failed'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table company_enrichment_jobs add constraint company_enrichment_jobs_attempts_chk check (attempts >= 0 and attempts <= 50);
exception when duplicate_object then null; end $$;

alter table company_tipologias enable row level security;
alter table company_enrichment_jobs enable row level security;

drop policy if exists "Public read company_tipologias" on company_tipologias;
create policy "Public read company_tipologias" on company_tipologias for select using (true);

drop policy if exists "Public read company_enrichment_jobs" on company_enrichment_jobs;
create policy "Public read company_enrichment_jobs" on company_enrichment_jobs for select using (true);

drop policy if exists "Service role full company_tipologias" on company_tipologias;
create policy "Service role full company_tipologias" on company_tipologias
  for all using ((auth.jwt() ->> 'role') = 'service_role')
  with check ((auth.jwt() ->> 'role') = 'service_role');

drop policy if exists "Service role full company_enrichment_jobs" on company_enrichment_jobs;
create policy "Service role full company_enrichment_jobs" on company_enrichment_jobs
  for all using ((auth.jwt() ->> 'role') = 'service_role')
  with check ((auth.jwt() ->> 'role') = 'service_role');
