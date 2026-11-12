// Estado da partida. Tudo serializável (JSON) para salvar/reproduzir.

export type Fase = 'BRIEFING' | 'TRIAGEM' | 'WAR_ROOM' | 'IMPACTO' | 'RETROSPECTIVA' | 'FIM'

export type StatusIncidente = 'ALERTA' | 'NOVO' | 'ABERTO' | 'CONTIDO' | 'RESOLVIDO' | 'PREVENIDO'

export interface Incidente {
  id: number
  codigo: string // INC0001
  typeId: string
  serviceId: string
  status: StatusIncidente
  prioridade: number // 1 (Crítica) a 4 (Baixa), pela matriz
  prazo: number // horas para conter (SLA)
  rodadaAbertura: number
  rodadaContencao: number | null
  triagemCorreta: boolean | null
  slaViolado: boolean
  reincidencias: number
}

export interface Jogador {
  id: number
  nome: string
  roleId: string
  acoes: number // ações restantes nesta hora
  acoesMax: number
}

/** ERRO_CONHECIDO = a causa foi descoberta; RESOLVIDO = a correção foi aplicada. */
export type StatusProblema = 'ERRO_CONHECIDO' | 'RESOLVIDO'

export interface RegistroProblema {
  problemId: string
  status: StatusProblema
  rodadaDescoberta: number
  rodadaResolucao: number | null
}

export interface Mudanca {
  id: number
  codigo: string // CHG0001
  fixId: string
  problemId: string
  rodadaSolicitada: number
  rodadaAplicacao: number
  status: 'AGUARDANDO_CAB' | 'APLICADA'
}

export interface EstadoServico {
  saude: number
  monitorado: boolean
}

export type TipoLog = 'rodada' | 'evento' | 'alerta' | 'incidente' | 'acao' | 'sucesso' | 'falha'

export interface EntradaLog {
  id: number
  rodada: number
  tipo: TipoLog
  texto: string
}

export interface Licao {
  id: string
  titulo: string
  texto: string
  practiceId: string
}

export interface RelatorioRodada {
  rodada: number
  perdaDireta: Record<string, number>
  perdaCascata: Record<string, number>
  recuperacao: Record<string, number>
  cascatas: { de: string; para: string; perda: number }[]
  perdaConfianca: { meta: number; comunicacao: number; sla: number; total: number }
  incidenteGrave: boolean
  comunicado: boolean
  saudeAntes: number
  saudeDepois: number
  confiancaAntes: number
  confiancaDepois: number
  licoes: Licao[]
}

export interface Snapshot {
  rodada: number
  saudeGeral: number
  confianca: number
  saude: Record<string, number>
}

export interface Estatisticas {
  slaCumpridos: number
  slaViolacoes: number
  triagensCorretas: number
  triagensErradas: number
  causasEncontradas: number
  correcoes: number
  prevenidos: number
  reincidencias: number
}

export interface EstadoJogo {
  scenarioId: string
  nomeEquipe: string
  seed: number
  rng: number
  rodada: number
  totalRodadas: number
  horaInicio: number
  fase: Fase
  confianca: number
  servicos: Record<string, EstadoServico>
  jogadores: Jogador[]
  incidentes: Incidente[]
  problemas: Record<string, RegistroProblema>
  mudancas: Mudanca[]
  correcoesAplicadas: string[]
  comunicadoNaRodada: boolean
  bonusAcoesRodadas: number
  pico: { serviceId: string | null; multiplicador: number } | null
  log: EntradaLog[]
  licoesVistas: string[]
  licoesPendentes: Licao[]
  relatorio: RelatorioRodada | null
  snapshots: Snapshot[]
  stats: Estatisticas
  resultado: 'VITORIA' | 'DERROTA' | null
  seq: { log: number; incidente: number; mudanca: number }
}

export type Acao =
  | { tipo: 'CONTER'; incidentId: number }
  | { tipo: 'INVESTIGAR'; incidentId: number }
  | { tipo: 'CORRIGIR'; problemId: string }
  | { tipo: 'MONITORAR'; serviceId: string }
  | { tipo: 'COMUNICAR' }

export type ResultadoCusto = { ok: true; custo: number } | { ok: false; motivo: string; custo?: number }

export interface ConfigPartida {
  scenarioId: string
  nomeEquipe: string
  jogadores: { nome: string; roleId: string }[]
  seed: number
}
