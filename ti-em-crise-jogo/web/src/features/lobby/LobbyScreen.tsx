import type { Catalog } from '@shared/catalog'
import { ArrowLeft, BookOpen, Play, Plus, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { TextoComSiglas } from '@/components/Sigla'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { REGRAS } from '@/engine/rules'
import { iconFor } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useGame } from '@/store/game'

const DIFICULDADE = { TUTORIAL: 'Com mentor', NORMAL: 'Normal', DIFICIL: 'Difícil' } as const
const PADRAO = ['SERVICE_DESK', 'INFRA', 'DBA', 'SECOPS']

export function LobbyScreen({ catalog }: { catalog: Catalog }) {
  const { iniciar, irPara, abrirRegras, ultimaConfig } = useGame()
  const [nomeEquipe, setNomeEquipe] = useState(ultimaConfig?.nomeEquipe ?? 'Equipe Plantão')
  const [scenarioId, setScenarioId] = useState(ultimaConfig?.scenarioId ?? catalog.scenarios[0].id)
  const [jogadores, setJogadores] = useState(
    ultimaConfig?.jogadores ?? PADRAO.map((roleId, i) => ({ nome: `Jogador ${i + 1}`, roleId })),
  )

  const usados = new Set(jogadores.map((j) => j.roleId))
  const livre = catalog.roles.find((r) => !usados.has(r.id))
  const valido = nomeEquipe.trim() && jogadores.length >= 2 && jogadores.every((j) => j.nome.trim())
  const bonus = REGRAS.bonusAcoesEquipeEnxuta(jogadores.length)
  const acoes = (catalog.roles[0]?.acoesPorRodada ?? 2) + bonus

  const atualizar = (i: number, campo: 'nome' | 'roleId', valor: string) =>
    setJogadores((js) => js.map((j, k) => (k === i ? { ...j, [campo]: valor } : j)))

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => irPara('home')} className="gap-2">
          <ArrowLeft className="size-4" /> Início
        </Button>
        <h1 className="text-3xl font-bold">Montar o plantão</h1>
        <Button variant="outline" onClick={() => abrirRegras(true)} className="gap-2">
          <BookOpen className="size-4" /> Como jogar
        </Button>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">1. Cenário</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {catalog.scenarios.map((sc) => (
            <button key={sc.id} type="button" onClick={() => setScenarioId(sc.id)} className="text-left">
              <Card
                className={cn(
                  'h-full backdrop-blur transition-all hover:ring-primary/50',
                  scenarioId === sc.id && 'ring-2 ring-primary',
                )}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-heading text-lg">{sc.nome}</CardTitle>
                    <Badge variant={sc.dificuldade === 'DIFICIL' ? 'destructive' : 'outline'}>{DIFICULDADE[sc.dificuldade]}</Badge>
                  </div>
                  <CardDescription>{sc.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="font-mono text-xs text-muted-foreground">
                  {sc.totalRodadas} horas · {String(sc.horaInicio).padStart(2, '0')}h às{' '}
                  {String(sc.horaInicio + sc.totalRodadas).padStart(2, '0')}h · {sc.cronometroSeg > 0 ? `cronômetro de ${sc.cronometroSeg / 60} min por hora` : 'sem cronômetro'}
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">2. Equipe</h2>
        <div className="flex max-w-sm flex-col gap-1.5">
          <Label htmlFor="equipe">Nome da equipe (aparece no ranking)</Label>
          <Input id="equipe" value={nomeEquipe} maxLength={60} onChange={(e) => setNomeEquipe(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {jogadores.map((j, i) => {
            const role = catalog.roles.find((r) => r.id === j.roleId)!
            const Icon = iconFor(role.icone)
            return (
              <motion.div key={i} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="h-full backdrop-blur">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="grid size-10 shrink-0 place-items-center rounded-full"
                        style={{ backgroundColor: `${role.corHex}22`, color: role.corHex }}
                      >
                        <Icon className="size-5" />
                      </div>
                      <Input
                        aria-label={`Nome do jogador ${i + 1}`}
                        value={j.nome}
                        maxLength={40}
                        onChange={(e) => atualizar(i, 'nome', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remover jogador"
                        disabled={jogadores.length <= 2}
                        onClick={() => setJogadores((js) => js.filter((_, k) => k !== i))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <Select value={j.roleId} onValueChange={(v) => atualizar(i, 'roleId', v)}>
                      <SelectTrigger className="w-full" aria-label="Papel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog.roles.map((r) => (
                          <SelectItem key={r.id} value={r.id} disabled={usados.has(r.id) && r.id !== j.roleId}>
                            {r.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Vantagem:</span> <TextoComSiglas>{role.vantagem}</TextoComSiglas>
                      {role.skills.length > 0 && ' Ao conter um incidente da sua área, o serviço recupera +10 de saúde.'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
          {livre && jogadores.length < 6 && (
            <button
              type="button"
              onClick={() => setJogadores((js) => [...js, { nome: `Jogador ${js.length + 1}`, roleId: livre.id }])}
              className="flex min-h-32 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="size-4" /> Adicionar jogador
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {jogadores.length} jogadores · cada um com {acoes} ações por hora
          {bonus > 0 && ' (equipe pequena: +1 ação)'}. Mais jogadores = mais chamados por hora.
        </p>
      </section>

      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!valido}
          className="gap-2"
          onClick={() => iniciar({ scenarioId, nomeEquipe: nomeEquipe.trim(), jogadores: jogadores.map((j) => ({ ...j, nome: j.nome.trim() })) })}
        >
          <Play className="size-4" /> Começar o plantão
        </Button>
      </div>
    </main>
  )
}
