import { ScrollArea } from '@/components/ui/scroll-area'
import type { EstadoJogo, TipoLog } from '@/engine/types'
import { cn } from '@/lib/utils'

const COR: Record<TipoLog, string> = {
  rodada: 'text-primary font-semibold',
  evento: 'text-foreground',
  alerta: 'text-degraded',
  incidente: 'text-partial',
  acao: 'text-muted-foreground',
  sucesso: 'text-ok',
  falha: 'text-down',
}

export function EventLog({ estado }: { estado: EstadoJogo }) {
  const itens = [...estado.log].reverse().slice(0, 80)
  return (
    <section aria-labelledby="log-titulo" className="flex flex-col gap-2">
      <h2 id="log-titulo" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Registro de eventos</h2>
      <ScrollArea className="h-44 rounded-xl bg-card/60 ring-1 ring-border">
        <ol className="flex flex-col gap-0.5 p-3 font-mono text-xs" aria-live="polite">
          {itens.map((l) => (
            <li key={l.id} className={cn('leading-relaxed', COR[l.tipo])}>
              {l.texto}
            </li>
          ))}
        </ol>
      </ScrollArea>
    </section>
  )
}
