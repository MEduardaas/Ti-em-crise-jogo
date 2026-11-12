-- =============================================================================
-- TI em Crise — Salvem a Empresa!  |  Modelo relacional (MySQL 8.0+)
-- Parte 1: CATÁLOGO (conteúdo do jogo, editável sem mexer no código)
-- Parte 2: PARTIDAS (histórico, ranking e post-mortem)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS ti_em_crise
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE ti_em_crise;

-- -----------------------------------------------------------------------------
-- PARTE 1 — CATÁLOGO
-- -----------------------------------------------------------------------------

-- Práticas ITIL 4 usadas no jogo (alimenta os cards de aprendizado)
CREATE TABLE itil_practice (
  id          VARCHAR(20)  PRIMARY KEY,          -- ex.: 'INCIDENT', 'PROBLEM'
  nome        VARCHAR(80)  NOT NULL,
  resumo      VARCHAR(255) NOT NULL,
  dica_jogo   TEXT         NOT NULL               -- como a prática aparece no jogo
);

-- Prioridade (criticidade) do serviço: é o IMPACTO na matriz e o PESO na saúde geral
CREATE TABLE service_priority (
  id                       CHAR(2)       PRIMARY KEY,   -- P1, P2, P3
  nome                     VARCHAR(40)   NOT NULL,
  impacto                  ENUM('ALTO','MEDIO','BAIXO') NOT NULL UNIQUE,
  peso                     TINYINT UNSIGNED NOT NULL,   -- peso na saúde geral e na perda de confiança
  meta_saude               TINYINT UNSIGNED NOT NULL,   -- abaixo disso o serviço tira confiança (%)
  sla_disponibilidade_ref  DECIMAL(5,2)  NOT NULL,      -- referência de mercado (ex.: 99.90)
  downtime_mensal_ref      VARCHAR(20)   NOT NULL,
  CHECK (meta_saude BETWEEN 0 AND 100)
);

-- Faixas de status (padrão de status pages)
CREATE TABLE health_status (
  id         VARCHAR(20) PRIMARY KEY,
  nome       VARCHAR(40) NOT NULL,
  faixa_min  TINYINT UNSIGNED NOT NULL,
  faixa_max  TINYINT UNSIGNED NOT NULL,
  cor_hex    CHAR(7)     NOT NULL,
  icone      VARCHAR(40) NOT NULL,
  CHECK (faixa_min <= faixa_max)
);

-- Serviços da empresa (a "CMDB" do jogo)
CREATE TABLE service (
  id             VARCHAR(10)  PRIMARY KEY,
  nome           VARCHAR(80)  NOT NULL,
  descricao      VARCHAR(255) NOT NULL,
  tipo           ENUM('NEGOCIO','TECNICO') NOT NULL,
  priority_id    CHAR(2)      NOT NULL,
  icone          VARCHAR(40)  NOT NULL,         -- nome do ícone lucide-react
  saude_inicial  TINYINT UNSIGNED NOT NULL DEFAULT 100,
  pos_x          SMALLINT     NOT NULL DEFAULT 0,  -- posição no mapa (React Flow)
  pos_y          SMALLINT     NOT NULL DEFAULT 0,
  CONSTRAINT fk_service_priority FOREIGN KEY (priority_id) REFERENCES service_priority(id)
);

-- Dependências: service_id DEPENDE DE depends_on_id (efeito cascata)
CREATE TABLE service_dependency (
  service_id        VARCHAR(10)  NOT NULL,
  depends_on_id     VARCHAR(10)  NOT NULL,
  fator_propagacao  DECIMAL(3,2) NOT NULL,       -- 0.00 a 1.00 da perda repassada
  PRIMARY KEY (service_id, depends_on_id),
  CONSTRAINT fk_dep_service    FOREIGN KEY (service_id)    REFERENCES service(id),
  CONSTRAINT fk_dep_depends_on FOREIGN KEY (depends_on_id) REFERENCES service(id),
  CHECK (service_id <> depends_on_id),
  CHECK (fator_propagacao BETWEEN 0 AND 1)
);

