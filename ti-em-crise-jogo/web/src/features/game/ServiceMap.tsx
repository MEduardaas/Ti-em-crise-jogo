import type { Catalog, Service } from '@shared/catalog'
import {
  Background, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Radar } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { HealthRing } from '@/components/HealthRing'
import { Sigla } from '@/components/Sigla'
import { Badge } from '@/components/ui/badge'
import { prioridadeServico } from '@/engine/selectors'
import type { EstadoJogo } from '@/engine/types'
import { statusFor } from '@/lib/health'
import { iconFor } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { ActionDialog } from './ActionDialog'

interface DadosNo extends Record<string, unknown> {
  servico: Service
  saude: number
  slo: number
  cor: string
  status: string
  monitorado: boolean
  abertos: number
}

const NoServico = memo(function NoServico({ data }: NodeProps<Node<DadosNo>>) {
  const Icon = iconFor(data.servico.icone)
  const abaixo = data.saude < data.slo
  return (
    <div
      className={cn(
        'flex w-48 cursor-pointer items-center gap-3 rounded-xl bg-card p-2.5 ring-1 ring-border backdrop-blur transition-shadow hover:ring-primary/60',
        abaixo && 'ring-2',
      )}
      style={abaixo ? { boxShadow: `0 0 24px -6px ${data.cor}`, ['--tw-ring-color' as string]: data.cor } : undefined}
    >
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-muted-foreground" />
      <HealthRing value={data.saude} color={data.cor} size={52} pulse={data.abertos > 0} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start gap-1.5">
          <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium leading-tight">{data.servico.nome}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[0.7rem]">
          <Badge variant="secondary" className="h-4 px-1 font-mono text-[0.65rem]">{data.servico.priorityId}</Badge>
          <span style={{ color: data.cor }}>{data.status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-[0.65rem] text-muted-foreground">
          <span className="whitespace-nowrap">meta ≥ {data.slo}%</span>
          {data.monitorado && (
            <span className="flex items-center gap-0.5 whitespace-nowrap text-primary"><Radar className="size-3" /> monitorado</span>
          )}
          {data.abertos > 0 && <span className="whitespace-nowrap text-down">{data.abertos} com estrago</span>}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-muted-foreground" />
    </div>
  )
})

const tiposNo = { servico: NoServico }

export function ServiceMap({ catalog, estado }: { catalog: Catalog; estado: EstadoJogo }) {
  const [selecionado, setSelecionado] = useState<string | null>(null)

  const { nodes, edges } = useMemo(() => {
    const info = (s: Service) => {
      const saude = estado.servicos[s.id].saude
      const st = statusFor(saude, catalog.healthStatuses)
      return { saude, slo: prioridadeServico(catalog, s.id).metaSaude, cor: st?.corHex ?? '#888', status: st?.nome ?? '' }
    }
    const nodes: Node<DadosNo>[] = catalog.services.map((s) => ({
      id: s.id,
      type: 'servico',
      position: { x: s.posX, y: s.posY },
      data: {
        servico: s,
        ...info(s),
        monitorado: estado.servicos[s.id].monitorado,
        abertos: estado.incidentes.filter((i) => i.serviceId === s.id && i.status === 'ABERTO').length,
      },
    }))
    const edges: Edge[] = catalog.services.flatMap((s) =>
      s.dependencias.map((d) => {
        const origem = catalog.services.find((x) => x.id === d.dependsOnId)!
        const o = info(origem)
        const afetada = o.saude < o.slo
        return {
          id: `${d.dependsOnId}-${s.id}`,
          source: d.dependsOnId,
          target: s.id,
          animated: afetada,
          style: { stroke: afetada ? o.cor : 'oklch(1 0 0 / 22%)', strokeWidth: afetada ? 2.5 : 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: afetada ? o.cor : 'oklch(1 0 0 / 35%)' },
        }
      }),
    )
    return { nodes, edges }
  }, [catalog, estado])

  const sel = selecionado ? catalog.services.find((s) => s.id === selecionado)! : null

  return (
    <section aria-labelledby="mapa-titulo" data-tour="mapa" className="flex min-h-0 flex-col gap-2 rounded-xl">
      <h2 id="mapa-titulo" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Mapa de serviços <span className="normal-case tracking-normal">· a seta mostra quem depende de quem (<Sigla s="CMDB" />) · clique num serviço para monitorar</span>
      </h2>
      <div className="h-[400px] overflow-hidden rounded-xl bg-card/40 ring-1 ring-border">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={tiposNo}
          colorMode="dark"
          fitView
          fitViewOptions={{ padding: 0.04 }}
          nodesDraggable={false}
          nodesConnectable={false}
          zoomOnScroll={false}
          panOnScroll={false}
          panOnDrag={false}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, n) => setSelecionado(n.id)}
          style={{ background: 'transparent' }}
        >
          <Background gap={24} size={1} color="oklch(1 0 0 / 8%)" />
        </ReactFlow>
      </div>

      {sel && (
        <ActionDialog
          catalog={catalog}
          estado={estado}
          aberto
          onFechar={() => setSelecionado(null)}
          titulo={sel.nome}
          descricao={
            <span>
              {sel.descricao} Saúde {Math.round(estado.servicos[sel.id].saude)}% · meta ≥ {prioridadeServico(catalog, sel.id).metaSaude}%.
              {sel.dependencias.length > 0 &&
                ` Depende de: ${sel.dependencias.map((d) => catalog.services.find((x) => x.id === d.dependsOnId)!.nome).join(', ')}.`}
              {estado.servicos[sel.id].monitorado && ' 📡 Já está monitorado.'}
            </span>
          }
          opcoes={[{ acao: { tipo: 'MONITORAR', serviceId: sel.id }, actionId: 'MONITORAR' }]}
        />
      )}
    </section>
  )
}
