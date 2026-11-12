import { useDroppable } from '@dnd-kit/core'
import type { Catalog } from '@shared/catalog'
import { TextoComSiglas } from '@/components/Sigla'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { EstadoJogo, Jogador } from '@/engine/types'
import { iconFor } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { Pips } from './ActionDialog'

function CardJogador({ catalog, jogador, ativo }: { catalog: Catalog; jogador: Jogador; ativo: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `player-${jogador.id}`, data: { jogadorId: jogador.id }, disabled: !ativo })
  const role = catalog.roles.find((r) => r.id === jogador.roleId)!
  const Icon = iconFor(role.icone)
  const esp = role.skills.map((k) => ({ k, c: catalog.categories.find((c) => c.id === k.categoryId)! }))

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-border backdrop-blur transition-all',
        isOver && 'scale-[1.02] ring-2 ring-primary',
        jogador.acoes === 0 && 'opacity-60',
      )}
    >
      <div
        className="grid size-11 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: `${role.corHex}22`, color: role.corHex }}
      >
        <Icon className="size-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="font-medium">{jogador.nome}</span>
          <span className="text-xs text-muted-foreground">{role.nome}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pips jogador={jogador} />
          <span className="text-xs text-muted-foreground">
            {jogador.acoes === 0 ? 'sem ações nesta hora' : `${jogador.acoes} ${jogador.acoes === 1 ? 'ação' : 'ações'}`}
          </span>
          <div className="ml-auto flex gap-1">
            {esp.map(({ k, c }) => {
              const CI = iconFor(c.icone)
              return (
                <Tooltip key={c.id}>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}><CI className="size-4" style={{ color: c.corHex }} /></span>
                  </TooltipTrigger>
                  <TooltipContent>Especialista em {c.nome.toLowerCase()}: ao conter, o serviço recupera +{k.bonusSaude} de saúde</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>
        <p className="text-xs leading-snug text-muted-foreground"><TextoComSiglas>{role.vantagem}</TextoComSiglas></p>
      </div>
    </div>
  )
}

export function TeamPanel({ catalog, estado }: { catalog: Catalog; estado: EstadoJogo }) {
  const ativo = estado.fase === 'WAR_ROOM'
  return (
    <section aria-labelledby="equipe-titulo" data-tour="equipe" className="flex flex-col gap-2 rounded-xl">
      <h2 id="equipe-titulo" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Equipe <span className="normal-case tracking-normal">· cada bolinha é 1 ação nesta hora</span>
      </h2>
      {estado.jogadores.map((j) => (
        <CardJogador key={j.id} catalog={catalog} jogador={j} ativo={ativo} />
      ))}
    </section>
  )
}
