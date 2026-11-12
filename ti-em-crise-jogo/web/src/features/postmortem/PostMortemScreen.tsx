import type { Catalog } from '@shared/catalog'
import { useQueryClient } from '@tanstack/react-query'
import confetti from 'canvas-confetti'
import { Award, GraduationCap, Home, RotateCcw, Star } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { COR_PRIORIDADE } from '@/components/PriorityMatrix'
import { Sigla, TextoComSiglas } from '@/components/Sigla'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LICOES, NOME_STATUS_INCIDENTE } from '@/engine/rules'
import { hora, indice, metricasFinais } from '@/engine/selectors'
import type { EstadoJogo } from '@/engine/types'
import { cn } from '@/lib/utils'
import { useGame } from '@/store/game'

function Metrica({ rotulo, valor, dica }: { rotulo: React.ReactNode; valor: React.ReactNode; dica?: string }) {
  return (
    <Card size="sm" className="backdrop-blur">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs uppercase text-muted-foreground">{rotulo}</span>
        <span className="font-mono text-2xl font-bold">{valor}</span>
        {dica && <span className="text-xs text-muted-foreground">{dica}</span>}
      </CardContent>
    </Card>
  )
}

export function PostMortemScreen({ catalog, estado }: { catalog: Catalog; estado: EstadoJogo }) {
  const { irPara } = useGame()
  const qc = useQueryClient()
  const m = metricasFinais(catalog, estado)
  const vitoria = estado.resultado === 'VITORIA'
  const idx = indice(catalog)

  useEffect(() => {
    toast.dismiss() // avisos do War Room não fazem sentido aqui
    qc.invalidateQueries({ queryKey: ['ranking'] })
    if (vitoria && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.3 } })
    }
  }, [vitoria, qc])

  const serie = [
    { hora: hora(estado, 1), saude: 100, confianca: 100 },
    ...estado.snapshots.map((s) => ({ hora: hora(estado, s.rodada + 1), saude: s.saudeGeral, confianca: s.confianca })),
  ]
  const naoVistas = Object.values(LICOES).filter((l) => !estado.licoesVistas.includes(l.id))

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 text-center">
        <Badge variant="outline" className="font-mono">POST-MORTEM · {estado.nomeEquipe}</Badge>
        <h1 className={cn('text-5xl font-bold', vitoria ? 'text-ok' : 'text-down')}>
          {vitoria ? 'A ServiceUp sobreviveu!' : 'A ServiceUp caiu…'}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {vitoria
            ? `Fim do expediente às ${hora(estado, estado.totalRodadas + 1)} com ${m.confiancaFinal} de confiança dos clientes.`
            : `A confiança dos clientes chegou a zero às ${hora(estado, estado.rodada + 1)}. Post-mortem sem culpados: o que o processo pode melhorar?`}
        </p>
        {vitoria && (
          <div className="flex gap-1" aria-label={`${m.estrelas} de 3 estrelas`}>
            {[1, 2, 3].map((i) => (
              <Star key={i} className={cn('size-10', i <= m.estrelas ? 'fill-degraded text-degraded' : 'text-muted')} />
            ))}
          </div>
        )}
      </motion.header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metrica rotulo="Confiança final" valor={m.confiancaFinal} dica="Começou em 100" />
        <Metrica rotulo="Saúde geral média" valor={`${m.saudeGeralMedia}%`} />
        <Metrica rotulo={<>Prazos (<Sigla s="SLA" />) cumpridos</>} valor={`${m.slaCumpridoPct}%`} />
        <Metrica rotulo="Triagens certas" valor={`${m.triagemPct}%`} />
        <Metrica rotulo="Incidentes" valor={m.totalIncidentes} dica={`voltaram ${estado.stats.reincidencias} vez(es)`} />
        <Metrica rotulo="Evitados" valor={estado.stats.prevenidos} dica="Por alertas ou correções" />
        <Metrica rotulo="Causas encontradas" valor={estado.stats.causasEncontradas} dica="Gestão de Problemas" />
        <Metrica rotulo="Problemas eliminados" valor={m.problemasResolvidos} dica="Correções aprovadas pelo CAB" />
      </section>

      <Card className="backdrop-blur">
        <CardHeader><CardTitle className="font-heading">Linha do tempo</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer>
            <LineChart data={serie} margin={{ left: -16, right: 8 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 8%)" />
              <XAxis dataKey="hora" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
              <RTooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Legend />
              <ReferenceLine y={90} stroke="var(--status-ok)" strokeDasharray="4 4" label={{ value: 'meta P1', fill: 'var(--muted-foreground)', fontSize: 11 }} />
              <Line type="monotone" dataKey="saude" name="Saúde geral (%)" stroke="var(--chart-2)" strokeWidth={2.5} />
              <Line type="monotone" dataKey="confianca" name="Confiança dos clientes" stroke="var(--chart-3)" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {m.conquistas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold">Conquistas</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {m.conquistas.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-degraded/10 p-3 ring-1 ring-degraded/30">
                <Award className="size-6 shrink-0 text-degraded" />
                <div><p className="font-semibold">{c.titulo}</p><p className="text-sm text-muted-foreground">{c.descricao}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">Lições de ITIL desta partida</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {estado.licoesVistas.map((id) => {
            const l = LICOES[id]
            return (
              <div key={id} className="flex gap-3 rounded-xl bg-primary/10 p-3 ring-1 ring-primary/30">
                <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">{l.titulo} <span className="text-xs font-normal text-muted-foreground">· {catalog.practices.find((p) => p.id === l.practiceId)?.nome}</span></p>
                  <p className="text-sm text-muted-foreground"><TextoComSiglas>{l.texto}</TextoComSiglas></p>
                </div>
              </div>
            )
          })}
        </div>
        {naoVistas.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Ainda não vistas: {naoVistas.map((l) => l.titulo).join(' · ')}. Jogue de novo para descobrir!
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">Incidentes</h2>
        <div className="overflow-x-auto rounded-xl ring-1 ring-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Código</th><th>Ocorrência</th><th>Serviço</th><th>Prioridade</th>
                <th>Triagem</th><th>Última abertura</th><th>Situação</th><th><Sigla s="SLA" /></th>
              </tr>
            </thead>
            <tbody>
              {estado.incidentes.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="p-2 font-mono text-xs">{i.codigo}</td>
                  <td>{idx.type.get(i.typeId)!.nome}</td>
                  <td>{idx.service.get(i.serviceId)!.nome}</td>
                  <td style={{ color: COR_PRIORIDADE[i.prioridade] }}>{catalog.priorityMatrix.find((c) => c.prioridade === i.prioridade)?.nome}</td>
                  <td>{i.triagemCorreta === null ? '—' : i.triagemCorreta ? '✓' : '✗'}</td>
                  <td className="font-mono text-xs">{hora(estado, i.rodadaAbertura)}</td>
                  <td>{NOME_STATUS_INCIDENTE[i.status]}{i.reincidencias > 0 && ` (voltou ${i.reincidencias}×)`}</td>
                  <td>{i.slaViolado ? <span className="text-down">estourado</span> : '✓'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" className="gap-2" onClick={() => irPara('lobby')}><RotateCcw className="size-4" /> Jogar de novo</Button>
        <Button size="lg" variant="outline" className="gap-2" onClick={() => irPara('home')}><Home className="size-4" /> Início</Button>
      </div>
    </main>
  )
}
