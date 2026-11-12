import type { Catalog, Impacto, Urgencia } from '@shared/catalog'
import { ArrowRight, CheckCircle2, GraduationCap, Heart, XCircle } from 'lucide-react'
import { useState } from 'react'
import { COR_PRIORIDADE, PriorityMatrix } from '@/components/PriorityMatrix'
import { Sigla, TextoComSiglas } from '@/components/Sigla'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { abrirWarRoom, escolherRetro, irParaTriagem, proximaRodada, triar } from '@/engine/engine'
import { NOME_IMPACTO, NOME_URGENCIA, OPCOES_RETRO } from '@/engine/rules'
import { hora, indice, prioridadeServico } from '@/engine/selectors'
import type { EstadoJogo, Licao, TipoLog } from '@/engine/types'
import { iconFor } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useGame } from '@/store/game'

const ICONE_LOG: Partial<Record<TipoLog, string>> = { alerta: '⚠', incidente: '🔥', sucesso: '✔', falha: '✖', evento: '📣' }

function CardLicao({ catalog, licao }: { catalog: Catalog; licao: Licao }) {
  return (
    <div className="flex gap-3 rounded-xl bg-primary/10 p-3 ring-1 ring-primary/30">
      <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{licao.titulo}</span>
          <Badge variant="secondary">{catalog.practices.find((p) => p.id === licao.practiceId)?.nome}</Badge>
        </div>
        <p className="text-sm text-muted-foreground"><TextoComSiglas>{licao.texto}</TextoComSiglas></p>
      </div>
    </div>
  )
}

const PASSOS_DA_HORA = [
  ['📣 Notícias', 'o que aconteceu no começo da hora (esta tela).'],
  ['🧭 Triagem', 'vocês classificam cada chamado novo para saber o que é mais urgente.'],
  ['🗣 War Room', 'conversem e usem as ações: conter, investigar a causa, corrigir de vez, monitorar.'],
  ['📊 Resultado', 'o jogo mostra o estrago, quem sofreu em cascata e a confiança dos clientes.'],
] as const

