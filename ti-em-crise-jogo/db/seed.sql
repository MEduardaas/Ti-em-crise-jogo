-- =============================================================================
-- TI em Crise — Seed do catálogo (empresa fictícia: ServiceUp)
-- Versão simplificada para iniciantes: linguagem simples, 5 ações, 6 serviços.
-- =============================================================================
USE ti_em_crise;

-- Práticas ITIL 4 -------------------------------------------------------------
INSERT INTO itil_practice (id, nome, resumo, dica_jogo) VALUES
('SERVICE_DESK', 'Central de Serviço',               'O ponto único de contato entre os usuários e a TI.',                 'Todo chamado novo passa pela triagem, que define a prioridade e o prazo.'),
('INCIDENT',     'Gestão de Incidentes',             'Fazer o serviço voltar a funcionar o mais rápido possível.',         'Conter para o estrago na hora, mas não elimina a causa: o incidente pode voltar.'),
('PROBLEM',      'Gestão de Problemas',              'Descobrir e eliminar a causa raiz dos incidentes.',                  'Investigar revela a causa (erro conhecido) e qual correção definitiva aplicar.'),
('CHANGE',       'Habilitação de Mudanças',          'Fazer mudanças com segurança, avaliando o risco antes.',             'A correção definitiva é uma mudança: o CAB aprova e ela vale na hora seguinte.'),
('SLM',          'Gestão de Nível de Serviço',       'Combinar metas (SLA) com o cliente e mantê-lo informado.',           'Cada prioridade tem um prazo para conter. Em incidente grave, avisem os clientes.'),
('MONITORING',   'Monitoramento e Gestão de Eventos','Observar os serviços para perceber problemas cedo.',                 'Um serviço monitorado avisa uma hora antes: o incidente chega como alerta.'),
('CONFIG',       'Gestão de Configuração',           'Saber quais serviços existem e como dependem uns dos outros (CMDB).','O mapa de serviços mostra por onde uma falha se espalha.'),
('CSI',          'Melhoria Contínua',                'Melhorar sempre, aprendendo com o que aconteceu.',                   'Na retrospectiva e no post-mortem, a equipe escolhe o que melhorar.'),
('SECURITY',     'Gestão de Segurança da Informação','Proteger os dados e os sistemas da empresa.',                        'Falhas de segurança (OWASP) só somem de vez com correção no código.'),
('CAPACITY',     'Gestão de Capacidade e Desempenho','Garantir que os sistemas aguentem a demanda.',                       'Lentidão e excesso de acessos se resolvem com otimização e capacidade.');

-- Prioridade dos serviços (peso = quantas vezes o serviço "conta") -------------
INSERT INTO service_priority (id, nome, impacto, peso, meta_saude, sla_disponibilidade_ref, downtime_mensal_ref) VALUES
('P1', 'Crítico',    'ALTO',  3, 90, 99.90, '~43 min'),
('P2', 'Importante', 'MEDIO', 2, 80, 99.50, '~3 h 39 min'),
('P3', 'Suporte',    'BAIXO', 1, 70, 99.00, '~7 h 18 min');

INSERT INTO health_status (id, nome, faixa_min, faixa_max, cor_hex, icone) VALUES
('OPERACIONAL', 'Funcionando',  90, 100, '#10B981', 'CircleCheck'),
('DEGRADADO',   'Instável',     70,  89, '#F59E0B', 'CircleDashed'),
('PARCIAL',     'Com falhas',   40,  69, '#F97316', 'TriangleAlert'),
('GRAVE',       'Fora do ar',    0,  39, '#EF4444', 'CircleX');

-- Serviços (CMDB) -------------------------------------------------------------
INSERT INTO service (id, nome, descricao, tipo, priority_id, icone, pos_x, pos_y) VALUES
('CHK',  'Loja Online (pagamentos)', 'Onde o cliente finaliza a compra e paga.',          'NEGOCIO', 'P1', 'ShoppingCart', 270, 105),
('DB',   'Banco de Dados',           'Guarda pedidos, estoque e clientes.',               'TECNICO', 'P1', 'Database',       0, 240),
('AUTH', 'Login',                    'Entrada de clientes, funcionários e parceiros.',    'TECNICO', 'P2', 'KeyRound',       0,  50),
('PORT', 'Site e App',               'Catálogo, busca e acompanhamento de pedidos.',      'NEGOCIO', 'P2', 'Globe',        270, 210),
('MAIL', 'E-mail',                   'Comunicação interna e avisos aos clientes.',        'NEGOCIO', 'P3', 'Mail',         270,   0),
('REL',  'Relatórios',               'Painéis de vendas usados pela diretoria.',          'NEGOCIO', 'P3', 'ChartColumn',  270, 315);