-- Categorias de ocorrência
CREATE TABLE incident_category (
  id             VARCHAR(20)  PRIMARY KEY,       -- FALHA, LENTIDAO, SEGURANCA, SOBRECARGA
  nome           VARCHAR(60)  NOT NULL,
  descricao      VARCHAR(255) NOT NULL,
  cor_hex        CHAR(7)      NOT NULL,
  icone          VARCHAR(40)  NOT NULL,
  practice_id    VARCHAR(20)  NOT NULL,
  CONSTRAINT fk_cat_practice FOREIGN KEY (practice_id) REFERENCES itil_practice(id)
);

-- Matriz ITIL Impacto x Urgência -> Prioridade do incidente e prazo (SLA)
CREATE TABLE priority_matrix (
  impacto        ENUM('ALTO','MEDIO','BAIXO') NOT NULL,
  urgencia       ENUM('ALTA','BAIXA') NOT NULL,
  prioridade     TINYINT UNSIGNED NOT NULL,     -- 1 (Crítica) a 4 (Baixa)
  nome           VARCHAR(20) NOT NULL,
  prazo_horas    TINYINT UNSIGNED NOT NULL,     -- SLA: horas (rodadas) para conter
  PRIMARY KEY (impacto, urgencia),
  CHECK (prioridade BETWEEN 1 AND 4)
);

-- Correções definitivas (aplicadas por uma Mudança aprovada pelo CAB)
CREATE TABLE fix_change (
  id           VARCHAR(24)  PRIMARY KEY,
  nome         VARCHAR(80)  NOT NULL,
  descricao    VARCHAR(255) NOT NULL
);

-- Problemas (causa raiz). Eliminar = aplicar a correção fix_change_id
CREATE TABLE problem (
  id             VARCHAR(24)  PRIMARY KEY,
  nome           VARCHAR(80)  NOT NULL,
  causa_raiz     VARCHAR(255) NOT NULL,
  fix_change_id  VARCHAR(24)  NOT NULL,
  CONSTRAINT fk_problem_fix FOREIGN KEY (fix_change_id) REFERENCES fix_change(id)
);

-- Tipos de ocorrência (o "baralho" de incidentes)
CREATE TABLE incident_type (
  id             VARCHAR(20)  PRIMARY KEY,
  category_id    VARCHAR(20)  NOT NULL,
  nome           VARCHAR(100) NOT NULL,
  sintoma        VARCHAR(255) NOT NULL,          -- o que o jogador lê no card
  urgencia       ENUM('ALTA','BAIXA') NOT NULL,
  dano_base      TINYINT UNSIGNED NOT NULL,      -- saúde perdida por hora sem contenção
  peso_sorteio   TINYINT UNSIGNED NOT NULL DEFAULT 10,
  problem_id     VARCHAR(24)  NOT NULL,
  referencia     VARCHAR(40)  NULL,              -- ex.: 'OWASP A03:2021'
  CONSTRAINT fk_it_category FOREIGN KEY (category_id) REFERENCES incident_category(id),
  CONSTRAINT fk_it_problem  FOREIGN KEY (problem_id)  REFERENCES problem(id)
);

-- Em quais serviços cada tipo de ocorrência pode surgir
CREATE TABLE incident_type_service (
  incident_type_id  VARCHAR(20) NOT NULL,
  service_id        VARCHAR(10) NOT NULL,
  PRIMARY KEY (incident_type_id, service_id),
  CONSTRAINT fk_its_type    FOREIGN KEY (incident_type_id) REFERENCES incident_type(id),
  CONSTRAINT fk_its_service FOREIGN KEY (service_id)       REFERENCES service(id)
);

-- Quais tipos de ocorrência cada correção elimina (prevenção)
CREATE TABLE fix_mitigation (
  fix_change_id     VARCHAR(24)  NOT NULL,
  incident_type_id  VARCHAR(20)  NOT NULL,
  reducao_chance    DECIMAL(3,2) NOT NULL DEFAULT 1.00,  -- 1.00 = elimina
  PRIMARY KEY (fix_change_id, incident_type_id),
  CONSTRAINT fk_fm_fix  FOREIGN KEY (fix_change_id)    REFERENCES fix_change(id),
  CONSTRAINT fk_fm_type FOREIGN KEY (incident_type_id) REFERENCES incident_type(id),
  CHECK (reducao_chance BETWEEN 0 AND 1)
);

