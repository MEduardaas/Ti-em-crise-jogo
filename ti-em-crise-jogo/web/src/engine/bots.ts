// Jogadores automáticos usados na simulação de balanceamento (e úteis para depurar).
import type { Catalog } from '@shared/catalog'
import { abrirWarRoom, encerrarRodada, escolherRetro, executarAcao, irParaTriagem, proximaRodada, triar } from './engine'
import { custoAcao, incidenteGrave, indice, triagemEsperada } from './selectors'
import type { Acao, EstadoJogo } from './types'

/**
 * passiva: só faz a triagem · bombeiro: só contém e avisa · itil: usa todas as práticas, escolhendo especialistas
 * aluno: faz o ciclo ITIL, mas sem otimizar quem executa (como uma turma iniciante)
 */
export type Estrategia = 'passiva' | 'bombeiro' | 'itil' | 'aluno'

/** Executa a ação com o jogador mais barato que puder (especialista primeiro ao conter, se otimizar). */
function tentarCom(cat: Catalog, s: EstadoJogo, acao: Acao, otimizar = true): EstadoJogo | null {
  const idx = indice(cat)
  const cat0 = acao.tipo === 'CONTER' ? idx.type.get(s.incidentes.find((i) => i.id === acao.incidentId)!.typeId)!.categoryId : null
  let melhor: { id: number; nota: number } | null = null
  for (const j of s.jogadores) {
    const c = custoAcao(cat, s, j, acao)
    if (!c.ok) continue
    if (!otimizar) return executarAcao(cat, s, j.id, acao)
    const especialista = cat0 && idx.role.get(j.roleId)!.skills.some((k) => k.categoryId === cat0) ? -0.5 : 0
    const nota = c.custo + especialista
    if (!melhor || nota < melhor.nota) melhor = { id: j.id, nota }
  }
  return melhor ? executarAcao(cat, s, melhor.id, acao) : null
}

function agir(cat: Catalog, s0: EstadoJogo, itil: boolean, otimizar = true): EstadoJogo {
  const idx = indice(cat)
  let s = s0
  const tentar = (c: Catalog, e: EstadoJogo, a: Acao) => tentarCom(c, e, a, otimizar)
  for (let guarda = 0; guarda < 60; guarda++) {
    let prox: EstadoJogo | null = null
    if (incidenteGrave(cat, s) && !s.comunicadoNaRodada) prox = tentar(cat, s, { tipo: 'COMUNICAR' })
    // Conter primeiro os mais prioritários, depois agir nos alertas
    const fila = s.incidentes
      .filter((i) => i.status === 'ABERTO' || i.status === 'ALERTA')
      .sort((a, b) => (a.status === 'ALERTA' ? 1 : 0) - (b.status === 'ALERTA' ? 1 : 0) || a.prioridade - b.prioridade)
    for (const inc of fila) {
      if (prox) break
      prox = tentar(cat, s, { tipo: 'CONTER', incidentId: inc.id })
    }
    if (!itil) {
      if (!prox) break
      s = prox
      continue
    }
    // Gestão de problemas para o que já foi contido
    for (const inc of s.incidentes.filter((i) => i.status === 'CONTIDO')) {
      if (prox) break
      const pid = idx.type.get(inc.typeId)!.problemId
      const reg = s.problemas[pid]
      if (!reg) prox = tentar(cat, s, { tipo: 'INVESTIGAR', incidentId: inc.id })
      else if (reg.status === 'ERRO_CONHECIDO') prox = tentar(cat, s, { tipo: 'CORRIGIR', problemId: pid })
    }
    for (const sv of cat.services.filter((x) => x.priorityId === 'P1')) {
      if (prox) break
      prox = tentar(cat, s, { tipo: 'MONITORAR', serviceId: sv.id })
    }
    if (!prox) break
    s = prox
  }
  return s
}

export function jogarPartida(cat: Catalog, inicial: EstadoJogo, estrategia: Estrategia): EstadoJogo {
  let s = inicial
  for (let passo = 0; passo < 500 && s.fase !== 'FIM'; passo++) {
    switch (s.fase) {
      case 'RETROSPECTIVA':
        s = escolherRetro(cat, s, estrategia === 'itil' || estrategia === 'aluno' ? 'ANALISE_TENDENCIAS' : 'HORA_EXTRA')
        break
      case 'BRIEFING':
        s = irParaTriagem(s)
        break
      case 'TRIAGEM': {
        const inc = s.incidentes.find((i) => i.status === 'NOVO')
        if (!inc) {
          s = abrirWarRoom(s)
          break
        }
        const e = triagemEsperada(cat, inc)
        s = triar(cat, s, inc.id, e.impacto, e.urgencia).estado
        break
      }
      case 'WAR_ROOM':
        s = encerrarRodada(cat, estrategia === 'passiva' ? s : agir(cat, s, estrategia !== 'bombeiro', estrategia !== 'aluno'))
        break
      case 'IMPACTO':
        s = proximaRodada(cat, s)
        break
    }
  }
  return s
}
