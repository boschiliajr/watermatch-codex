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
