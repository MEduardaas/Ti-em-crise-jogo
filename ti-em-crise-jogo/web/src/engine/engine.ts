// Motor do jogo: funções puras (estado antigo -> estado novo). Nenhuma dependência de React.
import type { Catalog, Impacto, Urgencia } from '@shared/catalog'
import { LICOES, OPCOES_RETRO, REGRAS, type OpcaoRetro } from './rules'
import {
  bonusEspecialista, calcularSaudeGeral, custoAcao, estaAtivo, hora, incidenteGrave, indice, mitigacao,
  prioridadeServico, saudeAtual, triagemEsperada,
} from './selectors'
import type { Acao, ConfigPartida, EstadoJogo, Incidente, Mudanca, TipoLog } from './types'

// ---------------------------------------------------------------------------
// Utilidades internas (operam sobre um rascunho clonado)
// ---------------------------------------------------------------------------

/** Mulberry32: RNG determinístico; o estado fica dentro do jogo. */
function rand(d: EstadoJogo): number {
  d.rng = (d.rng + 0x6d2b79f5) | 0
  let t = d.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function escolher<T>(d: EstadoJogo, itens: T[], peso: (x: T) => number = () => 1): T | undefined {
  const total = itens.reduce((a, x) => a + peso(x), 0)
  if (total <= 0) return undefined
  let alvo = rand(d) * total
  for (const x of itens) {
    alvo -= peso(x)
    if (alvo < 0) return x
  }
  return itens[itens.length - 1]
}

function log(d: EstadoJogo, tipo: TipoLog, texto: string) {
  d.log.push({ id: ++d.seq.log, rodada: d.rodada, tipo, texto })
}

function licao(d: EstadoJogo, id: keyof typeof LICOES) {
  if (d.licoesVistas.includes(id)) return
  d.licoesVistas.push(id)
  d.licoesPendentes.push(LICOES[id])
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10))
const clone = (s: EstadoJogo): EstadoJogo => structuredClone(s)

/** O incidente que chega sem aviso já causa estrago antes de a equipe reagir. */
function aplicarImpactoInicial(cat: Catalog, d: EstadoJogo, inc: Incidente): number {
  const golpe = indice(cat).type.get(inc.typeId)!.danoBase
  const sv = d.servicos[inc.serviceId]
  sv.saude = clamp(sv.saude - golpe)
  return golpe
}

function criarIncidente(cat: Catalog, d: EstadoJogo, typeId: string, serviceId: string): Incidente {
  const idx = indice(cat)
  const t = idx.type.get(typeId)!
  const celula = idx.matriz(prioridadeServico(cat, serviceId).impacto, t.urgencia)
  const inc: Incidente = {
    id: ++d.seq.incidente,
    codigo: `INC${String(d.seq.incidente).padStart(4, '0')}`,
    typeId,
    serviceId,
    status: d.servicos[serviceId].monitorado ? 'ALERTA' : 'NOVO',
    prioridade: celula.prioridade,
    prazo: celula.prazoHoras,
    rodadaAbertura: d.rodada,
    rodadaContencao: null,
    triagemCorreta: null,
    slaViolado: false,
    reincidencias: 0,
  }
  d.incidentes.push(inc)
  const sv = idx.service.get(serviceId)!.nome
  if (inc.status === 'ALERTA') {
    log(d, 'alerta', `⚠ ${inc.codigo} Alerta do monitoramento em ${sv}: ${t.nome}`)
    licao(d, 'monitoramento')
  } else {
    const golpe = aplicarImpactoInicial(cat, d, inc)
    log(d, 'incidente', `${inc.codigo} ${t.nome} em ${sv} (−${golpe} de saúde)`)
  }
  return inc
}

/** Tenta abrir um incidente de um tipo específico (eventos do cenário). Correções aplicadas o evitam. */
function tentarIncidente(cat: Catalog, d: EstadoJogo, typeId: string, serviceId: string) {
  const idx = indice(cat)
  if (d.incidentes.some((i) => estaAtivo(i) && i.typeId === typeId && i.serviceId === serviceId)) return
  const m = mitigacao(cat, d, typeId)
  if (m > 0 && rand(d) < m) {
    d.stats.prevenidos++
    log(d, 'sucesso', `🛡 Evitado pela correção aplicada: ${idx.type.get(typeId)!.nome} em ${idx.service.get(serviceId)!.nome}`)
    licao(d, 'prevencao')
    return
  }
  criarIncidente(cat, d, typeId, serviceId)
}

