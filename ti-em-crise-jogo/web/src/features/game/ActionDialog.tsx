import type { Catalog } from '@shared/catalog'
import { CheckCircle2, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { TextoComSiglas } from '@/components/Sigla'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { executarAcao } from '@/engine/engine'
import { custoAcao } from '@/engine/selectors'
import type { EstadoJogo, Jogador } from '@/engine/types'
import { iconFor } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useGame } from '@/store/game'
import { MOTIVOS_FEITO, type OpcaoAcao } from './opcoes'

interface Props {
  catalog: Catalog
  estado: EstadoJogo
  aberto: boolean
  onFechar: () => void
  titulo: ReactNode
  descricao?: ReactNode
  opcoes: OpcaoAcao[]
  /** Quando o card foi arrastado até um jogador, só ele aparece. */
  jogadorId?: number | null
}

/** Bolinhas com as ações que o jogador ainda tem nesta hora. */
export function Pips({ jogador, className }: { jogador: Jogador; className?: string }) {
  return (
    <span className={cn('flex gap-1', className)} aria-label={`${jogador.acoes} de ${jogador.acoesMax} ações`}>
      {Array.from({ length: Math.max(jogador.acoesMax, jogador.acoes) }, (_, i) => (
        <span key={i} className={cn('size-2.5 rounded-full ring-1 ring-primary/60', i < jogador.acoes ? 'bg-primary' : 'bg-transparent')} />
      ))}
    </span>
  )
}

/** Escolha da ação (etapas do ciclo ITIL) e de quem vai executá-la. */
export function ActionDialog({ catalog, estado, aberto, onFechar, titulo, descricao, opcoes, jogadorId }: Props) {
  const aplicar = useGame((s) => s.aplicar)
  const jogadores = estado.jogadores.filter((j) => jogadorId == null || j.id === jogadorId)
  const nomePratica = (id: string) => catalog.practices.find((p) => p.id === id)?.nome
  const varias = opcoes.length > 1

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{titulo}</DialogTitle>
          {descricao && <DialogDescription asChild><div>{descricao}</div></DialogDescription>}
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {varias ? 'O caminho ITIL tem etapas. Escolham' : 'Escolham'} a ação e quem vai fazê-la. Cada ação gasta 1 bolinha de quem a executa.
        </p>

        <ol className="flex flex-col gap-3">
          {opcoes.map((op, k) => {
            const a = catalog.actions.find((x) => x.id === op.actionId)!
            const Icon = iconFor(a.icone)
            const custos = jogadores.map((j) => ({ j, c: custoAcao(catalog, estado, j, op.acao) }))
            const algumOk = custos.some((x) => x.c.ok)
            const motivo = !algumOk ? (custos[0]?.c.ok === false ? custos[0].c.motivo : '') : ''
            const todosIguais = !algumOk && custos.every((x) => !x.c.ok && x.c.motivo === motivo)
            const feito = todosIguais && MOTIVOS_FEITO.has(motivo)
            const bloqueado = todosIguais && !feito
            return (
              <li
                key={k}
                className={cn(
                  'flex gap-3 rounded-xl p-3 ring-1',
                  feito ? 'bg-ok/10 ring-ok/30' : bloqueado ? 'bg-muted/20 ring-border opacity-70' : 'bg-muted/40 ring-primary/30',
                )}
              >
                <div className="flex flex-col items-center gap-1">
                  <div className={cn('grid size-11 place-items-center rounded-full', feito ? 'bg-ok/20 text-ok' : 'bg-primary/15 text-primary')}>
                    <Icon className="size-5" />
                  </div>
                  {varias && <span className="font-mono text-xs text-muted-foreground">{k + 1}</span>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base font-semibold">{op.titulo ?? a.nome}</span>
                    <Badge variant="secondary">{nomePratica(a.practiceId)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground"><TextoComSiglas>{a.descricao}</TextoComSiglas></p>
                  {op.detalhe && <p className="text-sm"><TextoComSiglas>{op.detalhe}</TextoComSiglas></p>}

                  {todosIguais ? (
                    <p className={cn('mt-1 flex items-center gap-1.5 text-sm', feito ? 'text-ok' : 'text-muted-foreground')}>
                      {feito ? <CheckCircle2 className="size-4" /> : <Lock className="size-4" />} {motivo}
                    </p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {custos.map(({ j, c }) => {
                        const role = catalog.roles.find((r) => r.id === j.roleId)!
                        const RIcon = iconFor(role.icone)
                        return (
                          <Button
                            key={j.id}
                            variant={c.ok ? 'outline' : 'ghost'}
                            disabled={!c.ok}
                            className="h-auto gap-2 py-2"
                            onClick={() => aplicar((cat, s) => executarAcao(cat, s, j.id, op.acao)) && onFechar()}
                          >
                            <RIcon className="size-4" style={{ color: role.corHex }} />
                            <span>{j.nome}</span>
                            {c.ok ? (
                              c.custo === 0 ? <Badge className="bg-ok/20 text-ok">grátis</Badge> : <Pips jogador={j} />
                            ) : (
                              <span className="text-xs text-muted-foreground">{c.motivo}</span>
                            )}
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