INSERT INTO service_dependency (service_id, depends_on_id, fator_propagacao) VALUES
('CHK',  'DB',   0.60), ('CHK',  'AUTH', 0.50),
('PORT', 'DB',   0.50), ('PORT', 'AUTH', 0.40),
('REL',  'DB',   0.50),
('MAIL', 'AUTH', 0.30);

-- Categorias ------------------------------------------------------------------
INSERT INTO incident_category (id, nome, descricao, cor_hex, icone, practice_id) VALUES
('FALHA',      'Falha no servidor',   'Erros, falhas de banco, falha ao salvar.',              '#EF4444', 'ServerCrash', 'INCIDENT'),
('LENTIDAO',   'Lentidão no sistema', 'Consultas mal feitas, falta de índice, travamentos.',   '#F59E0B', 'Hourglass',   'CAPACITY'),
('SEGURANCA',  'Falha de segurança',  'Vulnerabilidades OWASP e gates de segurança.',          '#A855F7', 'ShieldAlert', 'SECURITY'),
('SOBRECARGA', 'Excesso de chamados', 'Acessos demais: integrações, robôs, picos de campanha.','#3B82F6', 'Activity',    'CAPACITY');

-- Matriz de prioridade (Impacto x Urgência) ------------------------------------
INSERT INTO priority_matrix (impacto, urgencia, prioridade, nome, prazo_horas) VALUES
('ALTO',  'ALTA',  1, 'Crítica', 1), ('ALTO',  'BAIXA', 2, 'Alta',  2),
('MEDIO', 'ALTA',  2, 'Alta',    2), ('MEDIO', 'BAIXA', 3, 'Média', 3),
('BAIXO', 'ALTA',  3, 'Média',   3), ('BAIXO', 'BAIXA', 4, 'Baixa', 4);

-- Correções definitivas ----------------------------------------------------------
INSERT INTO fix_change (id, nome, descricao) VALUES
('FIX_TESTES',        'Testes automáticos no deploy',      'A versão nova só vai para produção se passar nos testes.'),
('FIX_POOL',          'Ajustar o pool de conexões',        'As conexões voltam para o banco mesmo quando dá erro.'),
('FIX_LOGS',          'Limpeza automática de logs',        'Logs antigos são compactados e apagados sozinhos.'),
('FIX_INDICE',        'Criar índice no banco',             'A consulta para de ler a tabela inteira.'),
('FIX_CONSULTAS',     'Otimizar as consultas',             'Uma única consulta busca a lista inteira (fim do N+1).'),
('FIX_CACHE',         'Cache com validade escalonada',     'As chaves do cache expiram em horários diferentes.'),
('FIX_CODIGO_SEGURO', 'Código seguro + gate de segurança', 'Consultas parametrizadas e verificação automática antes do deploy.'),
('FIX_AUTORIZACAO',   'Conferir o dono de cada pedido',    'A API verifica se o pedido é mesmo de quem está logado.'),
('FIX_TOKEN',         'Token para integrações',            'O parceiro faz login uma vez e reutiliza um token.'),
('FIX_WAF',           'Firewall de aplicação (WAF)',       'Bloqueia robôs e tráfego malicioso antes de chegar ao site.'),
('FIX_AUTOSCALE',     'Servidores automáticos',            'Novos servidores entram no ar quando o acesso aumenta.');