// ---------------------------------------------------------------------------
export function BriefingDialog({ catalog, estado }: { catalog: Catalog; estado: EstadoJogo }) {
  const aplicar = useGame((s) => s.aplicar)
  const doRound = estado.log.filter((l) => l.rodada === estado.rodada && l.tipo !== 'rodada')
  const novos = estado.incidentes.filter((i) => i.status === 'NOVO').length
  const licoes = estado.licoesPendentes

  return (
    <Dialog open={estado.fase === 'BRIEFING'}>
      <DialogContent showCloseButton={false} className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            🕘 {hora(estado, estado.rodada)} · Hora {estado.rodada} de {estado.totalRodadas}
          </DialogTitle>
          <DialogDescription>Notícias do começo desta hora:</DialogDescription>
        </DialogHeader>
        {estado.rodada === 1 && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-muted/40 p-3 text-sm">
            <p className="font-medium">Cada rodada do jogo é uma hora do expediente, com 4 etapas:</p>
            <ol className="flex flex-col gap-1">
              {PASSOS_DA_HORA.map(([t, d]) => <li key={t}><strong>{t}</strong>: {d}</li>)}
            </ol>
          </div>
        )}
        <ul className="flex flex-col gap-1.5 text-sm">
          {doRound.length === 0 && <li className="text-muted-foreground">Hora tranquila. Aproveitem para prevenir!</li>}
          {doRound.map((l) => (
            <li key={l.id} className="flex gap-2">
              <span aria-hidden>{ICONE_LOG[l.tipo] ?? '•'}</span>
              <span>{l.texto.replace(/^[^\p{L}\p{N}]+\s*/u, '')}</span>
            </li>
          ))}
        </ul>
        {licoes.length > 0 && <div className="flex flex-col gap-2">{licoes.map((l) => <CardLicao key={l.id} catalog={catalog} licao={l} />)}</div>}
        <DialogFooter>
          <Button size="lg" className="gap-2" onClick={() => aplicar((_, s) => irParaTriagem(s))}>
            {novos > 0 ? <>Fazer a triagem de {novos} chamado(s)</> : <>Ir para o War Room</>} <ArrowRight className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
function Opcoes<T extends string>({ valores, nomes, valor, onChange, rotulo }: {
  valores: T[]; nomes: Record<T, string>; valor: T | null; onChange: (v: T) => void; rotulo: string
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className={cn('grid gap-2', valores.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
      {valores.map((v) => (
        <Button
          key={v}
          role="radio"
          aria-checked={valor === v}
          variant={valor === v ? 'default' : 'outline'}
          className="h-auto whitespace-normal py-2"
          onClick={() => onChange(v)}
        >
          {nomes[v]}
        </Button>
      ))}
    </div>
  )
}

const ROTULO_IMPACTO: Record<Impacto, string> = { ALTO: 'Alto (P1)', MEDIO: 'Médio (P2)', BAIXO: 'Baixo (P3)' }
const ROTULO_URGENCIA: Record<Urgencia, string> = { ALTA: 'Sim: urgência alta', BAIXA: 'Não, dá para esperar: urgência baixa' }

export function TriageDialog({ catalog, estado }: { catalog: Catalog; estado: EstadoJogo }) {
  const aplicar = useGame((s) => s.aplicar)
  const [impacto, setImpacto] = useState<Impacto | null>(null)
  const [urgencia, setUrgencia] = useState<Urgencia | null>(null)
  const [feedback, setFeedback] = useState<{
    correta: boolean; esperado: { impacto: Impacto; urgencia: Urgencia }; escolhido: { impacto: Impacto; urgencia: Urgencia }; incId: number
  } | null>(null)

  const idx = indice(catalog)
  const pendentes = estado.incidentes.filter((i) => i.status === 'NOVO')
  const inc = feedback ? estado.incidentes.find((i) => i.id === feedback.incId)! : pendentes[0]
  if (estado.fase !== 'TRIAGEM' || !inc) return null

  const t = idx.type.get(inc.typeId)!
  const sv = idx.service.get(inc.serviceId)!
  const cat = catalog.categories.find((c) => c.id === t.categoryId)!
  const CatIcon = iconFor(cat.icone)
  const prio = prioridadeServico(catalog, sv.id)

  const confirmar = () => {
    if (!impacto || !urgencia) return
    let r: ReturnType<typeof triar> | null = null
    aplicar((c, s) => {
      r = triar(c, s, inc.id, impacto, urgencia)
      return r.estado
    })
    if (r) {
      const res = r as ReturnType<typeof triar>
      setFeedback({ correta: res.correta, esperado: res.esperado, escolhido: { impacto, urgencia }, incId: inc.id })
    }
  }
  const proximo = () => {
    setFeedback(null)
    setImpacto(null)
    setUrgencia(null)
    if (pendentes.length === 0) aplicar((_, s) => abrirWarRoom(s))
  }
  const celulaEsperada = feedback && catalog.priorityMatrix.find((c) => c.impacto === feedback.esperado.impacto && c.urgencia === feedback.esperado.urgencia)!

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">🧭 Triagem (Central de Serviço)</DialogTitle>
          <DialogDescription>
            {feedback
              ? pendentes.length > 0 ? `Confiram o resultado. Faltam ${pendentes.length} chamado(s).` : 'Confiram o resultado. Triagem concluída!'
              : 'Respondam juntos às 2 perguntas. A prioridade define o que atacar primeiro e o prazo para conter (SLA).'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 rounded-xl border-l-4 bg-muted/40 p-4" style={{ borderLeftColor: cat.corHex }}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CatIcon className="size-4" style={{ color: cat.corHex }} /> <span className="font-mono">{inc.codigo}</span> · {cat.nome}
          </div>
          <p className="text-lg font-semibold">{t.nome}</p>
          <p className="text-sm">
            Serviço afetado: <strong>{sv.nome}</strong> · <Sigla s={sv.priorityId} /> ({prio.nome.toLowerCase()})
          </p>
          <p className="text-sm text-muted-foreground">“{t.sintoma}”</p>
          {t.referencia && <p className="text-xs text-muted-foreground"><TextoComSiglas>{`Referência: ${t.referencia}`}</TextoComSiglas></p>}
        </div>

        {!feedback ? (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">1. Impacto: qual a importância do serviço afetado? <span className="font-normal text-muted-foreground">(dica: olhem a etiqueta P1, P2 ou P3)</span></span>
                <Opcoes rotulo="Impacto" valores={['ALTO', 'MEDIO', 'BAIXO']} nomes={ROTULO_IMPACTO} valor={impacto} onChange={setImpacto} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">2. Urgência: o problema está parando o serviço ou piorando rápido?</span>
                <Opcoes rotulo="Urgência" valores={['ALTA', 'BAIXA']} nomes={ROTULO_URGENCIA} valor={urgencia} onChange={setUrgencia} />
              </div>
            </div>
            <PriorityMatrix catalog={catalog} compacta destaque={impacto && urgencia ? { impacto, urgencia } : null} />
            <DialogFooter>
              <Button size="lg" disabled={!impacto || !urgencia} onClick={confirmar}>Confirmar a prioridade</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div
              role="status"
              className={cn('flex gap-3 rounded-xl p-4 ring-1', feedback.correta ? 'bg-ok/10 ring-ok/40' : 'bg-degraded/10 ring-degraded/40')}
            >
              {feedback.correta ? <CheckCircle2 className="size-6 shrink-0 text-ok" /> : <XCircle className="size-6 shrink-0 text-degraded" />}
              <div className="flex flex-col gap-1 text-sm">
                <p className="text-base font-semibold">{feedback.correta ? 'Acertaram!' : 'Quase! Vejam a resposta certa:'}</p>
                <p>
                  {sv.nome} é <Sigla s={sv.priorityId} />, então o impacto é <strong>{NOME_IMPACTO[feedback.esperado.impacto].toLowerCase()}</strong>.
                  “{t.nome}” tem urgência <strong>{NOME_URGENCIA[feedback.esperado.urgencia].toLowerCase()}</strong>
                  {feedback.esperado.urgencia === 'ALTA' ? ' (está parando o serviço ou piorando rápido)' : ' (incomoda, mas dá para esperar)'}.
                  Resultado:{' '}
                  <strong style={{ color: COR_PRIORIDADE[celulaEsperada!.prioridade] }}>prioridade {celulaEsperada!.nome}</strong>,
                  com prazo (<Sigla s="SLA" />) de {celulaEsperada!.prazoHoras}h para conter.
                </p>
              </div>
            </div>
            <PriorityMatrix catalog={catalog} compacta destaque={feedback.escolhido} correta={feedback.esperado} />
            <DialogFooter>
              <Button size="lg" className="gap-2" onClick={proximo}>
                {pendentes.length > 0 ? 'Próximo chamado' : 'Ir para o War Room'} <ArrowRight className="size-4" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
function Antes({ rotulo, antes, depois, sufixo = '' }: { rotulo: React.ReactNode; antes: number; depois: number; sufixo?: string }) {
  const caiu = Math.round(depois) < Math.round(antes)
  const subiu = Math.round(depois) > Math.round(antes)
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs uppercase text-muted-foreground">{rotulo}</p>
      <p className="font-mono text-2xl font-bold">
        {Math.round(antes)}{sufixo} → <span className={caiu ? 'text-down' : subiu ? 'text-ok' : ''}>{Math.round(depois)}{sufixo}</span>
      </p>
    </div>
  )
}

export function ImpactDialog({ catalog, estado }: { catalog: Catalog; estado: EstadoJogo }) {
  const { aplicar, irPara } = useGame()
  const r = estado.relatorio
  if (estado.fase !== 'IMPACTO' || !r) return null
  const idx = indice(catalog)
  const nome = (id: string) => idx.service.get(id)!.nome
  const afetados = catalog.services
    .map((s) => ({
      s,
      direta: r.perdaDireta[s.id] ?? 0,
      cascata: r.perdaCascata[s.id] ?? 0,
      rec: r.recuperacao[s.id] ?? 0,
      saude: estado.servicos[s.id].saude,
      meta: prioridadeServico(catalog, s.id).metaSaude,
    }))
    .filter((l) => l.direta || l.cascata || l.rec)
  const abaixo = catalog.services.filter((s) => estado.servicos[s.id].saude < prioridadeServico(catalog, s.id).metaSaude)
  const fim = estado.resultado !== null
  const q = r.perdaConfianca

  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">📊 Resultado das {hora(estado, estado.rodada)}</DialogTitle>
          <DialogDescription>Como esta hora afetou a ServiceUp.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Antes rotulo="Saúde geral" antes={r.saudeAntes} depois={r.saudeDepois} sufixo="%" />
          <Antes rotulo={<span className="flex items-center gap-1"><Heart className="size-3.5" /> Confiança dos clientes</span>} antes={r.confiancaAntes} depois={r.confiancaDepois} />
        </div>

        {q.total > 0 ? (
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium">Por que a confiança caiu:</p>
            <ul className="flex flex-col gap-1">
              {q.meta > 0 && (
                <li>🔻 Serviços abaixo da meta de saúde ({abaixo.map((s) => s.nome).join(', ')}): <strong className="text-down">−{q.meta}</strong></li>
              )}
              {q.comunicacao > 0 && <li>📢 Incidente grave sem avisar os clientes: <strong className="text-down">−{q.comunicacao}</strong></li>}
              {q.sla > 0 && <li>⏰ Prazo (<Sigla s="SLA" />) estourado: <strong className="text-down">−{q.sla}</strong></li>}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-ok">A confiança dos clientes não caiu nesta hora. Excelente!</p>
        )}

        {afetados.length > 0 && (
          <div className="flex flex-col gap-1.5 text-sm">
            <p className="font-medium">O que aconteceu com os serviços:</p>
            <ul className="flex flex-col gap-1">
              {afetados.map((l) => (
                <li key={l.s.id} className="flex flex-wrap items-baseline gap-x-2 rounded-lg bg-muted/30 px-3 py-1.5">
                  <span className="font-medium">{l.s.nome}</span>
                  {l.direta > 0 && <span className="text-down">−{l.direta} de incidente aberto</span>}
                  {l.cascata > 0 && <span className="text-partial">−{l.cascata} em cascata</span>}
                  {l.rec > 0 && <span className="text-ok">+{l.rec} de recuperação</span>}
                  <span className={cn('ml-auto font-mono', l.saude < l.meta && 'text-down')}>
                    {Math.round(l.saude)}% <span className="text-xs text-muted-foreground">(meta {l.meta}%)</span>
                  </span>
                </li>
              ))}
            </ul>
            {r.cascatas.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Cascata: {r.cascatas.map((c) => `${nome(c.de)} → ${nome(c.para)}`).join(' · ')}
              </p>
            )}
          </div>
        )}

        {r.licoes.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">O que aprendemos nesta hora:</p>
            {r.licoes.map((l) => <CardLicao key={l.id} catalog={catalog} licao={l} />)}
          </div>
        )}

        <DialogFooter>
          {fim ? (
            <Button size="lg" onClick={() => irPara('postmortem')}>Ver o post-mortem</Button>
          ) : (
            <Button size="lg" className="gap-2" onClick={() => aplicar(proximaRodada)}>
              Próxima hora ({hora(estado, estado.rodada + 1)}) <ArrowRight className="size-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
export function RetroDialog({ catalog, estado }: { catalog: Catalog; estado: EstadoJogo }) {
  const aplicar = useGame((s) => s.aplicar)
  if (estado.fase !== 'RETROSPECTIVA') return null
  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">🍽 Retrospectiva</DialogTitle>
          <DialogDescription>
            Melhoria Contínua: olhem para o que aconteceu até agora e escolham <strong>uma</strong> melhoria.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {OPCOES_RETRO.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => aplicar((c, s) => escolherRetro(c, s, o.id))}
              className="flex flex-col gap-2 rounded-xl bg-muted/40 p-4 text-left ring-1 ring-border transition-all hover:-translate-y-0.5 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Badge variant="secondary">{catalog.practices.find((p) => p.id === o.practiceId)?.nome}</Badge>
              <span className="font-semibold">{o.titulo}</span>
              <span className="text-sm text-muted-foreground"><TextoComSiglas>{o.descricao}</TextoComSiglas></span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
