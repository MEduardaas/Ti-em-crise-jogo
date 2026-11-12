# TI em Crise — Salvem a Empresa!

Jogo cooperativo de 2 a 6 jogadores para ensinar **ITIL 4** na prática: prevenção e atendimento de crises.
A equipe de TI da loja online fictícia **ServiceUp** precisa manter os serviços de pé durante um expediente.
O público são **alunos iniciantes** (2º período): poucas regras, linguagem simples, poucas siglas e um mentor que sugere o próximo passo.

---

## 1. Ideia central: cada ação é uma prática ITIL

Não há teoria para ler antes de jogar. Cada ação do jogo tem o nome de uma prática ITIL.

| No jogo | Prática ITIL 4 | O que o aluno aprende |
|---|---|---|
| Triagem: impacto × urgência | Central de Serviço | Priorizar antes de agir |
| 🧯 **Conter o incidente** | Gestão de Incidentes | Restaurar rápido ≠ resolver |
| 🔍 **Investigar a causa** | Gestão de Problemas | Sem causa raiz, o incidente **volta** |
| 🔧 **Corrigir de vez** (aprovado pelo **CAB**) | Habilitação de Mudanças | Toda correção é uma mudança avaliada |
| 📡 **Monitorar o serviço** | Monitoramento e Gestão de Eventos | Alerta antes do estrago = prevenção |
| 📢 **Avisar os clientes** em incidente grave | Gestão de Nível de Serviço | Silêncio custa confiança |
| Mapa de serviços com setas | Gestão de Configuração (CMDB) | Falha no login derruba a loja |
| Retrospectiva e post-mortem | Melhoria Contínua | Aprender sem culpados |

O ciclo que o jogo ensina é **Conter → Investigar → Corrigir de vez** (incidente → problema → mudança), e a prevenção com **Monitorar**.

---

## 2. Saúde dos serviços e confiança dos clientes

### 2.1 Prioridade do serviço (P1, P2, P3)
A prioridade do serviço é o **impacto** na matriz ITIL e o **peso** na saúde geral.

| Prioridade | Serviços | Conta na saúde geral | Meta de saúde | Referência de mercado |
|---|---|---|---|---|
| **P1 – Crítico** | Loja Online (pagamentos), Banco de Dados | **3×** | **≥ 90%** | 99,9% no ar (~43 min fora/mês) |
| **P2 – Importante** | Login, Site e App | **2×** | **≥ 80%** | 99,5% (~3 h 39 min/mês) |
| **P3 – Suporte** | E-mail, Relatórios | **1×** | **≥ 70%** | 99,0% (~7 h 18 min/mês) |

### 2.2 Faixas de status (como numa página de status)
| Saúde | Status | Cor |
|---|---|---|
| 90–100% | Funcionando | verde |
| 70–89% | Instável | âmbar |
| 40–69% | Com falhas | laranja |
| 0–39% | Fora do ar | vermelho |

O status nunca depende só da cor: sempre há ícone e rótulo.

### 2.3 Saúde geral e ❤ confiança dos clientes
- **Saúde geral** = média ponderada da saúde dos serviços (P1 conta 3×, P2 2×, P3 1×).
- **Confiança dos clientes** começa em **100** e é a "vida" da equipe. **Se chegar a 0, todos perdem.** Por hora, ela cai (em números inteiros):
  ```
  perda = Σ peso × max(0, meta − saúde) / 4      (serviços abaixo da meta)
        + 50% dessa perda se houver incidente grave e ninguém avisou os clientes
        + 3 por prazo (SLA) estourado
  ```
  Exemplo: Loja Online (P1) com 80% de saúde → 3 × 10 / 4 ≈ **−8 por hora**.
- A triagem errada **não** tira confiança: o jogo só mostra a resposta certa.

**Vitória:** chegar ao fim do expediente com confiança > 0. **Estrelas:** 3 = confiança ≥ 60 e prazos cumpridos ≥ 80%; 2 = confiança ≥ 30; 1 = sobreviveu.

