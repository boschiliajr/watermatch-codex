# WaterTech Match PIT

Plataforma de matchmaking entre prefeituras e empresas para estruturar projetos de recursos hídricos (ex.: FEHIDRO), com fluxo de cadastro, qualificação de demanda, geração de matches e simulação de projetos.

## 1) O que o sistema faz

- Cadastra **empresas** e **prefeituras** com validação de CNPJ.
- Classifica automaticamente o tipo da instituição (`company`, `municipality`, etc.).
- Sugere tipologia para demandas a partir da descrição do problema.
- Executa algoritmo de matchmaking entre demandas e empresas (score 0-100).
- Registra projetos financeiros derivados dos matches.
- Exibe dashboard, tabelas e painéis operacionais.

Fluxo funcional principal:

1. Cadastro de instituição (consulta CNPJ + validação de tipo).
2. Criação de demanda vinculada à prefeitura.
3. Execução de matchmaking (`/api/matchmaking/run`).
4. Criação de projeto a partir de `match_id`.
5. Acompanhamento em dashboard e tabelas.

## 2) Arquitetura atual (produto + técnico)

### Monorepo

- `apps/web`: aplicação Next.js 14 (App Router), UI + rotas API.
- `packages/shared`: regras compartilhadas (sugestão de tipologia e tipos).
- `supabase`: schema SQL, migrações e config da base.
- `scripts`: automações de sincronização de banco e geração de dados de bacias.

### Camadas

- **Frontend**: React/Next.js, páginas de cadastro, demandas, matches, projetos e tabelas.
- **Backend (BFF no próprio Next.js)**: rotas em `apps/web/src/app/api/*`.
- **Persistência**: Supabase/Postgres com RLS habilitado.
- **Dados auxiliares**: dataset local de bacias por município (SP).

### Banco de dados (núcleo)

Tabelas centrais:

- `companies`
- `municipalities`
- `fehidro_dictionary`
- `demands`
- `matches`
- `projects`

Relacionamentos:

- `demands.municipality_id -> municipalities.id`
- `matches.demand_id -> demands.id`
- `matches.company_id -> companies.id`
- `projects.match_id -> matches.id`

## 3) Setup local

## Pré-requisitos

- Node.js 20+
- npm 10+
- Supabase CLI instalado e no `PATH`
- Docker (para Supabase local, se usar `supabase start`)

## Instalação

```bash
npm install
```

## Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENV=local
DB_TARGET=local
DB_SYNC_DRY_RUN=0
DB_SYNC_FAIL_OPEN=1
SUPABASE_ACCESS_TOKEN=
SUPABASE_PROJECT_REF=
```

Notas:

- `SUPABASE_SERVICE_ROLE_KEY` é obrigatório para rotas server-side.
- Para alvo `staging`, configure `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF`.

## Executando localmente

### Opção A: com preflight de banco (recomendado)

```bash
npm run dev
```

Esse comando roda:

1. `npm run db:sync` (sincronização de migração)
2. `next dev` no workspace `apps/web`

### Opção B: sem sincronização automática de banco

```bash
npm run dev:skip-db
```

## Outros comandos

```bash
npm run db:sync
npm run test
npm run build
npm run start
npm run lint
```

## 4) Comportamento do DB Sync

Script: `scripts/db-sync.mjs`

- `APP_ENV=production`: bloqueia auto-migração.
- `APP_ENV=local` / `DB_TARGET=local`: usa `supabase migration up --local`.
- `APP_ENV=staging` / `DB_TARGET=staging`: usa `supabase db push --linked`.
- `DB_SYNC_DRY_RUN=1`: só reporta status.
- Se `local` falhar e houver `SUPABASE_PROJECT_REF`, tenta fallback para `staging`.

## 5) Diagnóstico técnico profundo

## Pontos fortes

- Estrutura monorepo simples e objetiva.
- Modelo de dados com relacionamentos claros e constraints importantes.
- RLS habilitado em todas as tabelas principais.
- Testes unitários cobrindo partes críticas (matchmaking, classificação, db-sync core).
- Build de produção funcional com Next.js.

## Limitações e problemas (priorizados)

### P0 - Segurança/controle de acesso

- Rotas API de escrita (`POST/DELETE`) não exigem autenticação/autorização explícita.
- Com `service_role` no servidor, qualquer chamada não protegida pode virar risco de alteração indevida.
- Não há rate limiting nem proteção anti-abuso no BFF.

Impacto: alto (integridade e segurança dos dados).

### P1 - Qualidade do matching e classificação

- Sugestão de tipologia usa palavras-chave simples (`packages/shared/src/categorize.ts`).
- Classificação de instituição depende de heurísticas textuais e sinais de CNAE/natureza.
- Algoritmo de score usa pesos fixos e corte hardcoded (`score < 25` ignora match).

Impacto: médio-alto (qualidade dos resultados e confiança operacional).

### P1 - Escopo de dados restrito

- Resolução de bacias depende de dataset interno apenas para **SP** (`apps/web/src/lib/bacias.ts`).
- Empresas fora de SP ficam com cobertura geográfica parcial para score.

Impacto: médio-alto (viés regional no matching).

### P1 - Confiabilidade de lookup CNPJ

- Fallback para mock quando API externa falha (`cnpjLookup.ts`), com bloqueio parcial via `allow_mock`.
- Ainda existe chance de erro operacional se usuário confirmar mock sem validação externa robusta.

Impacto: médio.

### P2 - Cobertura de testes incompleta

- Há testes de core e uma rota.
- Falta cobertura mais ampla de rotas CRUD, integrações Supabase, regressão de UI e cenários de erro completos.

Impacto: médio.

### P2 - Qualidade de código/UX

- Build sinaliza warnings de `react-hooks/exhaustive-deps` nas tabelas (`CompaniesTable`, `MunicipalitiesTable`, `DemandsTable`, `ProjectsTable`).
- Há indícios de encoding com caracteres quebrados em textos UI (ex.: acentuação).
- Exposição de `match_id` manual em formulário de projeto aumenta erro humano.

Impacto: médio.

### P2 - Operação e observabilidade

- Não há trilha clara de auditoria de ações de usuário.
- Logs são básicos; faltam métricas de saúde (latência API, taxa de erro, qualidade do matching).

Impacto: médio.

## 6) O que precisa fazer (roadmap técnico)

### Curto prazo (1-2 sprints)

1. Proteger rotas API com autenticação e autorização por perfil.
2. Adicionar rate limiting nas rotas de escrita e execução de matchmaking.
3. Corrigir warnings de hooks e padronizar encoding UTF-8.
4. Expandir testes para rotas CRUD e cenários de erro.
5. Melhorar UX de projeto para seleção de match por lista (não ID manual).

### Médio prazo

1. Evoluir tipologia/match para modelo configurável (pesos versionados).
2. Criar pipeline de qualidade de dados (normalização, deduplicação, validações semânticas).
3. Ampliar cobertura geográfica de bacias além de SP.
4. Incluir observabilidade (logs estruturados + métricas + alertas).
5. Definir trilha de auditoria e governança de alterações.

### Longo prazo

1. Desacoplar regras de matching para serviço dedicado.
2. Versionar critérios de recomendação e comparar resultados A/B.
3. Planejar camada de explicabilidade do score para usuários finais.

## 7) Troubleshooting

## `npm run dev` falha no db-sync local

- Suba ambiente local do Supabase:

```bash
supabase start
```

- Ou rode sem preflight:

```bash
npm run dev:skip-db
```

## Falha de permissão no staging (`Forbidden resource`)

- Confira `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF`.
- Faça `supabase login`.
- Se necessário, rode com `DB_SYNC_FAIL_OPEN=1` em ambientes não produtivos.

## Lookup CNPJ caiu para mock

- O sistema retorna `source = mock` e exige confirmação manual (`allow_mock`).
- Validar CNPJ por fonte externa antes de confirmar cadastro.

## Testes com erro de `spawn EPERM` em ambiente restrito

- Execute testes fora de sandbox/restrição do terminal, pois `vitest/vite` pode depender de spawn subprocess.

## 8) Validação atual do projeto

Validações executadas neste ciclo:

- `npm test` -> **16 testes passando**.
- `npm run build` -> build de produção **ok**, com warnings de hooks nas tabelas.

## 9) Licença

Este projeto está licenciado sob a **Apache License 2.0**.

- Arquivo de licença: `LICENSE`
- Avisos adicionais: `NOTICE`

Também foram adicionados metadados SPDX `license: "Apache-2.0"` nos `package.json` da raiz, `apps/web` e `packages/shared`.

---

Referência adicional do app web original: `apps/web/README.md`.
