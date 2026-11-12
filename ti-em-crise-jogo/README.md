# TI em Crise — Salvem a ServiceUp!

Jogo cooperativo (2–6 jogadores, tela compartilhada) para aprender **ITIL 4** na prática.
O design completo do jogo está em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Requisitos
- Node.js 24+
- MySQL 8.0+ rodando localmente

## Primeira execução
```bash
npm install              # instala raiz, server/ e web/
# edite server/.env com usuário/senha do MySQL (modelo em server/.env.example)
npm run db:reset         # cria o banco ti_em_crise com schema + seed
npm run dev              # API em :3333 e jogo em http://localhost:5173
```

> ⚠️ `npm run db:reset` **apaga e recria** o banco `ti_em_crise`, incluindo o histórico de partidas.

## Estrutura
```
db/       schema.sql (modelo relacional) e seed.sql (conteúdo do jogo)
shared/   tipos TypeScript do catálogo, usados pelo server e pelo web
server/   API Node.js (Fastify + mysql2 + zod)
web/      jogo em React + Vite + Tailwind + shadcn/ui
docs/     arquitetura e regras
```

## API
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Verifica a conexão com o banco |
| GET | `/api/catalog` | Todo o conteúdo do jogo em uma chamada |
| POST | `/api/sessions` | Cria uma partida `{ scenarioId, nomeEquipe, jogadores: [{ nome, roleId }] }` |
| POST | `/api/sessions/:id/rounds` | Salva a foto da hora `{ rodada, saudeGeral, confianca, saudeServicos }` |
| POST | `/api/sessions/:id/finish` | Encerra a partida `{ status, confiancaFinal, saudeGeralMedia, slaCumpridoPct, estrelas }` |
| GET | `/api/ranking?scenarioId=` | Top 10 equipes |