-- Papéis da equipe
CREATE TABLE team_role (
  id                VARCHAR(20)  PRIMARY KEY,
  nome              VARCHAR(60)  NOT NULL,
  descricao         VARCHAR(255) NOT NULL,
  icone             VARCHAR(40)  NOT NULL,
  cor_hex           CHAR(7)      NOT NULL,
  acoes_por_rodada  TINYINT UNSIGNED NOT NULL DEFAULT 2,
  vantagem          VARCHAR(255) NOT NULL           -- a vantagem do papel, em uma frase
);

-- Especialidades: conter um incidente da categoria devolve saúde extra ao serviço
CREATE TABLE role_skill (
  role_id      VARCHAR(20) NOT NULL,
  category_id  VARCHAR(20) NOT NULL,
  bonus_saude  TINYINT UNSIGNED NOT NULL DEFAULT 10,
  PRIMARY KEY (role_id, category_id),
  CONSTRAINT fk_rs_role     FOREIGN KEY (role_id)     REFERENCES team_role(id),
  CONSTRAINT fk_rs_category FOREIGN KEY (category_id) REFERENCES incident_category(id)
);

-- Ações disponíveis aos jogadores (todas custam 1 ação, salvo vantagem de papel)
CREATE TABLE game_action (
  id           VARCHAR(24)  PRIMARY KEY,
  nome         VARCHAR(60)  NOT NULL,
  descricao    VARCHAR(255) NOT NULL,
  icone        VARCHAR(40)  NOT NULL,
  ordem        TINYINT UNSIGNED NOT NULL,
  practice_id  VARCHAR(20)  NOT NULL,
  CONSTRAINT fk_action_practice FOREIGN KEY (practice_id) REFERENCES itil_practice(id)
);

-- Cenários / dificuldades
CREATE TABLE scenario (
  id                    VARCHAR(20)  PRIMARY KEY,
  nome                  VARCHAR(80)  NOT NULL,
  descricao             VARCHAR(255) NOT NULL,
  dificuldade           ENUM('TUTORIAL','NORMAL','DIFICIL') NOT NULL,
  total_rodadas         TINYINT UNSIGNED NOT NULL,
  hora_inicio           TINYINT UNSIGNED NOT NULL DEFAULT 8,
  confianca_inicial     TINYINT UNSIGNED NOT NULL DEFAULT 100,
  chance_spawn_base     DECIMAL(3,2) NOT NULL,       -- incidentes sorteados por hora (média)
  cronometro_seg        SMALLINT UNSIGNED NOT NULL DEFAULT 0  -- 0 = sem cronômetro
);

-- Eventos roteirizados por rodada (deploy, pico, auditoria, incidente fixo)
CREATE TABLE scenario_event (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scenario_id       VARCHAR(20)  NOT NULL,
  rodada            TINYINT UNSIGNED NOT NULL,
  tipo              ENUM('INCIDENTE','PICO_TRAFEGO','DEPLOY','AUDITORIA','RETROSPECTIVA') NOT NULL,
  incident_type_id  VARCHAR(20)  NULL,
  service_id        VARCHAR(10)  NULL,
  multiplicador     DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  mensagem          VARCHAR(255) NOT NULL,
  CONSTRAINT fk_se_scenario FOREIGN KEY (scenario_id)      REFERENCES scenario(id),
  CONSTRAINT fk_se_type     FOREIGN KEY (incident_type_id) REFERENCES incident_type(id),
  CONSTRAINT fk_se_service  FOREIGN KEY (service_id)       REFERENCES service(id),
  INDEX idx_se_scenario_rodada (scenario_id, rodada)
);

-- -----------------------------------------------------------------------------
-- PARTE 2 — PARTIDAS
-- -----------------------------------------------------------------------------