-- Problemas (causa raiz) ------------------------------------------------------
INSERT INTO problem (id, nome, causa_raiz, fix_change_id) VALUES
('PRB_PIPELINE',  'Deploy sem testes',              'A versão nova vai para produção sem nenhum teste automático.',  'FIX_TESTES'),
('PRB_POOL',      'Conexões vazando',               'Quando dá erro, o código não devolve a conexão ao banco.',      'FIX_POOL'),
('PRB_LOGS',      'Logs sem limpeza',               'Os logs crescem sem parar até encher o disco.',                 'FIX_LOGS'),
('PRB_INDICE',    'Falta de índice',                'A consulta procura em milhões de linhas sem um índice.',        'FIX_INDICE'),
('PRB_N1',        'Consultas repetidas (N+1)',      'Cada item da lista dispara uma nova consulta ao banco.',        'FIX_CONSULTAS'),
('PRB_CACHE',     'Cache expirando junto',          'Todas as chaves do cache têm a mesma validade.',                'FIX_CACHE'),
('PRB_INJECAO',   'Entrada sem tratamento',         'O texto digitado pelo usuário vai direto para o SQL ou o HTML.','FIX_CODIGO_SEGURO'),
('PRB_AUTHZ',     'Falta de autorização',           'A API confia no número do pedido que o cliente envia.',         'FIX_AUTORIZACAO'),
('PRB_LOGIN_API', 'Parceiro faz login a cada chamada','Cada requisição do parceiro faz um login no LDAP (0,5 s).',   'FIX_TOKEN'),
('PRB_BORDA',     'Site sem proteção contra robôs', 'Nada filtra o tráfego malicioso antes da aplicação.',           'FIX_WAF'),
('PRB_CAPACIDADE','Capacidade fixa',                'O número de servidores não acompanha a demanda.',               'FIX_AUTOSCALE');

-- Tipos de ocorrência ---------------------------------------------------------
-- Urgência ALTA = está parando o serviço ou piorando rápido. BAIXA = incomoda, mas dá para esperar.
INSERT INTO incident_type (id, category_id, nome, sintoma, urgencia, dano_base, peso_sorteio, problem_id, referencia) VALUES
('FAL_DEPLOY', 'FALHA',      'Erro depois da atualização',       'Desde a versão nova, 1 em cada 5 clientes vê "Erro 500".',                         'ALTA',  12, 10, 'PRB_PIPELINE',  NULL),
('FAL_POOL',   'FALHA',      'Banco recusando conexões',         'Aparece "Too many connections" e várias telas dão erro.',                          'ALTA',  14,  8, 'PRB_POOL',      NULL),
('FAL_DISCO',  'FALHA',      'Disco quase cheio',                'O disco está em 95% e as gravações começaram a atrasar.',                           'BAIXA',  6,  8, 'PRB_LOGS',      NULL),
('LEN_INDICE', 'LENTIDAO',   'Relatório lento',                  'O relatório de vendas leva 40 segundos para abrir.',                               'BAIXA',  6, 10, 'PRB_INDICE',    NULL),
('LEN_N1',     'LENTIDAO',   'Lista de pedidos lenta',           'A tela "Meus pedidos" faz 500 consultas ao banco e demora 15 segundos.',           'BAIXA',  7,  7, 'PRB_N1',        NULL),
('LEN_CACHE',  'LENTIDAO',   'Tudo lento de uma vez',            'O cache expirou inteiro e o banco está recebendo 20 vezes mais acessos.',          'ALTA',  12,  7, 'PRB_CACHE',     NULL),
('SEG_SQLI',   'SEGURANCA',  'Injeção de SQL na busca',          'Um teste de invasão conseguiu ler dados de clientes pelo campo de busca.',         'ALTA',  14,  6, 'PRB_INJECAO',   'OWASP A03'),
('SEG_IDOR',   'SEGURANCA',  'Cliente vê o pedido de outro',     'Trocando o número na URL, aparece o pedido de outra pessoa.',                      'ALTA',  12,  6, 'PRB_AUTHZ',     'OWASP A01'),
('SEG_XSS',    'SEGURANCA',  'Script malicioso barrado no gate', 'O gate de segurança bloqueou a versão nova: havia um script (XSS) nos comentários.','BAIXA',  5,  5, 'PRB_INJECAO',   'OWASP A03'),
('SOB_LDAP',   'SOBRECARGA', 'Parceiro sobrecarregando o login', 'O parceiro LogiX faz 2.300 logins por minuto; cada um leva 0,5 s e a fila estoura.', 'ALTA',  14,  8, 'PRB_LOGIN_API', NULL),
('SOB_DDOS',   'SOBRECARGA', 'Ataque de robôs (DDoS)',           'Milhares de acessos por segundo vindos de robôs estão derrubando o site.',         'ALTA',  14,  5, 'PRB_BORDA',     NULL),
('SOB_PICO',   'SOBRECARGA', 'Pico de acessos da campanha',      'A campanha triplicou os acessos: está lento, mas funcionando.',                    'BAIXA',  8,  7, 'PRB_CAPACIDADE',NULL);

