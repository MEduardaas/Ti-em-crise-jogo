import type { Catalog } from '@shared/catalog'
import { Megaphone } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { incidenteGrave } from '@/engine/selectors'
import type { EstadoJogo, Incidente, StatusIncidente } from '@/engine/types'
import { IncidentCard } from './IncidentCard'

const COLUNAS: { titulo: string; dica: string; status: StatusIncidente[]; vazio: string }[] = [
  {
    titulo: 'Alertas', dica: 'ainda sem estrago', status: ['ALERTA', 'NOVO'],
    vazio: 'Sem alertas. Monitorem serviços para que os problemas apareçam aqui antes de causar estrago.',
  },
  { titulo: 'Causando estrago', dica: 'contenham!', status: ['ABERTO'], vazio: 'Nenhum incidente causando estrago. 🎉' },
  {
    titulo: 'Contidos', dica: 'podem voltar', status: ['CONTIDO'],
    vazio: 'Incidentes contidos ficam aqui até a causa ser corrigida de vez.',
  },
]

interface Props {
  catalog: Catalog
  estado: EstadoJogo
  onAbrir: (inc: Incidente) => void
  onComunicar: () => void
}

export function IncidentBoard({ catalog, estado, onAbrir, onComunicar }: Props) {
  const warRoom = estado.fase === 'WAR_ROOM'
  const encerrados = estado.incidentes.filter((i) => i.status === 'RESOLVIDO' || i.status === 'PREVENIDO')

  return (
    <section aria-labelledby="fila-titulo" data-tour="fila" className="flex min-h-0 flex-col gap-2 rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="fila-titulo" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Chamados <span className="normal-case tracking-normal">· clique num card ou arraste até alguém da equipe</span>
        </h2>
        {warRoom && incidenteGrave(catalog, estado) && !estado.comunicadoNaRodada && (
          <Button size="sm" variant="destructive" className="gap-1.5" data-tour="avisar" onClick={onComunicar}>
            <Megaphone className="size-4" /> Avisar os clientes
          </Button>
        )}
      </div>
      <div className="grid min-h-0 grid-cols-1 gap-3 md:grid-cols-3">
        {COLUNAS.map((col) => {
          const itens = estado.incidentes
            .filter((i) => col.status.includes(i.status))
            .sort((a, b) => a.prioridade - b.prioridade || a.id - b.id)
          return (
            <div key={col.titulo} className="flex min-h-40 flex-col gap-2 rounded-xl bg-muted/20 p-2 ring-1 ring-border">
              <h3 className="flex items-center justify-between gap-2 px-1 text-xs font-semibold">
                <span>{col.titulo} <span className="font-normal text-muted-foreground">· {col.dica}</span></span>
                <span className="rounded-full bg-muted px-2 font-mono">{itens.length}</span>
              </h3>
              <div className="flex max-h-[62svh] flex-col gap-2 overflow-y-auto pr-0.5">
                <AnimatePresence initial={false}>
                  {itens.map((inc) => (
                    <motion.div
                      key={inc.id}
                      layout
                      initial={{ opacity: 0, y: -10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <IncidentCard
                        catalog={catalog}
                        estado={estado}
                        inc={inc}
                        arrastavel={warRoom}
                        onClick={() => warRoom && onAbrir(inc)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {itens.length === 0 && <p className="p-2 text-xs text-muted-foreground">{col.vazio}</p>}
              </div>
            </div>
          )
        })}
      </div>
      {encerrados.length > 0 && (
        <p className="text-xs text-muted-foreground">
          ✔ Encerrados: {encerrados.length} ({encerrados.filter((i) => i.status === 'PREVENIDO').length} evitados antes de causar estrago)
        </p>
      )}
    </section>
  )
}
