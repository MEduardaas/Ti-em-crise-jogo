// Leituras derivadas do estado (sem efeitos colaterais).
import type {
  Catalog, FixChange, Impacto, IncidentType, PriorityMatrixCell, Problem, Scenario, Service, ServicePriority,
  TeamRole, Urgencia,
} from '@shared/catalog'
import { REGRAS } from './rules'
import type { Acao, EstadoJogo, Incidente, Jogador, ResultadoCusto } from './types'

// ---------------------------------------------------------------------------
// Índice do catálogo (mapas por id), memorizado por instância de catálogo
// ---------------------------------------------------------------------------
export interface Indice {
  service: Map<string, Service>
  priority: Map<string, ServicePriority>
  type: Map<string, IncidentType>
  fix: Map<string, FixChange>
  problem: Map<string, Problem>
  role: Map<string, TeamRole>
  scenario: Map<string, Scenario>
  dependentes: Map<string, { serviceId: string; fator: number }[]>
  tiposPorProblema: Map<string, IncidentType[]>
  matriz: (impacto: Impacto, urgencia: Urgencia) => PriorityMatrixCell
}

const cache = new WeakMap<Catalog, Indice>()

export function indice(cat: Catalog): Indice {
  const hit = cache.get(cat)
  if (hit) return hit
  const byId = <T extends { id: string }>(l: T[]) => new Map(l.map((x) => [x.id, x]))
  const dependentes = new Map<string, { serviceId: string; fator: number }[]>()
  for (const s of cat.services) {
    for (const d of s.dependencias) {
      dependentes.set(d.dependsOnId, [...(dependentes.get(d.dependsOnId) ?? []), { serviceId: s.id, fator: d.fatorPropagacao }])
    }
  }
  const tiposPorProblema = new Map<string, IncidentType[]>()
  for (const t of cat.incidentTypes) tiposPorProblema.set(t.problemId, [...(tiposPorProblema.get(t.problemId) ?? []), t])
  const matriz = new Map(cat.priorityMatrix.map((c) => [`${c.impacto}:${c.urgencia}`, c]))

  const idx: Indice = {
    service: byId(cat.services),
    priority: new Map(cat.priorities.map((p) => [p.id, p])),
    type: byId(cat.incidentTypes),
    fix: byId(cat.fixes),
    problem: byId(cat.problems),
    role: byId(cat.roles),
    scenario: byId(cat.scenarios),
    dependentes,
    tiposPorProblema,
    matriz: (i, u) => matriz.get(`${i}:${u}`)!,
  }
  cache.set(cat, idx)
  return idx
}

// ---------------------------------------------------------------------------
// Métricas
// ---------------------------------------------------------------------------
export function prioridadeServico(cat: Catalog, serviceId: string): ServicePriority {
  const idx = indice(cat)
  return idx.priority.get(idx.service.get(serviceId)!.priorityId)!
}

/** Saúde geral: média da saúde dos serviços, com peso maior para os críticos (P1 = 3, P2 = 2, P3 = 1). */
export function calcularSaudeGeral(cat: Catalog, saude: Record<string, number>): number {
  let soma = 0
  let pesos = 0
  for (const s of cat.services) {
    const peso = prioridadeServico(cat, s.id).peso
    soma += peso * (saude[s.id] ?? 0)
    pesos += peso
  }
  return pesos ? Math.round((soma / pesos) * 10) / 10 : 0
}

export function saudeAtual(s: EstadoJogo): Record<string, number> {
  return Object.fromEntries(Object.entries(s.servicos).map(([id, v]) => [id, v.saude]))
}

export function hora(s: Pick<EstadoJogo, 'horaInicio'>, rodada: number): string {
  return `${String(s.horaInicio + rodada - 1).padStart(2, '0')}:00`
}

export const ATIVOS = ['ALERTA', 'NOVO', 'ABERTO', 'CONTIDO'] as const

export function estaAtivo(i: Incidente) {
  return (ATIVOS as readonly string[]).includes(i.status)
}

/** Incidente grave: serviço P1 abaixo do limiar ou incidente aberto de prioridade 1 (Crítica). */
export function incidenteGrave(cat: Catalog, s: EstadoJogo): boolean {
  const p1Caido = cat.services.some(
    (sv) => sv.priorityId === 'P1' && s.servicos[sv.id].saude < REGRAS.limiarIncidenteGrave,
  )
  return p1Caido || s.incidentes.some((i) => i.status === 'ABERTO' && i.prioridade === 1)
}

/** Quanto as correções aplicadas reduzem a chance de um tipo de incidente (0 a 1). */
export function mitigacao(cat: Catalog, s: EstadoJogo, typeId: string): number {
  const idx = indice(cat)
  let passa = 1
  for (const fid of s.correcoesAplicadas) {
    const m = idx.fix.get(fid)?.mitigacoes.find((x) => x.incidentTypeId === typeId)
    if (m) passa *= 1 - m.reducaoChance
  }
  return 1 - passa
}

/** O que a triagem correta deveria dizer para um incidente. */
export function triagemEsperada(cat: Catalog, inc: Incidente) {
  const idx = indice(cat)
  const impacto = prioridadeServico(cat, inc.serviceId).impacto
  const urgencia = idx.type.get(inc.typeId)!.urgencia
  return { impacto, urgencia, celula: idx.matriz(impacto, urgencia) }
}

