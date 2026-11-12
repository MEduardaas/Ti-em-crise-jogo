import type { Licao } from './types'

/** Números de balanceamento. Ajuste aqui e rode `npm test` para ver o efeito na simulação. */
export const REGRAS = {
  custoAcao: 1, // toda ação custa 1 (salvo vantagem de papel)
  chanceReincidencia: 0.5, // chance por hora de um incidente só contido voltar
  recuperacaoNatural: 3, // saúde recuperada por hora em serviço sem perda
  escaladaPorRodada: 0.25, // +25% de estrago por hora sem contenção
  divisorPerda: 4, // perda de confiança = peso × pontos abaixo da meta ÷ divisor
  multiplicadorSemAviso: 1.5,
  penalidadeSla: 3,
  bonusCorrecao: 10, // saúde devolvida a cada serviço quando a causa é eliminada de vez
  limiarIncidenteGrave: 40,
  rampaSpawnPorRodada: 0.08,
  /** Mais jogadores = mais ações = mais incidentes: 2 jog. → 1×; 4 → 1,5×; 6 → 2× */
  fatorEquipe: (jogadores: number) => 0.5 + 0.25 * jogadores,
  /** Equipes de até 3 pessoas: cada jogador ganha +1 ação por hora. */
  bonusAcoesEquipeEnxuta: (jogadores: number) => (jogadores <= 3 ? 1 : 0),
} as const

export const NOME_STATUS_INCIDENTE = {
  ALERTA: 'Alerta',
  NOVO: 'Novo',
  ABERTO: 'Causando estrago',
  CONTIDO: 'Contido',
  RESOLVIDO: 'Resolvido',
  PREVENIDO: 'Evitado',
} as const

export const NOME_IMPACTO = { ALTO: 'Alto', MEDIO: 'Médio', BAIXO: 'Baixo' } as const
export const NOME_URGENCIA = { ALTA: 'Alta', BAIXA: 'Baixa' } as const

/** Cards de aprendizado: aparecem uma vez por partida, quando a mecânica acontece. */
export const LICOES: Record<string, Licao> = {
  triagem: {
    id: 'triagem', practiceId: 'SERVICE_DESK', titulo: 'Triagem: impacto × urgência',
    texto: 'A prioridade nasce de duas perguntas: quão importante é o serviço (P1, P2 ou P3) e quão rápido o problema piora. Ela define o prazo para conter (SLA).',
  },
  contorno: {
    id: 'contorno', practiceId: 'INCIDENT', titulo: 'Conter não é resolver',
    texto: 'Conter para o estrago rápido (Gestão de Incidentes), mas a causa continua lá: o incidente pode voltar.',
  },
  reincidencia: {
    id: 'reincidencia', practiceId: 'PROBLEM', titulo: 'O incidente voltou!',
    texto: 'Enquanto a causa raiz existir, um incidente contido tem 50% de chance de voltar a cada hora (e causa estrago de novo). Investiguem a causa.',
  },
  erro_conhecido: {
    id: 'erro_conhecido', practiceId: 'PROBLEM', titulo: 'Causa encontrada',
    texto: 'Agora é um erro conhecido (Gestão de Problemas): vocês sabem o porquê e qual correção aplicar. Próximo passo: Corrigir de vez.',
  },
  mudanca: {
    id: 'mudanca', practiceId: 'CHANGE', titulo: 'A correção foi para o CAB',
    texto: 'Toda correção em produção é uma mudança. O CAB (comitê de mudanças) avalia o risco antes, e ela entra em vigor na próxima hora.',
  },
  causa_raiz: {
    id: 'causa_raiz', practiceId: 'CHANGE', titulo: 'Problema eliminado',
    texto: 'A mudança eliminou a causa raiz: os incidentes dela foram resolvidos e esse tipo de falha não volta mais.',
  },
  prevencao: {
    id: 'prevencao', practiceId: 'CSI', titulo: 'Prevenir é mais barato',
    texto: 'Um incidente foi evitado antes de causar estrago. Monitorar e corrigir causas é o jeito mais barato de cumprir o SLA.',
  },
  monitoramento: {
    id: 'monitoramento', practiceId: 'MONITORING', titulo: 'Alerta antecipado',
    texto: 'Como o serviço é monitorado, o problema apareceu como alerta. Contendo agora, o incidente nem chega a acontecer.',
  },
  cascata: {
    id: 'cascata', practiceId: 'CONFIG', titulo: 'Efeito cascata',
    texto: 'Os serviços dependem uns dos outros (as setas do mapa). Quando um serviço base sofre, quem depende dele sofre também.',
  },
  incidente_grave: {
    id: 'incidente_grave', practiceId: 'SLM', titulo: 'Incidente grave',
    texto: 'Um serviço crítico caiu ou há um incidente de prioridade Crítica. Avisem os clientes: o silêncio faz a confiança cair 50% mais rápido.',
  },
  sla: {
    id: 'sla', practiceId: 'SLM', titulo: 'SLA estourado',
    texto: 'Cada prioridade tem um prazo para conter o incidente. Estourou o prazo? A confiança dos clientes cai mais 3.',
  },
}

export interface OpcaoRetro {
  id: 'MONITORAR_P1' | 'HORA_EXTRA' | 'ANALISE_TENDENCIAS'
  titulo: string
  descricao: string
  practiceId: string
}

export const OPCOES_RETRO: OpcaoRetro[] = [
  {
    id: 'MONITORAR_P1', practiceId: 'MONITORING', titulo: 'Monitorar os serviços P1',
    descricao: 'Todos os serviços críticos passam a avisar uma hora antes dos incidentes.',
  },
  {
    id: 'HORA_EXTRA', practiceId: 'CSI', titulo: 'Hora extra',
    descricao: '+1 ação para cada jogador nesta hora e na próxima.',
  },
  {
    id: 'ANALISE_TENDENCIAS', practiceId: 'PROBLEM', titulo: 'Análise de tendências',
    descricao: 'Gestão de Problemas proativa: descobre a causa de todos os incidentes que já aconteceram hoje.',
  },
]