CREATE TABLE game_session (
  id                  CHAR(36)     PRIMARY KEY,         -- UUID
  scenario_id         VARCHAR(20)  NOT NULL,
  nome_equipe         VARCHAR(60)  NOT NULL,
  seed                INT UNSIGNED NOT NULL,             -- reprodutibilidade
  status              ENUM('EM_ANDAMENTO','VITORIA','DERROTA') NOT NULL DEFAULT 'EM_ANDAMENTO',
  rodada_atual        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  confianca_final     TINYINT UNSIGNED NULL,
  saude_geral_media   DECIMAL(5,2) NULL,
  sla_cumprido_pct    DECIMAL(5,2) NULL,
  estrelas            TINYINT UNSIGNED NULL,
  criado_em           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalizado_em       DATETIME     NULL,
  CONSTRAINT fk_gs_scenario FOREIGN KEY (scenario_id) REFERENCES scenario(id),
  INDEX idx_gs_ranking (status, estrelas, confianca_final)
);

CREATE TABLE session_player (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id  CHAR(36)    NOT NULL,
  nome        VARCHAR(40) NOT NULL,
  role_id     VARCHAR(20) NOT NULL,
  CONSTRAINT fk_sp_session FOREIGN KEY (session_id) REFERENCES game_session(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_role    FOREIGN KEY (role_id)    REFERENCES team_role(id)
);

CREATE TABLE session_incident (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id          CHAR(36)    NOT NULL,
  codigo              VARCHAR(10) NOT NULL,                -- INC0001
  incident_type_id    VARCHAR(20) NOT NULL,
  service_id          VARCHAR(10) NOT NULL,
  prioridade          TINYINT UNSIGNED NOT NULL,           -- pela matriz
  triagem_correta     BOOLEAN NULL,
  status              ENUM('ALERTA','NOVO','ABERTO','CONTIDO','RESOLVIDO','PREVENIDO') NOT NULL,
  rodada_abertura     TINYINT UNSIGNED NOT NULL,
  rodada_contencao    TINYINT UNSIGNED NULL,
  sla_violado         BOOLEAN NOT NULL DEFAULT FALSE,
  reincidencias       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uk_si_codigo (session_id, codigo),
  CONSTRAINT fk_si_session FOREIGN KEY (session_id)       REFERENCES game_session(id) ON DELETE CASCADE,
  CONSTRAINT fk_si_type    FOREIGN KEY (incident_type_id) REFERENCES incident_type(id),
  CONSTRAINT fk_si_service FOREIGN KEY (service_id)       REFERENCES service(id)
);

CREATE TABLE session_problem (
  session_id        CHAR(36)    NOT NULL,
  problem_id        VARCHAR(24) NOT NULL,
  status            ENUM('ERRO_CONHECIDO','RESOLVIDO') NOT NULL,
  rodada_descoberta TINYINT UNSIGNED NOT NULL,
  rodada_resolucao  TINYINT UNSIGNED NULL,
  PRIMARY KEY (session_id, problem_id),
  CONSTRAINT fk_sprob_session FOREIGN KEY (session_id) REFERENCES game_session(id) ON DELETE CASCADE,
  CONSTRAINT fk_sprob_problem FOREIGN KEY (problem_id) REFERENCES problem(id)
);

CREATE TABLE session_change (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id         CHAR(36)    NOT NULL,
  codigo             VARCHAR(10) NOT NULL,                 -- CHG0001
  fix_change_id      VARCHAR(24) NOT NULL,
  status             ENUM('AGUARDANDO_CAB','APLICADA') NOT NULL,
  rodada_solicitada  TINYINT UNSIGNED NOT NULL,
  rodada_aplicada    TINYINT UNSIGNED NULL,
  UNIQUE KEY uk_sc_codigo (session_id, codigo),
  CONSTRAINT fk_sc_session FOREIGN KEY (session_id)    REFERENCES game_session(id) ON DELETE CASCADE,
  CONSTRAINT fk_sc_fix     FOREIGN KEY (fix_change_id) REFERENCES fix_change(id)
);

-- Foto de cada rodada (gráficos do post-mortem)
CREATE TABLE session_round_snapshot (
  session_id      CHAR(36) NOT NULL,
  rodada          TINYINT UNSIGNED NOT NULL,
  saude_geral     DECIMAL(5,2) NOT NULL,
  confianca       DECIMAL(5,2) NOT NULL,
  saude_servicos  JSON NOT NULL,                           -- {"AUTH": 92, "CHK": 64, ...}
  PRIMARY KEY (session_id, rodada),
  CONSTRAINT fk_srs_session FOREIGN KEY (session_id) REFERENCES game_session(id) ON DELETE CASCADE
);
