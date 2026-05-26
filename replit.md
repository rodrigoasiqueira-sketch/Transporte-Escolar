# Transporte Escolar - Eventos

Sistema de gerenciamento de transporte escolar para eventos culturais da Prefeitura de Atibaia/SP. Permite importar alunos, motoristas, veículos e empresas via planilha xlsx, criar eventos com sessões, escalar veículos/motoristas por escola e calcular horários de embarque baseados na matriz de tempos de deslocamento.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, path `/api`)
- Frontend: React + Vite + Wouter (port dynamic, path `/`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all endpoints)
- `lib/api-zod/src/generated/api.ts` — Generated Zod schemas
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks
- `lib/db/src/schema/` — Drizzle ORM schema files (one per entity)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/transporte-eventos/src/` — React frontend

## DB Schema (lib/db/src/schema/)

- `escolas.ts` — escolas municipais
- `alunos.ts` — alunos com RA único, deduplicados por RA na importação (contra-turno ignorado)
- `empresas.ts` — empresas de transporte
- `motoristas.ts` — motoristas com FK para empresa
- `veiculos.ts` — veículos com FK para empresa
- `locais.ts` — locais de eventos (teatro, museu, etc.)
- `tempos.ts` — matriz escola × local com minutos de deslocamento
- `eventos.ts` — eventos e sessões (cascade delete)
- `escalas.ts` — escala de transporte por sessão/escola/veículo/motorista

## Architecture decisions

- Alunos duplicados por RA = contra-turno → ignorados na importação (só conta RA único)
- Apenas segmentos INFANTIL, FUNDAMENTAL (até 5º ano) e MULTISSERIADA são importados
- Horário de embarque = sessao.horario_inicio - tempo_deslocamento.minutos
- Detecção de conflito de motorista: mesmo motorista não pode estar em 2 escalas no mesmo dia
- xlsx parser customizado em `api-server/src/lib/xlsx-parser.ts` (sem dependências externas, unzip manual via zlib)

## Product

- Dashboard com visão geral (eventos do mês, total de alunos, veículos disponíveis)
- Importação de planilhas xlsx para alunos, motoristas, empresas e veículos
- CRUD completo para escolas, motoristas, empresas, veículos, locais
- Matriz de tempos de deslocamento escola × local (inline editable)
- Criação de eventos com múltiplas sessões
- Escalonamento de veículos/motoristas por escola por sessão
- Cálculo automático de horário de embarque e vagas sobrando
- Contagem de alunos por escola/período/segmento/turma

## User preferences

- Sem emojis na interface
- Idioma: Português (BR)
- Sistema institucional: Prefeitura de Atibaia/SP

## Gotchas

- Rodar `pnpm --filter @workspace/db run push` após mudanças no schema
- Rodar `pnpm --filter @workspace/api-spec run codegen` após mudanças no openapi.yaml
- O build do api-server (esbuild) não depende de `tsc --build` — usa source diretamente
- xlsx parser usa `require("zlib")` internamente (CJS interop no bundle esbuild)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
