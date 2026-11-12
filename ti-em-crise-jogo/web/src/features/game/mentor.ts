import type { Catalog } from '@shared/catalog'
import { acoesRestantes, incidenteGrave, indice } from '@/engine/selectors'
import type { EstadoJogo } from '@/engine/types'

/** Área da tela que o mentor destaca (atributo data-tour dos componentes). */
export type AlvoMentor = 'fila' | 'equipe' | 'mapa' | 'causas' | 'avisar' | 'encerrar'

export interface Dica {
  id: string
  texto: string
  alvo: AlvoMentor
}

/** O "próximo passo ITIL" sugerido pelo mentor durante o War Room. */
export function dicaDoMentor(cat: Catalog, s: EstadoJogo): Dica | null {
  if (s.fase !== 'WAR_ROOM') return null
  const idx = indice(cat)
  const fim: Dica = {
    id: 'encerrar',
    texto: acoesRestantes(s) === 0
      ? 'A equipe usou todas as ações desta hora. Cliquem em "Encerrar a hora" para ver o resultado.'
      : 'Tudo sob controle! Quando terminarem de conversar, cliquem em "Encerrar a hora".',
    alvo: 'encerrar',
  }
  if (acoesRestantes(s) === 0) return fim

  if (incidenteGrave(cat, s) && !s.comunicadoNaRodada) {
    return {
      id: 'avisar',
      texto: 'Incidente grave! Usem o botão vermelho "Avisar os clientes". Sem aviso, a confiança cai 50% mais rápido nesta hora.',
      alvo: 'avisar',
    }
  }

  const abertos = s.incidentes.filter((i) => i.status === 'ABERTO').sort((a, b) => a.prioridade - b.prioridade)
  if (abertos.length) {
    const inc = abertos[0]
    const extra = abertos.length > 1 ? ' Comecem pelo de maior prioridade (o primeiro da coluna).' : ''
    return {
      id: `conter-${inc.id}`,
      texto: `${inc.codigo} está causando estrago em ${idx.service.get(inc.serviceId)!.nome}. Arrastem o card até alguém com ações sobrando e escolham "Conter o incidente".${extra}`,
      alvo: 'fila',
    }
  }

  const alerta = s.incidentes.find((i) => i.status === 'ALERTA')
  if (alerta) {
    return {
      id: `alerta-${alerta.id}`,
      texto: `O monitoramento deu um alerta (${alerta.codigo}). Ainda não houve estrago: contendo agora, o incidente nem acontece.`,
      alvo: 'fila',
    }
  }

  const corrigivel = Object.values(s.problemas).find(
    (p) => p.status === 'ERRO_CONHECIDO' && !s.mudancas.some((m) => m.problemId === p.problemId && m.status === 'AGUARDANDO_CAB'),
  )
  if (corrigivel) {
    return {
      id: `corrigir-${corrigivel.problemId}`,
      texto: `Vocês já sabem a causa de "${idx.problem.get(corrigivel.problemId)!.nome}". Em "Causas encontradas", cliquem em "Corrigir de vez": a mudança vai para o CAB.`,
      alvo: 'causas',
    }
  }

  const semCausa = s.incidentes.find((i) => i.status === 'CONTIDO' && !s.problemas[idx.type.get(i.typeId)!.problemId])
  if (semCausa) {
    return {
      id: `investigar-${semCausa.id}`,
      texto: `${semCausa.codigo} está só contido e pode voltar. Cliquem nele e escolham "Investigar a causa" (Gestão de Problemas).`,
      alvo: 'fila',
    }
  }

  const p1 = cat.services.find((sv) => sv.priorityId === 'P1' && !s.servicos[sv.id].monitorado)
  if (p1) {
    return {
      id: `monitorar-${p1.id}`,
      texto: `Sobrou ação? Prevenção! Cliquem em "${p1.nome}" no mapa e escolham "Monitorar o serviço": os próximos problemas chegam como alerta.`,
      alvo: 'mapa',
    }
  }

  return fim
}
