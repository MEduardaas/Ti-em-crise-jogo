import type { Catalog, Impacto, Urgencia } from '@shared/catalog'
import { cn } from '@/lib/utils'

const IMPACTOS: Impacto[] = ['ALTO', 'MEDIO', 'BAIXO']
const URGENCIAS: Urgencia[] = ['ALTA', 'BAIXA']
const ROT_I = { ALTO: 'Alto · serviço P1', MEDIO: 'Médio · serviço P2', BAIXO: 'Baixo · serviço P3' }
const ROT_U = { ALTA: 'Alta (piora rápido)', BAIXA: 'Baixa (dá para esperar)' }

/** Cores por prioridade de incidente (1 = Crítica … 4 = Baixa). */
export const COR_PRIORIDADE: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#f59e0b',
  4: '#3b82f6',
}

interface Props {
  catalog: Catalog
  destaque?: { impacto: Impacto; urgencia: Urgencia } | null
  correta?: { impacto: Impacto; urgencia: Urgencia } | null
  compacta?: boolean
}

export function PriorityMatrix({ catalog, destaque, correta, compacta }: Props) {
  const cel = (i: Impacto, u: Urgencia) => catalog.priorityMatrix.find((c) => c.impacto === i && c.urgencia === u)!
  return (
    <div className={cn('grid grid-cols-[auto_1fr_1fr] gap-1 text-center', compacta ? 'text-xs' : 'text-sm')}>
      <div className="p-1 text-left text-[0.7rem] uppercase text-muted-foreground">Impacto ↓ · Urgência →</div>
      {URGENCIAS.map((u) => (
        <div key={u} className="p-1 font-medium">{ROT_U[u]}</div>
      ))}
      {IMPACTOS.map((i) => (
        <div key={i} className="contents">
          <div className="p-1 text-left font-medium">{ROT_I[i]}</div>
          {URGENCIAS.map((u) => {
            const c = cel(i, u)
            const marcada = destaque?.impacto === i && destaque?.urgencia === u
            const certa = correta?.impacto === i && correta?.urgencia === u
            return (
              <div
                key={u}
                className={cn(
                  'rounded-md border border-transparent p-1.5 transition-all',
                  marcada && 'scale-105 border-foreground shadow-lg',
                  certa && 'border-ok ring-2 ring-ok',
                )}
                style={{ backgroundColor: `${COR_PRIORIDADE[c.prioridade]}${marcada || certa ? '55' : '22'}` }}
              >
                <div className="font-semibold">{c.nome}</div>
                <div className="text-xs text-muted-foreground">conter em {c.prazoHoras}h</div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
