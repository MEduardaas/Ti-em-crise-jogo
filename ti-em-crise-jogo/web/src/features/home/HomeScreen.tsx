import type { Catalog } from '@shared/catalog'
import { BookOpen, Play, Siren, Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import { HealthRing } from '@/components/HealthRing'
import { Sigla, TextoComSiglas } from '@/components/Sigla'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useRanking } from '@/lib/api'
import { statusFor } from '@/lib/health'
import { iconFor } from '@/lib/icons'
import { useGame } from '@/store/game'

const DIFICULDADE_LABEL = { TUTORIAL: 'Com mentor', NORMAL: 'Normal', DIFICIL: 'Difícil' } as const

export function HomeScreen({ catalog }: { catalog: Catalog }) {
  const priorities = new Map(catalog.priorities.map((p) => [p.id, p]))
  const { irPara, abrirRegras } = useGame()
  const ranking = useRanking()

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10">
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <Badge variant="outline" className="gap-1.5 border-primary/40 font-mono text-primary">
          <Siren className="size-3.5" /> PLANTÃO DA EQUIPE DE TI
        </Badge>
        <h1 className="text-5xl font-bold md:text-7xl">
          TI em <span className="text-down">Crise</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          A <strong className="text-foreground">ServiceUp</strong> depende de vocês. Classifiquem os chamados, contenham os
          incidentes, descubram a causa e corrijam de vez, usando as práticas <Sigla s="ITIL" />, até o fim do expediente.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button size="lg" className="gap-2" onClick={() => irPara('lobby')}>
            <Play className="size-4" /> Iniciar partida
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={() => abrirRegras(true)}>
            <BookOpen className="size-4" /> Como jogar
          </Button>
        </div>
      </motion.header>

      {/* Status page dos serviços */}
      <section aria-labelledby="status-title" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 id="status-title" className="text-2xl font-semibold">Status dos serviços</h2>
          <span className="text-sm text-muted-foreground">{catalog.services.length} serviços</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.services.map((s, i) => {
            const prio = priorities.get(s.priorityId)!
            const status = statusFor(s.saudeInicial, catalog.healthStatuses)
            const Icon = iconFor(s.icone)
            const StatusIcon = iconFor(status?.icone ?? '')
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
              >
                <Card className="h-full backdrop-blur">
                  <CardContent className="flex items-center gap-4">
                    <HealthRing value={s.saudeInicial} color={status?.corHex ?? 'gray'} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-start gap-2">
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium leading-tight">{s.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="font-mono">{prio.id}</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {prio.nome} · conta {prio.peso}× · meta de saúde ≥ {prio.metaSaude}% (no mercado: {prio.slaDisponibilidadeRef}% de disponibilidade)
                          </TooltipContent>
                        </Tooltip>
                        <span className="flex items-center gap-1 text-xs" style={{ color: status?.corHex }}>
                          <StatusIcon className="size-3.5" /> {status?.nome}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Cenários */}
      <section aria-labelledby="cenarios-title" className="flex flex-col gap-4">
        <h2 id="cenarios-title" className="text-2xl font-semibold">Cenários</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {catalog.scenarios.map((sc) => (
            <Card key={sc.id} className="backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg">{sc.nome}</CardTitle>
                  <Badge variant={sc.dificuldade === 'DIFICIL' ? 'destructive' : 'outline'}>
                    {DIFICULDADE_LABEL[sc.dificuldade]}
                  </Badge>
                </div>
                <CardDescription>{sc.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="font-mono text-xs text-muted-foreground">
                {sc.totalRodadas} horas · {String(sc.horaInicio).padStart(2, '0')}h–
                {String(sc.horaInicio + sc.totalRodadas).padStart(2, '0')}h · {sc.cronometroSeg > 0 ? 'com cronômetro' : 'sem cronômetro'}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Papéis */}
      <section aria-labelledby="papeis-title" className="flex flex-col gap-4">
        <h2 id="papeis-title" className="text-2xl font-semibold">A equipe</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {catalog.roles.map((r) => {
            const Icon = iconFor(r.icone)
            return (
              <Card key={r.id} size="sm" className="items-center text-center backdrop-blur">
                <CardContent className="flex flex-col items-center gap-2">
                  <div
                    className="grid size-12 place-items-center rounded-full"
                    style={{ backgroundColor: `${r.corHex}22`, color: r.corHex }}
                  >
                    <Icon className="size-6" />
                  </div>
                  <span className="text-sm font-medium leading-tight">{r.nome}</span>
                  <span className="text-xs text-muted-foreground"><TextoComSiglas>{r.vantagem}</TextoComSiglas></span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Ranking */}
      {ranking.data && ranking.data.length > 0 && (
        <section aria-labelledby="ranking-title" className="flex flex-col gap-4">
          <h2 id="ranking-title" className="flex items-center gap-2 text-2xl font-semibold">
            <Trophy className="size-5 text-degraded" /> Ranking
          </h2>
          <ol className="flex flex-col gap-1.5">
            {ranking.data.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-border">
                <span className="w-6 font-mono text-muted-foreground">{i + 1}.</span>
                <span className="flex-1 font-medium">{r.nomeEquipe}</span>
                <span className="text-xs text-muted-foreground">{catalog.scenarios.find((s) => s.id === r.scenarioId)?.nome}</span>
                <span className={r.status === 'VITORIA' ? 'text-ok' : 'text-down'}>{r.status === 'VITORIA' ? '★'.repeat(r.estrelas) || 'Vitória' : 'Derrota'}</span>
                <span className="w-28 text-right font-mono text-xs">confiança {r.confiancaFinal}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  )
}