---

## 3. Ocorrências e a matriz de prioridade

### 3.1 Matriz Impacto × Urgência (3 × 2)
Na triagem a equipe responde a duas perguntas:
1. **Impacto:** qual a importância do serviço? É a etiqueta P1/P2/P3.
2. **Urgência:** o problema está parando o serviço ou piorando rápido? Sim = alta; dá para esperar = baixa.

| | Urgência alta | Urgência baixa |
|---|---|---|
| **Impacto alto (P1)** | Crítica · conter em 1h | Alta · 2h |
| **Impacto médio (P2)** | Alta · 2h | Média · 3h |
| **Impacto baixo (P3)** | Média · 3h | Baixa · 4h |

Os **serviços** usam P1–P3 e os **incidentes** usam nomes (Crítica, Alta…), para não confundir as duas escalas.

### 3.2 Catálogo de ocorrências
| Categoria | Ocorrência | Urgência | Causa raiz → correção definitiva |
|---|---|---|---|
| Falha no servidor | Erro depois da atualização | alta | Deploy sem testes → testes automáticos no deploy |
| | Banco recusando conexões | alta | Conexões vazando → ajustar o pool |
| | Disco quase cheio | baixa | Logs sem limpeza → limpeza automática de logs |
| Lentidão | Relatório lento | baixa | Falta de índice → criar índice |
| | Lista de pedidos lenta | baixa | Consultas N+1 → otimizar as consultas |
| | Tudo lento de uma vez | alta | Cache expirando junto → validade escalonada |
| Segurança (OWASP) | Injeção de SQL na busca (A03) | alta | Entrada sem tratamento → código seguro + gate |
| | Cliente vê o pedido de outro (A01) | alta | Falta de autorização → conferir o dono do pedido |
| | Script malicioso barrado no gate (A03) | baixa | *mesma causa da injeção*: uma correção elimina as duas |
| Excesso de chamados | **Parceiro sobrecarregando o login (LDAP, 0,5 s/login)** | alta | Login a cada chamada → token para integrações |
| | Ataque de robôs (DDoS) | alta | Sem proteção → firewall de aplicação (WAF) |
| | Pico de acessos da campanha | baixa | Capacidade fixa → servidores automáticos |

O caso do LDAP mostra o **efeito cascata** pelo mapa (CMDB): o Login sofre, e a Loja, o Site e o E-mail, que dependem dele, sofrem também.

---

## 4. Loop do jogo

### 4.1 Estrutura
- **Partida** = um expediente, de 5 horas (tutorial) a 8 horas. Cada rodada é 1 hora.
- **Jogadores:** 2 a 6, cada um com um **papel** e **2 ações por hora** (equipes de até 3 pessoas: 3). **Toda ação custa 1.**
- **Formato:** tela compartilhada (projetor ou TV). A turma conversa e decide junto.
- **Sem cronômetro** nos cenários de aula: o professor clica em "Encerrar a hora" quando a turma terminar de discutir. Só a Black Friday tem cronômetro (2 min por hora, com pausa).

### 4.2 Etapas de cada hora
| # | Etapa | O que acontece |
|---|---|---|
| 1 | 📣 **Notícias** | O CAB aplica as correções aprovadas, alertas viram incidentes, contidos podem voltar e chegam chamados novos. Na 1ª hora, a tela explica as 4 etapas. |
| 2 | 🧭 **Triagem** | As duas perguntas (impacto e urgência) para cada chamado novo, com a matriz na tela e a explicação da resposta certa. |
| 3 | 🗣 **War Room** | A turma arrasta cards até os jogadores (ou clica neles) e escolhe as ações. O **mentor** mostra o próximo passo e destaca onde clicar. |
| 4 | 📊 **Resultado** | Saúde e confiança antes → depois, por que a confiança caiu, o que aconteceu com cada serviço e os cards "o que aprendemos". |