/** Sorteia um incidente ponderado pelo peso do tipo × chance que sobra após as correções. */
function sortearIncidente(cat: Catalog, d: EstadoJogo) {
  const candidatos = cat.incidentTypes.flatMap((t) => {
    const livres = t.serviceIds.filter(
      (sid) => !d.incidentes.some((i) => estaAtivo(i) && i.typeId === t.id && i.serviceId === sid),
    )
    const peso = t.pesoSorteio * (1 - mitigacao(cat, d, t.id))
    return livres.length && peso > 0 ? [{ t, livres, peso }] : []
  })
  const c = escolher(d, candidatos, (x) => x.peso)
  if (!c) return
  criarIncidente(cat, d, c.t.id, escolher(d, c.livres)!)
}

function registrarCausa(cat: Catalog, d: EstadoJogo, problemId: string) {
  d.problemas[problemId] = { problemId, status: 'ERRO_CONHECIDO', rodadaDescoberta: d.rodada, rodadaResolucao: null }
  d.stats.causasEncontradas++
  licao(d, 'erro_conhecido')
  return indice(cat).problem.get(problemId)!
}

function resolverProblema(cat: Catalog, d: EstadoJogo, problemId: string) {
  const idx = indice(cat)
  const reg = d.problemas[problemId] ?? { problemId, status: 'ERRO_CONHECIDO', rodadaDescoberta: d.rodada, rodadaResolucao: null }
  reg.status = 'RESOLVIDO'
  reg.rodadaResolucao = d.rodada
  d.problemas[problemId] = reg
  const tipos = new Set((idx.tiposPorProblema.get(problemId) ?? []).map((t) => t.id))
  let n = 0
  const servicos = new Set<string>()
  for (const inc of d.incidentes) {
    if (!tipos.has(inc.typeId) || !estaAtivo(inc)) continue
    if (inc.status === 'ABERTO' && !inc.slaViolado) d.stats.slaCumpridos++
    if (inc.status === 'ABERTO' || inc.status === 'NOVO') inc.rodadaContencao = d.rodada
    if (inc.status !== 'ALERTA') servicos.add(inc.serviceId)
    inc.status = inc.status === 'ALERTA' ? 'PREVENIDO' : 'RESOLVIDO'
    n++
  }
  // Corrigir de vez devolve saúde aos serviços afetados
  for (const sid of servicos) d.servicos[sid].saude = clamp(d.servicos[sid].saude + REGRAS.bonusCorrecao)
  const ganho = servicos.size ? ` (+${REGRAS.bonusCorrecao} de saúde em ${[...servicos].map((s) => idx.service.get(s)!.nome).join(', ')})` : ''
  log(d, 'sucesso', `✔ Problema "${idx.problem.get(problemId)!.nome}" eliminado${n ? `: ${n} incidente(s) resolvido(s)` : ''}${ganho}`)
  licao(d, 'causa_raiz')
}

