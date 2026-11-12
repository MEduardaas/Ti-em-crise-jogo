import type { Catalog } from '@shared/catalog'
import { describe, expect, it } from 'vitest'
import catalogJson from './__fixtures__/catalog.json'
import { jogarPartida, type Estrategia } from './bots'
import { abrirWarRoom, criarPartida, encerrarRodada, executarAcao, irParaTriagem, proximaRodada, triar } from './engine'
import { calcularSaudeGeral, custoAcao, triagemEsperada } from './selectors'
import type { ConfigPartida, EstadoJogo, Incidente } from './types'

const cat = catalogJson as Catalog

const equipe = (n: number): ConfigPartida['jogadores'] =>
  ['SERVICE_DESK', 'INFRA', 'DBA', 'SECOPS', 'DEV', 'INCIDENT_MGR'].slice(0, n).map((roleId, i) => ({ nome: `J${i + 1}`, roleId }))

const nova = (scenarioId = 'DIA_SERVICEUP', seed = 42, n = 4, papeis?: string[]) =>
  criarPartida(cat, {
    scenarioId, nomeEquipe: 'Teste', seed,
    jogadores: papeis ? papeis.map((roleId, i) => ({ nome: `J${i + 1}`, roleId })) : equipe(n),
  })

/** Avança do briefing até o War Room com triagem correta. */
function ateWarRoom(s: EstadoJogo): EstadoJogo {
  let d = irParaTriagem(s)
  for (const inc of d.incidentes.filter((i) => i.status === 'NOVO')) {
    const e = triagemEsperada(cat, inc)
    d = triar(cat, d, inc.id, e.impacto, e.urgencia).estado
  }
  return d.fase === 'TRIAGEM' ? abrirWarRoom(d) : d
}

const jogador = (s: EstadoJogo, roleId: string) => s.jogadores.find((j) => j.roleId === roleId)!

function comIncidente(s: EstadoJogo, typeId: string, serviceId: string, prioridade: number): EstadoJogo {
  const d = structuredClone(s)
  const inc: Incidente = {
    id: 99, codigo: 'INC0099', typeId, serviceId, status: 'ABERTO', prioridade, prazo: 1,
    rodadaAbertura: d.rodada, rodadaContencao: null, triagemCorreta: true, slaViolado: false, reincidencias: 0,
  }
  d.incidentes.push(inc)
  return d
}

describe('motor', () => {
  it('é determinístico para a mesma seed', () => {
    const a = jogarPartida(cat, nova('DIA_SERVICEUP', 7), 'itil')
    const b = jogarPartida(cat, nova('DIA_SERVICEUP', 7), 'itil')
    expect(a).toEqual(b)
  })

  it('começa com tudo a 100%, exceto o serviço do incidente roteirizado da 1ª hora', () => {
    const s = nova()
    expect(s.incidentes.map((i) => [i.typeId, i.serviceId])).toEqual([['LEN_INDICE', 'REL']])
    expect(s.servicos.REL.saude).toBe(94) // impacto inicial = dano base 6
    expect(calcularSaudeGeral(cat, Object.fromEntries(Object.entries(s.servicos).map(([k, v]) => [k, v.saude])))).toBe(99.5)
    expect(s.jogadores.every((j) => j.acoes === 2)).toBe(true)
  })

  it('equipes de até 3 pessoas ganham +1 ação', () => {
    expect(nova('DIA_SERVICEUP', 1, 3).jogadores.every((j) => j.acoes === 3)).toBe(true)
  })

  it('triagem errada não tira confiança, mas mostra a lição', () => {
    const s = irParaTriagem(nova())
    const r = triar(cat, s, s.incidentes[0].id, 'ALTO', 'ALTA') // REL é P3 (BAIXO) e a urgência é BAIXA
    expect(r.correta).toBe(false)
    expect(r.esperado.celula.nome).toBe('Baixa')
    const fim = encerrarRodada(cat, abrirWarRoom(r.estado))
    expect(fim.confianca).toBe(100)
    expect(fim.relatorio!.licoes.map((l) => l.id)).toContain('triagem')
  })

  it('conter para o estrago; o especialista ainda devolve +10 de saúde', () => {
    const w = ateWarRoom(nova())
    const inc = w.incidentes[0]
    expect(encerrarRodada(cat, w).servicos.REL.saude).toBe(88) // sem ação: −6

    const comum = executarAcao(cat, w, jogador(w, 'INFRA').id, { tipo: 'CONTER', incidentId: inc.id })
    expect(comum.incidentes[0].status).toBe('CONTIDO')
    expect(comum.servicos.REL.saude).toBe(94)
    expect(encerrarRodada(cat, comum).servicos.REL.saude).toBe(97) // +3 de recuperação

    const dba = executarAcao(cat, w, jogador(w, 'DBA').id, { tipo: 'CONTER', incidentId: inc.id })
    expect(dba.servicos.REL.saude).toBe(100) // lentidão é a especialidade do DBA
    expect(jogador(dba, 'DBA').acoes).toBe(1)
  })

  it('investigar → corrigir → o CAB aplica na hora seguinte e o incidente é resolvido', () => {
    let s = ateWarRoom(nova('DIA_SERVICEUP', 42, 5))
    const inc = s.incidentes[0]
    s = executarAcao(cat, s, jogador(s, 'DEV').id, { tipo: 'INVESTIGAR', incidentId: inc.id })
    expect(s.problemas.PRB_INDICE.status).toBe('ERRO_CONHECIDO')
    expect(jogador(s, 'DEV').acoes).toBe(2) // investigar não gasta ação do Dev
    s = executarAcao(cat, s, jogador(s, 'SERVICE_DESK').id, { tipo: 'CORRIGIR', problemId: 'PRB_INDICE' })
    expect(s.mudancas[0].status).toBe('AGUARDANDO_CAB')
    s = proximaRodada(cat, encerrarRodada(cat, s))
    expect(s.mudancas[0].status).toBe('APLICADA')
    expect(s.problemas.PRB_INDICE.status).toBe('RESOLVIDO')
    expect(s.incidentes[0].status).toBe('RESOLVIDO')
  })

  it('o Gerente de Mudanças preside o CAB: a correção dele vale na mesma hora', () => {
    let s = ateWarRoom(nova('DIA_SERVICEUP', 42, 6))
    const inc = s.incidentes[0]
    s = executarAcao(cat, s, jogador(s, 'DEV').id, { tipo: 'INVESTIGAR', incidentId: inc.id })
    s = executarAcao(cat, s, jogador(s, 'INCIDENT_MGR').id, { tipo: 'CORRIGIR', problemId: 'PRB_INDICE' })
    expect(s.problemas.PRB_INDICE.status).toBe('RESOLVIDO')
  })

  it('corrigir exige conhecer a causa; avisar os clientes só vale em incidente grave', () => {
    const s = ateWarRoom(nova())
    const j = jogador(s, 'INFRA')
    expect(custoAcao(cat, s, j, { tipo: 'CORRIGIR', problemId: 'PRB_INDICE' }).ok).toBe(false)
    expect(custoAcao(cat, s, j, { tipo: 'COMUNICAR' }).ok).toBe(false)
    const grave = comIncidente(s, 'FAL_POOL', 'DB', 1)
    expect(custoAcao(cat, grave, j, { tipo: 'COMUNICAR' })).toEqual({ ok: true, custo: 1 })
    expect(custoAcao(cat, grave, jogador(s, 'SERVICE_DESK'), { tipo: 'COMUNICAR' })).toEqual({ ok: true, custo: 0 })
    const fim = encerrarRodada(cat, grave)
    expect(fim.relatorio!.incidenteGrave).toBe(true)
  })

  it('falha no login se propaga em cascata para quem depende dele', () => {
    const r = encerrarRodada(cat, comIncidente(ateWarRoom(nova()), 'SOB_LDAP', 'AUTH', 2))
    const destinos = r.relatorio!.cascatas.filter((c) => c.de === 'AUTH').map((c) => c.para).sort()
    expect(destinos).toEqual(['CHK', 'MAIL', 'PORT'])
  })

  it('serviço monitorado recebe alerta (sem estrago) em vez de incidente', () => {
    let s = ateWarRoom(nova('PRIMEIRO_PLANTAO'))
    s = executarAcao(cat, s, jogador(s, 'INFRA').id, { tipo: 'MONITORAR', serviceId: 'PORT' })
    s = proximaRodada(cat, encerrarRodada(cat, s)) // hora 2: deploy com erro no Site
    const deploy = s.incidentes.find((i) => i.typeId === 'FAL_DEPLOY')!
    expect(deploy.status).toBe('ALERTA')
    expect(s.servicos.PORT.saude).toBe(100)
  })
})