- **Retrospectiva** (no meio do dia): monitorar todos os P1, hora extra (+1 ação por 2 horas) ou análise de tendências (descobre a causa de todos os incidentes já vistos: Gestão de Problemas proativa).
- **Post-mortem** no fim: linha do tempo, prazos cumpridos, triagens certas, causas encontradas, problemas eliminados, conquistas e lições, sem culpados.

### 4.3 As 5 ações (todas custam 1 ação)
| Ação | Efeito |
|---|---|
| 🧯 Conter o incidente | Para o estrago. O incidente fica **contido**, mas tem **50% de chance por hora de voltar** (causando estrago de novo) até a causa ser corrigida. Num alerta, evita o incidente. |
| 🔍 Investigar a causa | Revela a causa raiz (**erro conhecido**) e a correção definitiva. |
| 🔧 Corrigir de vez | Pede a mudança. O **CAB** aprova e ela vale no início da próxima hora: os incidentes daquela causa são resolvidos, não voltam mais e o serviço recupera +10 de saúde. |
| 📡 Monitorar o serviço | Os próximos incidentes do serviço chegam uma hora antes como **alerta**, sem estrago. |
| 📢 Avisar os clientes | Só em incidente grave: evita a queda 50% maior da confiança naquela hora. |

### 4.4 Papéis (uma vantagem cada)
| Papel | Vantagem |
|---|---|
| 🎧 Service Desk | Avisar os clientes não gasta ação |
| 🧭 Gerente de Mudanças | Preside o CAB: as correções pedidas por ele valem na mesma hora |
| 🖥 Infraestrutura | Especialista em falha no servidor e excesso de chamados |
| 🗄 DBA | Especialista em lentidão |
| 🛡 Segurança | Especialista em falha de segurança |
| 💻 Desenvolvimento | Investigar a causa não gasta ação |

Especialista: ao conter um incidente da sua área, o serviço recupera +10 de saúde.

### 4.5 Mentor
Durante o War Room, o mentor olha o estado do jogo e sugere **um** próximo passo, na ordem do ciclo ITIL: avisar os clientes (se houver incidente grave) → conter o que causa estrago → agir nos alertas → corrigir causas conhecidas → investigar incidentes contidos → monitorar os P1 → encerrar a hora. A área da tela correspondente ganha um contorno pulsante. O mentor começa ligado no "Primeiro Plantão" e tem botão liga/desliga no topo.

### 4.6 Regras do motor (resumo)
```
impacto inicial   : incidente que chega (ou volta) sem alerta tira dano_base de saúde na hora
estrago/hora      = dano_base × (1 + 0,25 × horas_aberto) × multiplicador_de_pico
cascata           : cada dependente perde (perda_direta × fator_propagacao), 1 nível por hora
recuperação       : serviço sem perda na hora recupera +3 (máx. 100); correção definitiva: +10
incidente grave   : serviço P1 abaixo de 40% ou incidente aberto de prioridade Crítica
sorteio/hora      : (chance_base + 0,08 × (hora − 1)) × (0,5 + 0,25 × jogadores); a 1ª hora só tem eventos do roteiro
tipo sorteado     : peso × Π(1 − redução das correções aplicadas); corrigir uma causa elimina seus tipos
```
Todos os números ficam em `web/src/engine/rules.ts`. O motor é **TypeScript puro e determinístico** (RNG com seed).

**Balanceamento:** `npm test` simula 100 partidas por combinação (2, 4 e 6 jogadores × 3 cenários × 4 estratégias) e falha se o equilíbrio quebrar. Resultado com 4 jogadores:

| Cenário | Passiva (só triagem) | Bombeiro (só contém) | Aluno (ciclo ITIL, sem otimizar) | ITIL (escolhe especialistas) |
|---|---|---|---|---|
| Primeiro Plantão | 0% | 100% | 100% | 100% |
| Um dia na ServiceUp | 0% | ~55% (confiança média ~24) | 100% (~98) | 100% |
| Black Friday | 0% | ~13% | ~88% (~76) | 100% |

---

## 5. Arquitetura técnica

