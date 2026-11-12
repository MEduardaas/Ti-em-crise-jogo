// Tipos do catálogo do jogo, compartilhados entre server/ e web/.
// Espelham as tabelas de db/schema.sql (em camelCase).

export type PriorityId = 'P1' | 'P2' | 'P3'
export type Impacto = 'ALTO' | 'MEDIO' | 'BAIXO'
export type Urgencia = 'ALTA' | 'BAIXA'
export type Dificuldade = 'TUTORIAL' | 'NORMAL' | 'DIFICIL'
export type TipoEvento = 'INCIDENTE' | 'PICO_TRAFEGO' | 'DEPLOY' | 'AUDITORIA' | 'RETROSPECTIVA'

export interface ItilPractice {
  id: string
  nome: string
  resumo: string
  dicaJogo: string
}

export interface ServicePriority {
  id: PriorityId
  nome: string
  impacto: Impacto
  peso: number
  metaSaude: number
  slaDisponibilidadeRef: number
  downtimeMensalRef: string
}

export interface HealthStatus {
  id: string
  nome: string
  faixaMin: number
  faixaMax: number
  corHex: string
  icone: string
}

export interface ServiceDependency {
  dependsOnId: string
  fatorPropagacao: number
}

export interface Service {
  id: string
  nome: string
  descricao: string
  tipo: 'NEGOCIO' | 'TECNICO'
  priorityId: PriorityId
  icone: string
  saudeInicial: number
  posX: number
  posY: number
  dependencias: ServiceDependency[]
}

export interface IncidentCategory {
  id: string
  nome: string
  descricao: string
  corHex: string
  icone: string
  practiceId: string
}

export interface PriorityMatrixCell {
  impacto: Impacto
  urgencia: Urgencia
  prioridade: number
  nome: string
  prazoHoras: number
}

export interface FixMitigation {
  incidentTypeId: string
  reducaoChance: number
}

/** Correção definitiva de uma causa raiz, aplicada por uma mudança. */
export interface FixChange {
  id: string
  nome: string
  descricao: string
  mitigacoes: FixMitigation[]
}

export interface Problem {
  id: string
  nome: string
  causaRaiz: string
  fixChangeId: string
}

export interface IncidentType {
  id: string
  categoryId: string
  nome: string
  sintoma: string
  urgencia: Urgencia
  danoBase: number
  pesoSorteio: number
  problemId: string
  referencia: string | null
  serviceIds: string[]
}

export interface RoleSkill {
  categoryId: string
  bonusSaude: number
}

export interface TeamRole {
  id: string
  nome: string
  descricao: string
  icone: string
  corHex: string
  acoesPorRodada: number
  vantagem: string
  skills: RoleSkill[]
}

export interface GameAction {
  id: string
  nome: string
  descricao: string
  icone: string
  ordem: number
  practiceId: string
}

export interface ScenarioEvent {
  rodada: number
  tipo: TipoEvento
  incidentTypeId: string | null
  serviceId: string | null
  multiplicador: number
  mensagem: string
}

export interface Scenario {
  id: string
  nome: string
  descricao: string
  dificuldade: Dificuldade
  totalRodadas: number
  horaInicio: number
  confiancaInicial: number
  chanceSpawnBase: number
  /** 0 = sem cronômetro (o professor encerra a hora) */
  cronometroSeg: number
  eventos: ScenarioEvent[]
}

export interface Catalog {
  practices: ItilPractice[]
  priorities: ServicePriority[]
  healthStatuses: HealthStatus[]
  services: Service[]
  categories: IncidentCategory[]
  priorityMatrix: PriorityMatrixCell[]
  fixes: FixChange[]
  problems: Problem[]
  incidentTypes: IncidentType[]
  roles: TeamRole[]
  actions: GameAction[]
  scenarios: Scenario[]
}

export interface RankingEntry {
  id: string
  nomeEquipe: string
  scenarioId: string
  status: 'VITORIA' | 'DERROTA'
  estrelas: number
  confiancaFinal: number
  saudeGeralMedia: number
  slaCumpridoPct: number
  finalizadoEm: string
}