INSERT INTO incident_type_service (incident_type_id, service_id) VALUES
('FAL_DEPLOY','PORT'), ('FAL_DEPLOY','CHK'), ('FAL_DEPLOY','AUTH'),
('FAL_POOL','DB'),
('FAL_DISCO','MAIL'), ('FAL_DISCO','REL'), ('FAL_DISCO','DB'),
('LEN_INDICE','REL'), ('LEN_INDICE','DB'),
('LEN_N1','PORT'),
('LEN_CACHE','CHK'),
('SEG_SQLI','PORT'),
('SEG_IDOR','CHK'),
('SEG_XSS','PORT'),
('SOB_LDAP','AUTH'),
('SOB_DDOS','PORT'), ('SOB_DDOS','CHK'),
('SOB_PICO','CHK'), ('SOB_PICO','PORT');

-- Prevenção: cada correção elimina os tipos de ocorrência da sua causa raiz
INSERT INTO fix_mitigation (fix_change_id, incident_type_id, reducao_chance) VALUES
('FIX_TESTES','FAL_DEPLOY',1.00),
('FIX_POOL','FAL_POOL',1.00),
('FIX_LOGS','FAL_DISCO',1.00),
('FIX_INDICE','LEN_INDICE',1.00),
('FIX_CONSULTAS','LEN_N1',1.00),
('FIX_CACHE','LEN_CACHE',1.00),
('FIX_CODIGO_SEGURO','SEG_SQLI',1.00), ('FIX_CODIGO_SEGURO','SEG_XSS',1.00),
('FIX_AUTORIZACAO','SEG_IDOR',1.00),
('FIX_TOKEN','SOB_LDAP',1.00),
('FIX_WAF','SOB_DDOS',1.00),
('FIX_AUTOSCALE','SOB_PICO',1.00);

-- Papéis: cada um tem 2 ações por hora e UMA vantagem ---------------------------
INSERT INTO team_role (id, nome, descricao, icone, cor_hex, acoes_por_rodada, vantagem) VALUES
('SERVICE_DESK', 'Service Desk',        'O ponto de contato com os usuários.',        'Headset',  '#22D3EE', 2, 'Avisar os clientes não gasta ação.'),
('INCIDENT_MGR', 'Gerente de Mudanças', 'Coordena a equipe e preside o CAB.',         'Compass',  '#F472B6', 2, 'Preside o CAB: as correções pedidas por ele valem na mesma hora.'),
('INFRA',        'Infraestrutura',      'Cuida de servidores, discos e rede.',        'Server',   '#34D399', 2, 'Especialista em falha no servidor e excesso de chamados.'),
('DBA',          'DBA',                 'Cuida do banco de dados.',                   'Database', '#FBBF24', 2, 'Especialista em lentidão.'),
('SECOPS',       'Segurança',           'Protege contra ataques e vulnerabilidades.', 'Shield',   '#A78BFA', 2, 'Especialista em falha de segurança.'),
('DEV',          'Desenvolvimento',     'Escreve e corrige o código.',                'Code',     '#60A5FA', 2, 'Investigar a causa não gasta ação.');

INSERT INTO role_skill (role_id, category_id, bonus_saude) VALUES
('INFRA','FALHA',10), ('INFRA','SOBRECARGA',10),
('DBA','LENTIDAO',10),
('SECOPS','SEGURANCA',10);

-- Ações (todas custam 1 ação) ---------------------------------------------------
INSERT INTO game_action (id, nome, descricao, icone, ordem, practice_id) VALUES
('CONTER',     'Conter o incidente',  'Para o estrago agora. O incidente fica contido, mas pode voltar enquanto a causa existir. Num alerta, evita o incidente.', 'FireExtinguisher', 1, 'INCIDENT'),
('INVESTIGAR', 'Investigar a causa',  'Descobre a causa raiz do incidente (erro conhecido) e qual correção definitiva aplicar.',                               'Search',           2, 'PROBLEM'),
('CORRIGIR',   'Corrigir de vez',     'Pede a mudança que elimina a causa. O CAB aprova e ela vale no início da próxima hora.',                               'Wrench',           3, 'CHANGE'),
('MONITORAR',  'Monitorar o serviço', 'Os próximos incidentes desse serviço chegam uma hora antes, como alerta, e podem ser evitados.',                        'Radar',            4, 'MONITORING'),
('COMUNICAR',  'Avisar os clientes',  'Em incidente grave, informa clientes e diretoria. Sem aviso, a confiança cai 50% mais rápido naquela hora.',           'Megaphone',        5, 'SLM');

