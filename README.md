# WhatsApp Atendimento

Sistema de atendimento multi-agente via WhatsApp para uso interno.
Múltiplos atendentes, filas por setor, transferências, etiquetas e notas internas.

## Pré-requisitos

- Docker + Docker Compose
- Node.js 20+
- pnpm (`npm i -g pnpm`)

## Subindo o Ambiente

### 1. Clone e configure
```bash
git clone <repo>
cd whatsapp-atendimento
cp .env.example .env
# Edite o .env se necessário (valores padrão funcionam para dev)
```

### 2. Suba a infraestrutura
```bash
docker compose up -d
# Aguarde até todos os containers estarem healthy:
docker compose ps
```

### 3. Instale dependências
```bash
pnpm install
```

### 4. Aplique as migrations e seed
```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Inicie os serviços
```bash
pnpm dev
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

## Conectando o WhatsApp pela Primeira Vez

1. Acesse http://localhost:5173
2. Faça login com admin@wa.local / admin123
3. Navegue para Admin → Configurações do WhatsApp
4. Clique em "Conectar"
5. Um QR Code aparecerá na tela
6. Abra o WhatsApp no celular → Dispositivos Vinculados → Vincular um Dispositivo
7. Escaneie o QR Code
8. Aguarde a conexão ser estabelecida (status: Conectado)

> **Atenção:** O número de WhatsApp conectado será o número usado para atendimento.
> Após a primeira conexão, a sessão é persistida criptografada no banco.
> Em caso de queda, a reconexão acontece automaticamente.

## Criando o Primeiro Usuário Admin

O seed já cria um usuário admin padrão:
- Email: admin@wa.local
- Senha: admin123

Para criar um novo admin via API:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wa.local","password":"admin123"}'

# Use o accessToken retornado:
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Novo Admin","email":"novo@empresa.com","password":"senha123","role":"admin"}'
```

## Comandos Comuns

```bash
docker compose up -d         # Infraestrutura
docker compose down          # Para tudo
pnpm install                 # Instala deps
pnpm dev                     # Desenvolvimento (api + web)
pnpm build                   # Build produção
pnpm test                    # Testes
pnpm db:migrate              # Aplica migrations
pnpm db:studio               # Interface visual do banco
pnpm db:seed                 # Popula dados iniciais
pnpm db:reset                # Reset completo do banco
```

## Arquitetura

Veja ARCHITECTURE.md para documentação completa de:
- Stack e justificativas
- Modelo de dados
- Abstração do WhatsApp (como migrar para API oficial)
- Fluxo de mensagens
- Real-time com Socket.IO

## Credenciais da Infraestrutura

| Serviço | URL | Usuário | Senha |
|---|---|---|---|
| PostgreSQL | localhost:5432 | wa | wapassword |
| Redis | localhost:6379 | — | — |
| MinIO Console | http://localhost:9001 | minioadmin | minioadmin123 |

## Estrutura de Pastas

```
apps/api/         → Backend Fastify
apps/web/         → Frontend React
packages/shared/  → Tipos compartilhados
```