/** Saúde extra que o especialista devolve ao conter um incidente da sua área. */
export function bonusEspecialista(cat: Catalog, jogador: Jogador, typeId: string): number {
  const idx = indice(cat)
  const t = idx.type.get(typeId)!
  return idx.role.get(jogador.roleId)!.skills.find((k) => k.categoryId === t.categoryId)?.bonusSaude ?? 0
}

export function acoesRestantes(s: EstadoJogo): number {
  return s.jogadores.reduce((a, j) => a + j.acoes, 0)
}

// ---------------------------------------------------------------------------
// Custo das ações (quase tudo custa 1 ação)
// ---------------------------------------------------------------------------
export function custoAcao(cat: Catalog, s: EstadoJogo, jogador: Jogador, acao: Acao): ResultadoCusto {
  const idx = indice(cat)
  const r = (custo: number, motivo?: string): ResultadoCusto =>
    motivo ? { ok: false, motivo, custo } : custo > jogador.acoes ? { ok: false, motivo: 'Sem ações nesta hora', custo } : { ok: true, custo }

  if (s.fase !== 'WAR_ROOM') return { ok: false, motivo: 'Só durante o War Room' }
  const base = REGRAS.custoAcao

  switch (acao.tipo) {
    case 'CONTER': {
      const inc = s.incidentes.find((i) => i.id === acao.incidentId)
      if (!inc) return { ok: false, motivo: 'Incidente não encontrado' }
      if (inc.status !== 'ABERTO' && inc.status !== 'ALERTA') return r(base, 'Já contido')
      return r(base)
    }
    case 'INVESTIGAR': {
      const inc = s.incidentes.find((i) => i.id === acao.incidentId)
      if (!inc) return { ok: false, motivo: 'Incidente não encontrado' }
      const custo = jogador.roleId === 'DEV' ? 0 : base
      if (s.problemas[idx.type.get(inc.typeId)!.problemId]) return r(custo, 'Causa já encontrada')
      return r(custo)
    }
    case 'CORRIGIR': {
      const p = s.problemas[acao.problemId]
      if (!p) return r(base, 'Investiguem a causa primeiro')
      if (p.status === 'RESOLVIDO') return r(base, 'Já corrigido')
      if (s.mudancas.some((m) => m.problemId === acao.problemId && m.status === 'AGUARDANDO_CAB'))
        return r(base, 'Aguardando o CAB')
      return r(base)
    }
    case 'MONITORAR': {
      if (s.servicos[acao.serviceId]?.monitorado) return r(base, 'Já monitorado')
      return r(base)
    }
    case 'COMUNICAR': {
      const custo = jogador.roleId === 'SERVICE_DESK' ? 0 : base
      if (s.comunicadoNaRodada) return r(custo, 'Já avisaram nesta hora')
      if (!incidenteGrave(cat, s)) return r(custo, 'Só em incidente grave')
      return r(custo)
    }
  }
}

// ---------------------------------------------------------------------------
// Post-mortem
// ---------------------------------------------------------------------------
export interface Conquista {
  id: string
  titulo: string
  descricao: string
}

export function metricasFinais(cat: Catalog, s: EstadoJogo) {
  const { stats } = s
  const totalSla = stats.slaCumpridos + stats.slaViolacoes
  const slaCumpridoPct = totalSla ? Math.round((stats.slaCumpridos / totalSla) * 1000) / 10 : 100
  const totalTriagem = stats.triagensCorretas + stats.triagensErradas
  const triagemPct = totalTriagem ? Math.round((stats.triagensCorretas / totalTriagem) * 100) : 100
  const saudeGeralMedia = s.snapshots.length
    ? Math.round((s.snapshots.reduce((a, x) => a + x.saudeGeral, 0) / s.snapshots.length) * 10) / 10
    : calcularSaudeGeral(cat, saudeAtual(s))
  const problemasResolvidos = Object.values(s.problemas).filter((p) => p.status === 'RESOLVIDO').length
  const confiancaFinal = Math.round(s.confianca)
  const estrelas =
    s.resultado !== 'VITORIA' ? 0 : confiancaFinal >= 60 && slaCumpridoPct >= 80 ? 3 : confiancaFinal >= 30 ? 2 : 1

  const violouP1 = s.incidentes.some((i) => i.slaViolado && prioridadeServico(cat, i.serviceId).id === 'P1')
  const conquistas: Conquista[] = []
  if (s.resultado === 'VITORIA' && !violouP1)
    conquistas.push({ id: 'p1', titulo: 'Zero P1 atrasado', descricao: 'Nenhum prazo de serviço crítico estourado.' })
  if (problemasResolvidos >= 3)
    conquistas.push({ id: 'raiz', titulo: 'Caçadores de causa raiz', descricao: '3 ou mais problemas eliminados de vez.' })
  if (stats.prevenidos >= 2)
    conquistas.push({ id: 'prev', titulo: 'Prevenir > remediar', descricao: '2 ou mais incidentes evitados.' })
  if (stats.triagensErradas === 0 && stats.triagensCorretas >= 3)
    conquistas.push({ id: 'triagem', titulo: 'Triagem certeira', descricao: 'Todas as classificações corretas.' })

  return {
    slaCumpridoPct, triagemPct, saudeGeralMedia, problemasResolvidos, estrelas, conquistas, confiancaFinal,
    totalIncidentes: s.incidentes.filter((i) => i.status !== 'PREVENIDO').length,
  }
}