-- Cenários --------------------------------------------------------------------
INSERT INTO scenario (id, nome, descricao, dificuldade, total_rodadas, hora_inicio, confianca_inicial, chance_spawn_base, cronometro_seg) VALUES
('PRIMEIRO_PLANTAO', 'Primeiro Plantão',    'Com o mentor ligado: aprenda o ciclo incidente → problema → mudança.', 'TUTORIAL', 5, 8, 100, 0.20,   0),
('DIA_SERVICEUP',    'Um dia na ServiceUp', 'Um dia normal de trabalho… até deixar de ser.',                        'NORMAL',   8, 8, 100, 1.80,   0),
('BLACK_FRIDAY',     'Black Friday',        'Acessos triplicados, cronômetro ligado e pouca margem para erro.',     'DIFICIL',  8, 8, 100, 2.80, 120);

INSERT INTO scenario_event (scenario_id, rodada, tipo, incident_type_id, service_id, multiplicador, mensagem) VALUES
('PRIMEIRO_PLANTAO', 1, 'INCIDENTE',     'LEN_INDICE', 'REL',  1.00, 'A diretoria reclamou: o relatório de vendas está levando 40 s para abrir.'),
('PRIMEIRO_PLANTAO', 2, 'DEPLOY',        'FAL_DEPLOY', 'PORT', 1.00, 'A versão 4.2 do site entrou no ar às 09h.'),
('PRIMEIRO_PLANTAO', 3, 'RETROSPECTIVA', NULL,         NULL,   1.00, 'Pausa para o café: retrospectiva rápida. Escolham uma melhoria.'),
('PRIMEIRO_PLANTAO', 4, 'INCIDENTE',     'SOB_LDAP',   'AUTH', 1.00, 'O parceiro LogiX começou uma sincronização em massa: 2.300 logins por minuto.'),
('PRIMEIRO_PLANTAO', 5, 'INCIDENTE',     'SEG_XSS',    'PORT', 1.00, 'O gate de segurança barrou a próxima versão do site.'),
('DIA_SERVICEUP',    1, 'INCIDENTE',     'LEN_INDICE', 'REL',  1.00, 'A diretoria reclamou: o relatório de vendas está levando 40 s para abrir.'),
('DIA_SERVICEUP',    2, 'DEPLOY',        'FAL_DEPLOY', 'PORT', 1.00, 'A versão 4.2 do site entrou no ar às 09h.'),
('DIA_SERVICEUP',    5, 'RETROSPECTIVA', NULL,         NULL,   1.00, 'Meio-dia: retrospectiva do almoço. Escolham uma melhoria para a tarde.'),
('DIA_SERVICEUP',    6, 'INCIDENTE',     'SOB_LDAP',   'AUTH', 1.00, 'O parceiro LogiX começou uma sincronização em massa: 2.300 logins por minuto.'),
('DIA_SERVICEUP',    7, 'AUDITORIA',     'SEG_SQLI',   'PORT', 1.00, 'O teste de invasão contratado encontrou uma falha na busca do site.'),
('DIA_SERVICEUP',    8, 'PICO_TRAFEGO',  NULL,         'CHK',  1.50, 'Promoção relâmpago: 1,5× mais acessos na loja.'),
('BLACK_FRIDAY',     1, 'INCIDENTE',     'SOB_PICO',   'CHK',  1.00, 'Abriu a Black Friday: os acessos triplicaram.'),
('BLACK_FRIDAY',     3, 'DEPLOY',        'FAL_DEPLOY', 'CHK',  1.00, 'Uma correção de cupom foi publicada às pressas.'),
('BLACK_FRIDAY',     5, 'RETROSPECTIVA', NULL,         NULL,   1.00, 'Meio-dia: retrospectiva do almoço.'),
('BLACK_FRIDAY',     5, 'INCIDENTE',     'SOB_DDOS',   'CHK',  1.00, 'Robôs de concorrentes estão copiando os preços da loja.'),
('BLACK_FRIDAY',     6, 'PICO_TRAFEGO',  NULL,         NULL,   2.00, 'Horário nobre: 2× mais acessos em todos os serviços.'),
('BLACK_FRIDAY',     7, 'INCIDENTE',     'SOB_LDAP',   'AUTH', 1.00, 'Marketplaces sincronizando o estoque com um login por chamada.'),
('BLACK_FRIDAY',     8, 'INCIDENTE',     'SEG_IDOR',   'CHK',  1.00, 'Um cliente avisou que consegue ver os pedidos de outras pessoas.');
