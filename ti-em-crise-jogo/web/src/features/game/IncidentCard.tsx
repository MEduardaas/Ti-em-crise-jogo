import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Catalog } from '@shared/catalog'
import { Clock, Hourglass, Lightbulb, Radar, RotateCcw, ShieldCheck } from 'lucide-react'
import { COR_PRIORIDADE } from '@/components/PriorityMatrix'
import { Sigla } from '@/components/Sigla'
import { Badge } from '@/components/ui/badge'
import { REGRAS } from '@/engine/rules'
import { indice } from '@/engine/selectors'
import type { EstadoJogo, Incidente } from '@/engine/types'
import { iconFor } from '@/lib/icons'
import { cn } from '@/lib/utils'

interface Props {
  catalog: Catalog
  estado: EstadoJogo
  inc: Incidente
  arrastavel: boolean
  onClick?: () => void
  overlay?: boolean
}

export function IncidentCard({ catalog, estado, inc, arrastavel, onClick, overlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `inc-${inc.id}`,
    data: { incidentId: inc.id },
    disabled: !arrastavel || overlay,
  })
  const idx = indice(catalog)
  const t = idx.type.get(inc.typeId)!
  const cat = catalog.categories.find((c) => c.id === t.categoryId)!
  const sv = idx.service.get(inc.serviceId)!
  const CatIcon = iconFor(cat.icone)
  const prob = estado.problemas[t.problemId]
  const noCab = estado.mudancas.some((m) => m.problemId === t.problemId && m.status === 'AGUARDANDO_CAB')
  const triado = inc.status !== 'NOVO' && inc.status !== 'ALERTA'
  const celula = catalog.priorityMatrix.find((c) => c.prioridade === inc.prioridade)
  const restante = inc.prazo - (estado.rodada - inc.rodadaAbertura)
  const idade = estado.rodada - inc.rodadaAbertura
  const danoPrevisto = Math.round(t.danoBase * (1 + REGRAS.escaladaPorRodada * idade))

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), borderLeftColor: cat.corHex }}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`${inc.codigo} ${t.nome} em ${sv.nome}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={cn(
        'group flex flex-col gap-1.5 rounded-xl border-l-4 bg-card p-3 text-left ring-1 ring-border backdrop-blur transition-shadow outline-none',
        'hover:ring-primary/60 focus-visible:ring-2 focus-visible:ring-primary',
        arrastavel && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30',
        overlay && 'rotate-2 shadow-2xl ring-primary',
        inc.status === 'ABERTO' && inc.prioridade === 1 && 'animate-pulse-ring text-down',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-foreground">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CatIcon className="size-3.5 shrink-0" style={{ color: cat.corHex }} />
          <span className="font-mono">{inc.codigo}</span> · {cat.nome}
        </span>
        {triado && celula ? (
          <Badge style={{ backgroundColor: `${COR_PRIORIDADE[inc.prioridade]}33`, color: COR_PRIORIDADE[inc.prioridade] }}>
            {celula.nome}
          </Badge>
        ) : inc.status === 'ALERTA' ? (
          <Badge variant="outline" className="gap-1 text-degraded"><Radar className="size-3" /> Alerta</Badge>
        ) : (
          <Badge variant="outline">Aguardando triagem</Badge>
        )}
      </div>

      <p className="font-medium leading-snug text-foreground">{t.nome}</p>
      <p className="text-xs text-muted-foreground">
        em <strong className="font-medium text-foreground/90">{sv.nome}</strong> (<Sigla s={sv.priorityId} />)
      </p>
      <p className="text-xs leading-snug text-muted-foreground/90">{t.sintoma}</p>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {inc.status === 'ABERTO' && (
          <>
            <span className="font-mono text-down">−{danoPrevisto} de saúde/hora</span>
            <span className={cn('flex items-center gap-1', inc.slaViolado ? 'text-down' : restante <= 1 ? 'text-degraded' : 'text-muted-foreground')}>
              <Hourglass className="size-3" />
              {inc.slaViolado ? <>prazo (<Sigla s="SLA" />) estourado</> : <>conter em {restante}h (<Sigla s="SLA" />)</>}
            </span>
          </>
        )}
        {inc.status === 'ALERTA' && <span className="text-degraded">vira incidente na próxima hora</span>}
        {inc.status === 'CONTIDO' && (
          <span className="text-ok">✓ Contido · pode voltar ({REGRAS.chanceReincidencia * 100}% por hora)</span>
        )}
        {inc.status === 'RESOLVIDO' && <span className="flex items-center gap-1 text-ok"><ShieldCheck className="size-3" /> Resolvido de vez</span>}
        {inc.status === 'PREVENIDO' && <span className="flex items-center gap-1 text-ok"><ShieldCheck className="size-3" /> Evitado</span>}
        {inc.reincidencias > 0 && (
          <span className="flex items-center gap-1 text-partial"><RotateCcw className="size-3" /> voltou {inc.reincidencias}×</span>
        )}
        {prob?.status === 'ERRO_CONHECIDO' && !noCab && (
          <span className="flex items-center gap-1 text-degraded"><Lightbulb className="size-3" /> causa encontrada</span>
        )}
        {noCab && <span className="flex items-center gap-1 text-primary"><Clock className="size-3" /> correção no CAB</span>}
      </div>
    </div>
  )
}