```
ti-em-crise-jogo/
├── db/
│   ├── schema.sql          # modelo relacional (MySQL 8)
│   └── seed.sql            # conteúdo do jogo: serviços, ocorrências, papéis, ações…
├── shared/catalog.ts       # tipos do catálogo (server e web)
├── server/                 # Node.js + Fastify + mysql2 + zod
│   └── src/routes/
│       ├── catalog.ts      GET  /api/catalog          (todo o conteúdo em 1 chamada)
│       └── sessions.ts     POST /api/sessions, /:id/rounds, /:id/finish · GET /api/ranking
└── web/                    # React + Vite + TypeScript
    └── src/
        ├── engine/         # regras puras (sem React), bots e testes/simulação Vitest
        ├── store/          # Zustand (estado da partida, mentor)
        ├── features/
        │   ├── home/  lobby/  rules/  postmortem/
        │   └── game/       # War Room: mapa, chamados, equipe, causas, mentor, diálogos das etapas
        └── components/     # shadcn/ui, Sigla (tooltips), matriz de prioridade, anel de saúde
```

**Modelo relacional:**
- **Catálogo:** `service` → `service_priority`; `service_dependency` (cascata); `incident_type` → `incident_category`, `problem`; `incident_type_service`; `problem` → `fix_change`; `fix_mitigation`; `priority_matrix`; `team_role` + `role_skill`; `game_action` → `itil_practice`; `scenario` + `scenario_event`.
- **Partidas:** `game_session`, `session_player`, `session_round_snapshot` (saúde geral, confiança e saúde por serviço a cada hora), além de `session_incident`, `session_problem` e `session_change` para registro detalhado.

**Decisões:**
- **Motor no front, banco para conteúdo e histórico.** O conteúdo é editável no MySQL sem mexer no código.
- **mysql2 com SQL explícito** (sem ORM), para o modelo relacional ficar visível e didático.

### Bibliotecas do front
| Uso | Biblioteca |
|---|---|
| Estilo | Tailwind CSS v4 + shadcn/ui (Radix) |
| Animações | Motion |
| Mapa de serviços | @xyflow/react (React Flow) |
| Gráficos | Recharts |
| Arrastar cards | @dnd-kit |
| Estado / dados da API | Zustand / TanStack Query |
| Ícones, avisos, vitória | lucide-react, sonner, canvas-confetti |

---

## 6. UX e estética: "NOC / War Room"

Sala de operações escura, painéis em vidro fosco e cores de status vibrantes. Space Grotesk nos títulos, Inter nos textos e JetBrains Mono em métricas e códigos (`INC0042`).

Tela do War Room:
- **Topo:** hora, etapas, saúde geral, barra de ❤ confiança, "Encerrar a hora", mentor e "Como jogar". Logo abaixo, a faixa do incidente grave e a dica do mentor.
- **Esquerda:** mapa de serviços (anel de saúde, setas de dependência que ficam coloridas na cascata) e registro de eventos.
- **Centro:** chamados em 3 colunas: Alertas · Causando estrago · Contidos.
- **Direita:** equipe (bolinhas = ações restantes, vantagem do papel) e causas encontradas (com o botão "Corrigir de vez").

Princípios: nada de texto cortado com "…"; toda sigla tem explicação no tooltip (`<Sigla>`); avisos curtos "🎓 o que vocês acabaram de fazer" na hora da ação; status com ícone + texto; `prefers-reduced-motion`; fonte mínima de 16 px para o projetor.

---

## 7. Roteiro de desenvolvimento
1. **Banco:** schema + seed + API. ✔
2. **Motor:** regras, RNG com seed, testes e simulação de balanceamento com 4 estratégias. ✔
3. **War Room, lobby, post-mortem, menu "Como jogar", ranking.** ✔
4. **Versão para iniciantes:** 5 ações de custo 1, triagem com 2 perguntas, confiança dos clientes, mentor, sem cronômetro. ✔
5. **Próximos passos:** sons, teste em projetor real e roteiro de aula para o professor.