describe('balanceamento (simulação)', () => {
  const N = 100
  function simular(scenarioId: string, estrategia: Estrategia, jogadores = 4) {
    let vitorias = 0
    let conf = 0
    for (let seed = 1; seed <= N; seed++) {
      const fim = jogarPartida(cat, nova(scenarioId, seed, jogadores), estrategia)
      if (fim.resultado === 'VITORIA') vitorias++
      conf += fim.confianca
    }
    return { vitorias: vitorias / N, confianca: Math.round(conf / N) }
  }

  it('quem segue o ciclo ITIL vence; só apagar incêndio não basta', () => {
    const r: Record<string, ReturnType<typeof simular>> = {}
    for (const n of [2, 4, 6])
      for (const sc of ['PRIMEIRO_PLANTAO', 'DIA_SERVICEUP', 'BLACK_FRIDAY'])
        for (const est of ['passiva', 'bombeiro', 'aluno', 'itil'] as const) r[`${n}j ${sc} ${est}`] = simular(sc, est, n)

    for (const n of [2, 4, 6]) {
      const v = (sc: string, est: Estrategia) => r[`${n}j ${sc} ${est}`]
      // Tutorial: qualquer equipe que aja vence
      expect(v('PRIMEIRO_PLANTAO', 'bombeiro').vitorias).toBeGreaterThanOrEqual(0.95)
      expect(v('PRIMEIRO_PLANTAO', 'aluno').vitorias).toBeGreaterThanOrEqual(0.98)
      // Normal: ficar parado perde; o ciclo ITIL (mesmo sem otimizar) vence com folga
      expect(v('DIA_SERVICEUP', 'passiva').vitorias).toBeLessThan(0.05)
      expect(v('DIA_SERVICEUP', 'aluno').vitorias).toBeGreaterThanOrEqual(0.95)
      expect(v('DIA_SERVICEUP', 'aluno').confianca - v('DIA_SERVICEUP', 'bombeiro').confianca).toBeGreaterThan(40)
      // Black Friday: só apagar incêndio quase sempre perde
      expect(v('BLACK_FRIDAY', 'bombeiro').vitorias).toBeLessThan(0.2)
      expect(v('BLACK_FRIDAY', 'aluno').vitorias).toBeGreaterThanOrEqual(0.75)
      expect(v('BLACK_FRIDAY', 'itil').vitorias).toBeGreaterThanOrEqual(0.95)
    }
  }, 300_000)
})
