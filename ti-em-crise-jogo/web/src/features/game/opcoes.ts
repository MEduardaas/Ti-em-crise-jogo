import type { Catalog } from '@shared/catalog'
import { indice } from '@/engine/selectors'
import type { Acao, EstadoJogo, Incidente } from '@/engine/types'

export interface OpcaoAcao {
  acao: Acao
  /** id em game_action (ícone, nome, descrição e prática ITIL vêm do catálogo) */
  actionId: string
  titulo?: string
  detalhe?: string
}

/** Motivos de bloqueio que significam "esta etapa já foi feita". */
export const MOTIVOS_FEITO = new Set([
  'Já contido', 'Causa já encontrada', 'Já corrigido', 'Já monitorado', 'Já avisaram nesta hora', 'Aguardando o CAB',
])

/** As 3 etapas do ciclo ITIL para um incidente: conter → investigar → corrigir. */
export function opcoesIncidente(cat: Catalog, s: EstadoJogo, inc: Incidente): OpcaoAcao[] {
  const idx = indice(cat)
  const t = idx.type.get(inc.typeId)!
  const reg = s.problemas[t.problemId]
  const p = idx.problem.get(t.problemId)!
  return [
    {
      acao: { tipo: 'CONTER', incidentId: inc.id },
      actionId: 'CONTER',
      titulo: inc.status === 'ALERTA' ? 'Agir no alerta' : undefined,
      detalhe: inc.status === 'ALERTA' ? 'Ainda não houve estrago: agir agora evita o incidente.' : undefined,
    },
    {
      acao: { tipo: 'INVESTIGAR', incidentId: inc.id },
      actionId: 'INVESTIGAR',
      detalhe: reg ? `Causa: ${p.causaRaiz}` : undefined,
    },
    {
      acao: { tipo: 'CORRIGIR', problemId: t.problemId },
      actionId: 'CORRIGIR',
      detalhe: reg ? `Correção: ${idx.fix.get(p.fixChangeId)!.nome}. ${idx.fix.get(p.fixChangeId)!.descricao}` : undefined,
    },
  ]
}
