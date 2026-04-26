# CLAUDE.md — WhatsApp Atendimento

## Visão Geral
Sistema de atendimento multi-agente via WhatsApp para uso interno.
Monorepo pnpm com apps/api (Fastify) e apps/web (React + Vite).

## Stack
- **Backend**: Node 20, TypeScript strict, Fastify, Prisma, PostgreSQL 16, Redis, BullMQ, Socket.IO, Baileys, MinIO, Pino
- **Frontend**: React 18, Vite, Tailwind, shadcn/ui, TanStack Query, Zustand

## Comandos Comuns

```bash
# Infraestrutura
docker compose up -d          # sobe PG, Redis, MinIO
docker compose down           # para tudo
docker compose logs -f api    # logs do backend

# Desenvolvimento
pnpm install                  # instala todas as deps do monorepo
pnpm dev                      # roda api + web em paralelo (turbo)
pnpm -F api dev               # só o backend
pnpm -F web dev               # só o frontend

# Banco de dados
pnpm db:migrate               # aplica migrations Prisma
pnpm db:studio                # abre Prisma Studio
pnpm db:seed                  # seed inicial (admin user)
pnpm db:reset                 # drop + migrate + seed

# Build e testes
pnpm build                    # build de todos os workspaces
pnpm typecheck                # tsc --noEmit em todo o monorepo
pnpm test                     # roda testes (Vitest)
pnpm test:unit                # só unit tests
```

## Convenções

### TypeScript
- `strict: true` em todo lugar — sem `any` implícito
- Prefira tipos sobre interfaces para unions; interfaces para objetos extensíveis
- Validação de input sempre com Zod
- Tipos compartilhados em `packages/shared/src/`

### Commits (Conventional Commits)
```
feat(conversations): add optimistic lock on assignment
fix(ingest): handle duplicate whatsapp_message_id gracefully
chore(deps): upgrade baileys to 6.x
docs(architecture): update real-time section
test(ingest): add idempotency test
```

### Nomenclatura de Arquivos
- Arquivos TypeScript: `kebab-case.ts` (ex: `conversation-service.ts`)
- Componentes React: `PascalCase.tsx` (ex: `ConversationList.tsx`)
- Testes: `nome.test.ts` ou `nome.spec.ts` ao lado do arquivo testado

### Estrutura de Módulo (Backend)
Cada módulo em `apps/api/src/modules/` tem:
- `*.routes.ts` — rotas Fastify (validação Zod → chama service)
- `*.service.ts` — lógica de negócio pura
- `*.schema.ts` — schemas Zod de request/response

### Estrutura de Página (Frontend)
- Pages em `apps/web/src/pages/`
- Hooks de dados em `apps/web/src/hooks/`
- Componentes reutilizáveis em `apps/web/src/components/`

## REGRA CRÍTICA: WhatsApp Provider

> **NUNCA importe Baileys fora de `apps/api/src/providers/BaileysProvider.ts`**

Toda comunicação com WhatsApp passa pela interface `WhatsAppProvider`.
Isso garante que a migração para a Cloud API oficial da Meta seja feita
trocando apenas o arquivo `BaileysProvider.ts` — sem tocar no resto do sistema.

Se você precisar de uma funcionalidade do WhatsApp em qualquer outro lugar,
adicione o método na interface primeiro, depois implemente no provider.

## Segurança
- Senhas: bcrypt cost 12
- JWT access: 15min, refresh: 7d (httpOnly cookie)
- Sessão Baileys: AES-256-GCM criptografado no banco
- Env vars validadas no startup com Zod — app não sobe se faltarem

## Mídia
- Upload/download SEMPRE em streaming (NodeJS.ReadableStream)
- NUNCA carregar arquivo de mídia inteiro em memória
- Storage: MinIO (compatível S3 — para AWS S3 basta mudar env vars)

## Banco de Dados
- Todos os timestamps em UTC
- UUIDs como PKs (gen_random_uuid())
- Soft delete apenas onde explicitamente necessário (users.is_active)
- Idempotência de mensagens: UNIQUE em messages.whatsapp_message_id

## Real-time
- Socket.IO com Redis adapter (escala horizontal)
- Rooms: `user:{id}`, `dept:{id}`, `conv:{id}`
