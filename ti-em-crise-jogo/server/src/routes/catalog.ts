import type { FastifyInstance } from 'fastify'
import type { RowDataPacket } from 'mysql2/promise'
import type {
  Catalog, FixChange, FixMitigation, GameAction, HealthStatus, IncidentCategory, IncidentType, ItilPractice,
  PriorityMatrixCell, Problem, RoleSkill, Scenario, ScenarioEvent, Service,
  ServiceDependency, ServicePriority, TeamRole,
} from '../../../shared/catalog.ts'
import { pool } from '../db/pool.ts'

async function rows<T>(sql: string): Promise<T[]> {
  const [result] = await pool.query<RowDataPacket[]>(sql)
  return result as T[]
}

/** Agrupa linhas filhas por uma chave (ex.: dependências por serviço). */
function groupBy<T extends object, K extends keyof T>(list: T[], key: K) {
  const map = new Map<T[K], Omit<T, K>[]>()
  for (const { [key]: k, ...rest } of list) {
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(rest as Omit<T, K>)
  }
  return map
}

export async function loadCatalog(): Promise<Catalog> {
  const [
    practices, priorities, healthStatuses, services, deps, categories, priorityMatrix,
    fixes, mitigations, problems, incidentTypes, typeServices, roles, skills, actions, scenarios, events,
  ] = await Promise.all([
    rows<ItilPractice>(`SELECT id, nome, resumo, dica_jogo AS dicaJogo FROM itil_practice ORDER BY id`),
    rows<ServicePriority>(`SELECT id, nome, impacto, peso, meta_saude AS metaSaude,
        sla_disponibilidade_ref AS slaDisponibilidadeRef, downtime_mensal_ref AS downtimeMensalRef
        FROM service_priority ORDER BY id`),
    rows<HealthStatus>(`SELECT id, nome, faixa_min AS faixaMin, faixa_max AS faixaMax, cor_hex AS corHex, icone
        FROM health_status ORDER BY faixa_min DESC`),
    rows<Omit<Service, 'dependencias'>>(`SELECT id, nome, descricao, tipo, priority_id AS priorityId, icone,
        saude_inicial AS saudeInicial, pos_x AS posX, pos_y AS posY FROM service ORDER BY priority_id, id`),
    rows<ServiceDependency & { serviceId: string }>(`SELECT service_id AS serviceId, depends_on_id AS dependsOnId,
        fator_propagacao AS fatorPropagacao FROM service_dependency`),
    rows<IncidentCategory>(`SELECT id, nome, descricao, cor_hex AS corHex, icone,
        practice_id AS practiceId FROM incident_category`),
    rows<PriorityMatrixCell>(`SELECT impacto, urgencia, prioridade, nome, prazo_horas AS prazoHoras
        FROM priority_matrix ORDER BY prioridade`),
    rows<Omit<FixChange, 'mitigacoes'>>(`SELECT id, nome, descricao FROM fix_change ORDER BY id`),
    rows<FixMitigation & { fixChangeId: string }>(`SELECT fix_change_id AS fixChangeId, incident_type_id AS incidentTypeId,
        reducao_chance AS reducaoChance FROM fix_mitigation`),
    rows<Problem>(`SELECT id, nome, causa_raiz AS causaRaiz, fix_change_id AS fixChangeId FROM problem ORDER BY id`),
    rows<Omit<IncidentType, 'serviceIds'>>(`SELECT id, category_id AS categoryId, nome, sintoma, urgencia,
        dano_base AS danoBase, peso_sorteio AS pesoSorteio, problem_id AS problemId, referencia
        FROM incident_type ORDER BY category_id, id`),
    rows<{ incidentTypeId: string; serviceId: string }>(`SELECT incident_type_id AS incidentTypeId, service_id AS serviceId
        FROM incident_type_service`),
    rows<Omit<TeamRole, 'skills'>>(`SELECT id, nome, descricao, icone, cor_hex AS corHex, acoes_por_rodada AS acoesPorRodada,
        vantagem FROM team_role`),
    rows<RoleSkill & { roleId: string }>(`SELECT role_id AS roleId, category_id AS categoryId, bonus_saude AS bonusSaude
        FROM role_skill`),
    rows<GameAction>(`SELECT id, nome, descricao, icone, ordem, practice_id AS practiceId FROM game_action ORDER BY ordem`),
    rows<Omit<Scenario, 'eventos'>>(`SELECT id, nome, descricao, dificuldade, total_rodadas AS totalRodadas,
        hora_inicio AS horaInicio, confianca_inicial AS confiancaInicial, chance_spawn_base AS chanceSpawnBase,
        cronometro_seg AS cronometroSeg FROM scenario ORDER BY FIELD(dificuldade, 'TUTORIAL', 'NORMAL', 'DIFICIL')`),
    rows<ScenarioEvent & { scenarioId: string }>(`SELECT scenario_id AS scenarioId, rodada, tipo,
        incident_type_id AS incidentTypeId, service_id AS serviceId, multiplicador, mensagem
        FROM scenario_event ORDER BY scenario_id, rodada`),
  ])

  const depsBy = groupBy(deps, 'serviceId')
  const mitBy = groupBy(mitigations, 'fixChangeId')
  const skillsBy = groupBy(skills, 'roleId')
  const eventsBy = groupBy(events, 'scenarioId')
  const servicesBy = new Map<string, string[]>()
  for (const { incidentTypeId, serviceId } of typeServices) {
    servicesBy.set(incidentTypeId, [...(servicesBy.get(incidentTypeId) ?? []), serviceId])
  }

  return {
    practices,
    priorities,
    healthStatuses,
    services: services.map((s) => ({ ...s, dependencias: depsBy.get(s.id) ?? [] })),
    categories,
    priorityMatrix,
    fixes: fixes.map((f) => ({ ...f, mitigacoes: mitBy.get(f.id) ?? [] })),
    problems,
    incidentTypes: incidentTypes.map((t) => ({ ...t, serviceIds: servicesBy.get(t.id) ?? [] })),
    roles: roles.map((r) => ({ ...r, skills: skillsBy.get(r.id) ?? [] })),
    actions,
    scenarios: scenarios.map((s) => ({ ...s, eventos: eventsBy.get(s.id) ?? [] })),
  }
}

export async function catalogRoutes(app: FastifyInstance) {
  app.get('/api/catalog', async () => loadCatalog())
}
