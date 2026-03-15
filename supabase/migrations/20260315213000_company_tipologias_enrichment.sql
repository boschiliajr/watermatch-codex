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