function aplicarMudanca(cat: Catalog, d: EstadoJogo, ch: Mudanca) {
  ch.status = 'APLICADA'
  d.stats.correcoes++
  d.correcoesAplicadas.push(ch.fixId)
  log(d, 'sucesso', `✔ ${ch.codigo} aprovada pelo CAB e aplicada: ${indice(cat).fix.get(ch.fixId)!.nome}`)
  for (const p of cat.problems.filter((p) => p.fixChangeId === ch.fixId)) {
    if (d.problemas[p.id]?.status !== 'RESOLVIDO') resolverProblema(cat, d, p.id)
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export function criarPartida(cat: Catalog, cfg: ConfigPartida): EstadoJogo {
  const idx = indice(cat)
  const sc = idx.scenario.get(cfg.scenarioId)
  if (!sc) throw new Error(`Cenário inexistente: ${cfg.scenarioId}`)
  const s: EstadoJogo = {
    scenarioId: sc.id,
    nomeEquipe: cfg.nomeEquipe,
    seed: cfg.seed,
    rng: cfg.seed,
    rodada: 1,
    totalRodadas: sc.totalRodadas,
    horaInicio: sc.horaInicio,
    fase: 'BRIEFING',
    confianca: sc.confiancaInicial,
    servicos: Object.fromEntries(cat.services.map((sv) => [sv.id, { saude: sv.saudeInicial, monitorado: false }])),
    jogadores: cfg.jogadores.map((j, i) => {
      const n = idx.role.get(j.roleId)!.acoesPorRodada + REGRAS.bonusAcoesEquipeEnxuta(cfg.jogadores.length)
      return { id: i + 1, nome: j.nome, roleId: j.roleId, acoes: n, acoesMax: n }
    }),
    incidentes: [],
    problemas: {},
    mudancas: [],
    correcoesAplicadas: [],
    comunicadoNaRodada: false,
    bonusAcoesRodadas: 0,
    pico: null,
    log: [],
    licoesVistas: [],
    licoesPendentes: [],
    relatorio: null,
    snapshots: [],
    stats: {
      slaCumpridos: 0, slaViolacoes: 0, triagensCorretas: 0, triagensErradas: 0,
      causasEncontradas: 0, correcoes: 0, prevenidos: 0, reincidencias: 0,
    },
    resultado: null,
    seq: { log: 0, incidente: 0, mudanca: 0 },
  }
  return iniciarRodada(cat, s)
}

/** Início de cada hora: CAB, alertas viram incidentes, reincidências, eventos e sorteios. */
export function iniciarRodada(cat: Catalog, s: EstadoJogo): EstadoJogo {
  const d = clone(s)
  const idx = indice(cat)
  const sc = idx.scenario.get(d.scenarioId)!
  d.relatorio = null
  d.comunicadoNaRodada = false
  d.pico = null
  const bonus = d.bonusAcoesRodadas > 0 ? 1 : 0
  if (bonus) d.bonusAcoesRodadas--
  for (const j of d.jogadores) j.acoes = j.acoesMax + bonus

  log(d, 'rodada', `🕘 ${hora(d, d.rodada)} — Hora ${d.rodada} de ${d.totalRodadas}`)

  // CAB: mudanças pedidas na hora anterior entram em produção
  for (const ch of d.mudancas) {
    if (ch.status === 'AGUARDANDO_CAB' && ch.rodadaAplicacao <= d.rodada) aplicarMudanca(cat, d, ch)
  }

  // Alertas da hora anterior viram incidentes
  for (const inc of d.incidentes) {
    if (inc.status === 'ALERTA' && inc.rodadaAbertura < d.rodada) {
      inc.status = 'NOVO'
      inc.rodadaAbertura = d.rodada
      const golpe = aplicarImpactoInicial(cat, d, inc)
      log(d, 'incidente', `${inc.codigo} O alerta virou incidente: ${idx.type.get(inc.typeId)!.nome} (−${golpe} de saúde)`)
    }
  }

  // Incidentes só contidos podem voltar enquanto a causa existir
  for (const inc of d.incidentes) {
    if (inc.status !== 'CONTIDO') continue
    if (d.problemas[idx.type.get(inc.typeId)!.problemId]?.status === 'RESOLVIDO') continue
    if (rand(d) < REGRAS.chanceReincidencia) {
      inc.status = 'ABERTO'
      inc.reincidencias++
      inc.rodadaAbertura = d.rodada
      inc.rodadaContencao = null
      inc.slaViolado = false
      d.stats.reincidencias++
      const golpe = aplicarImpactoInicial(cat, d, inc)
      log(d, 'falha', `↻ ${inc.codigo} voltou a acontecer (−${golpe} de saúde)! A causa raiz ainda não foi eliminada.`)
      licao(d, 'reincidencia')
    }
  }

  // Eventos roteirizados do cenário
  let retro = false
  for (const ev of sc.eventos.filter((e) => e.rodada === d.rodada)) {
    if (ev.tipo === 'RETROSPECTIVA') {
      retro = true
      continue
    }
    log(d, 'evento', `📣 ${ev.mensagem}`)
    if (ev.tipo === 'PICO_TRAFEGO') d.pico = { serviceId: ev.serviceId, multiplicador: ev.multiplicador }
    else if (ev.incidentTypeId && ev.serviceId) tentarIncidente(cat, d, ev.incidentTypeId, ev.serviceId)
  }

  // Sorteio (a 1ª hora só tem os eventos roteirizados)
  if (d.rodada > 1) {
    const chance =
      (sc.chanceSpawnBase + REGRAS.rampaSpawnPorRodada * (d.rodada - 1)) * REGRAS.fatorEquipe(d.jogadores.length)
    const n = Math.floor(chance) + (rand(d) < chance % 1 ? 1 : 0)
    for (let k = 0; k < n; k++) sortearIncidente(cat, d)
  }

  d.fase = retro ? 'RETROSPECTIVA' : 'BRIEFING'
  return d
}

export function escolherRetro(cat: Catalog, s: EstadoJogo, opcao: OpcaoRetro['id']): EstadoJogo {
  const d = clone(s)
  const idx = indice(cat)
  const o = OPCOES_RETRO.find((x) => x.id === opcao)!
  if (opcao === 'MONITORAR_P1') {
    for (const sv of cat.services) if (sv.priorityId === 'P1') d.servicos[sv.id].monitorado = true
  } else if (opcao === 'HORA_EXTRA') {
    for (const j of d.jogadores) j.acoes += 1
    d.bonusAcoesRodadas = 1
  } else {
    for (const i of d.incidentes) {
      const pid = idx.type.get(i.typeId)!.problemId
      if (!d.problemas[pid]) registrarCausa(cat, d, pid)
    }
  }
  log(d, 'sucesso', `🍽 Retrospectiva: a equipe escolheu "${o.titulo}"`)
  d.fase = 'BRIEFING'
  return d
}

/** Do briefing para a triagem (ou direto ao War Room se não houver chamados novos). */
export function irParaTriagem(s: EstadoJogo): EstadoJogo {
  const d = clone(s)
  d.licoesPendentes = [] // já exibidas no briefing
  d.fase = d.incidentes.some((i) => i.status === 'NOVO') ? 'TRIAGEM' : 'WAR_ROOM'
  return d
}

/** Da triagem (concluída) para o War Room. */
export function abrirWarRoom(s: EstadoJogo): EstadoJogo {
  if (s.incidentes.some((i) => i.status === 'NOVO')) throw new Error('Ainda há chamados aguardando triagem')
  return { ...s, fase: 'WAR_ROOM' }
}

/** Triagem: errar não tira confiança, mas o jogo explica a resposta certa. */
export function triar(cat: Catalog, s: EstadoJogo, incidentId: number, impacto: Impacto, urgencia: Urgencia) {
  const d = clone(s)
  const inc = d.incidentes.find((i) => i.id === incidentId)
  if (!inc || inc.status !== 'NOVO') throw new Error('Incidente não está aguardando triagem')
  const esp = triagemEsperada(cat, inc)
  const correta = esp.impacto === impacto && esp.urgencia === urgencia
  inc.status = 'ABERTO'
  inc.triagemCorreta = correta
  if (correta) d.stats.triagensCorretas++
  else {
    d.stats.triagensErradas++
    licao(d, 'triagem')
  }
  return { estado: d, correta, esperado: esp }
}

export function executarAcao(cat: Catalog, s: EstadoJogo, jogadorId: number, acao: Acao): EstadoJogo {
  const idx = indice(cat)
  const j0 = s.jogadores.find((j) => j.id === jogadorId)
  if (!j0) throw new Error('Jogador não encontrado')
  const custo = custoAcao(cat, s, j0, acao)
  if (!custo.ok) throw new Error(custo.motivo)

  const d = clone(s)
  const j = d.jogadores.find((x) => x.id === jogadorId)!
  j.acoes -= custo.custo

  switch (acao.tipo) {
    case 'CONTER': {
      const inc = d.incidentes.find((i) => i.id === acao.incidentId)!
      const t = idx.type.get(inc.typeId)!
      if (inc.status === 'ALERTA') {
        inc.status = 'PREVENIDO'
        d.stats.prevenidos++
        log(d, 'sucesso', `🛡 ${j.nome} agiu no alerta ${inc.codigo} e evitou o incidente (${t.nome})`)
        licao(d, 'prevencao')
      } else {
        inc.status = 'CONTIDO'
        inc.rodadaContencao = d.rodada
        if (!inc.slaViolado) d.stats.slaCumpridos++
        const bonus = bonusEspecialista(cat, j, t.id)
        const sv = d.servicos[inc.serviceId]
        if (bonus) sv.saude = clamp(sv.saude + bonus)
        log(d, 'acao', `🧯 ${j.nome} conteve ${inc.codigo} (${t.nome})${bonus ? ` — especialista: +${bonus} de saúde` : ''}`)
        licao(d, 'contorno')
      }
      break
    }
    case 'INVESTIGAR': {
      const inc = d.incidentes.find((i) => i.id === acao.incidentId)!
      const p = registrarCausa(cat, d, idx.type.get(inc.typeId)!.problemId)
      log(d, 'sucesso', `🔍 ${j.nome} achou a causa de ${inc.codigo}: ${p.causaRaiz} Correção: ${idx.fix.get(p.fixChangeId)!.nome}`)
      break
    }
    case 'CORRIGIR': {
      const p = idx.problem.get(acao.problemId)!
      const presideCab = j.roleId === 'INCIDENT_MGR'
      const ch: Mudanca = {
        id: ++d.seq.mudanca,
        codigo: `CHG${String(d.seq.mudanca).padStart(4, '0')}`,
        fixId: p.fixChangeId,
        problemId: p.id,
        rodadaSolicitada: d.rodada,
        rodadaAplicacao: presideCab ? d.rodada : d.rodada + 1,
        status: 'AGUARDANDO_CAB',
      }
      d.mudancas.push(ch)
      licao(d, 'mudanca')
      const nome = idx.fix.get(p.fixChangeId)!.nome
      if (presideCab) {
        log(d, 'acao', `🔧 ${j.nome} levou ${ch.codigo} (${nome}) ao CAB, que aprovou na hora`)
        aplicarMudanca(cat, d, ch)
      } else {
        log(d, 'acao', `🔧 ${j.nome} enviou ${ch.codigo} (${nome}) ao CAB: vale a partir de ${hora(d, d.rodada + 1)}`)
      }
      break
    }
    case 'COMUNICAR':
      d.comunicadoNaRodada = true
      log(d, 'acao', `📢 ${j.nome} avisou os clientes e a diretoria sobre o incidente grave`)
      break
    case 'MONITORAR':
      d.servicos[acao.serviceId].monitorado = true
      log(d, 'acao', `📡 ${j.nome} ligou o monitoramento de ${idx.service.get(acao.serviceId)!.nome}`)
      break
  }
  return d
}

/** Fim do War Room: estrago, cascata, recuperação, prazos (SLA) e perda de confiança. */
export function encerrarRodada(cat: Catalog, s: EstadoJogo): EstadoJogo {
  const idx = indice(cat)
  const d = clone(s)
  const saudeAntes = calcularSaudeGeral(cat, saudeAtual(d))
  const confiancaAntes = d.confianca

  const grave = incidenteGrave(cat, d)
  if (grave) licao(d, 'incidente_grave')

  // 1. Estrago direto dos incidentes abertos (cresce a cada hora sem contenção)
  const perdaDireta: Record<string, number> = {}
  for (const inc of d.incidentes.filter((i) => i.status === 'ABERTO')) {
    const t = idx.type.get(inc.typeId)!
    const idade = d.rodada - inc.rodadaAbertura
    const pico = d.pico && (d.pico.serviceId === null || d.pico.serviceId === inc.serviceId) ? d.pico.multiplicador : 1
    const dano = Math.round(t.danoBase * (1 + REGRAS.escaladaPorRodada * idade) * pico)
    perdaDireta[inc.serviceId] = (perdaDireta[inc.serviceId] ?? 0) + dano
  }

  // 2. Cascata (1 nível por hora, pelas dependências do mapa)
  const perdaCascata: Record<string, number> = {}
  const cascatas: { de: string; para: string; perda: number }[] = []
  for (const [sid, perda] of Object.entries(perdaDireta)) {
    for (const dep of idx.dependentes.get(sid) ?? []) {
      const p = Math.round(perda * dep.fator)
      if (p <= 0) continue
      perdaCascata[dep.serviceId] = (perdaCascata[dep.serviceId] ?? 0) + p
      cascatas.push({ de: sid, para: dep.serviceId, perda: p })
    }
  }
  if (cascatas.length) licao(d, 'cascata')

  // 3. Aplica perdas e recuperação natural
  const recuperacao: Record<string, number> = {}
  for (const sv of cat.services) {
    const e = d.servicos[sv.id]
    const perda = (perdaDireta[sv.id] ?? 0) + (perdaCascata[sv.id] ?? 0)
    if (perda > 0) {
      e.saude = clamp(e.saude - perda)
    } else if (e.saude < 100) {
      const antes = e.saude
      e.saude = clamp(e.saude + REGRAS.recuperacaoNatural)
      recuperacao[sv.id] = Math.round((e.saude - antes) * 10) / 10
    }
  }

  // 4. Prazos (SLA) dos incidentes ainda abertos
  let perdaSla = 0
  for (const inc of d.incidentes.filter((i) => i.status === 'ABERTO' && !i.slaViolado)) {
    if (d.rodada - inc.rodadaAbertura + 1 >= inc.prazo) {
      inc.slaViolado = true
      d.stats.slaViolacoes++
      perdaSla += REGRAS.penalidadeSla
      log(d, 'falha', `⏰ ${inc.codigo} estourou o prazo (SLA de ${inc.prazo}h)`)
      licao(d, 'sla')
    }
  }

  // 5. Perda de confiança dos clientes
  let meta = 0
  for (const sv of cat.services) {
    const p = prioridadeServico(cat, sv.id)
    meta += (p.peso * Math.max(0, p.metaSaude - d.servicos[sv.id].saude)) / REGRAS.divisorPerda
  }
  // Números inteiros: mais fáceis de acompanhar na sala de aula
  const perdaMeta = Math.round(meta)
  const comunicacao = grave && !d.comunicadoNaRodada ? Math.round(meta * (REGRAS.multiplicadorSemAviso - 1)) : 0
  const perdaConfianca = { meta: perdaMeta, comunicacao, sla: perdaSla, total: perdaMeta + comunicacao + perdaSla }
  d.confianca = Math.max(0, d.confianca - perdaConfianca.total)

  const saudeDepois = calcularSaudeGeral(cat, saudeAtual(d))
  d.snapshots.push({ rodada: d.rodada, saudeGeral: saudeDepois, confianca: d.confianca, saude: saudeAtual(d) })

  if (d.confianca <= 0) {
    d.resultado = 'DERROTA'
    log(d, 'falha', '💥 A confiança dos clientes chegou a zero.')
  } else if (d.rodada >= d.totalRodadas) {
    d.resultado = 'VITORIA'
    log(d, 'sucesso', `🎉 ${hora(d, d.rodada + 1)}: fim do expediente! A ServiceUp sobreviveu.`)
  }

  d.relatorio = {
    rodada: d.rodada, perdaDireta, perdaCascata, recuperacao, cascatas, perdaConfianca,
    incidenteGrave: grave, comunicado: d.comunicadoNaRodada,
    saudeAntes, saudeDepois, confiancaAntes, confiancaDepois: d.confianca,
    licoes: d.licoesPendentes,
  }
  d.licoesPendentes = []
  d.fase = 'IMPACTO'
  return d
}

export function proximaRodada(cat: Catalog, s: EstadoJogo): EstadoJogo {
  if (s.resultado) return { ...s, fase: 'FIM' }
  return iniciarRodada(cat, { ...s, rodada: s.rodada + 1 })
}
