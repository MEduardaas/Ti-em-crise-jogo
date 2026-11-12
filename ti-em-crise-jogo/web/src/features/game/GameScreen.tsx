import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import type { Catalog } from '@shared/catalog'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { LICOES } from '@/engine/rules'
import { indice } from '@/engine/selectors'
import type { EstadoJogo, Incidente } from '@/engine/types'
import { useGame } from '@/store/game'
import { ActionDialog } from './ActionDialog'
import { EventLog } from './EventLog'
import { IncidentBoard } from './IncidentBoard'
import { IncidentCard } from './IncidentCard'
import { opcoesIncidente } from './opcoes'
import { BriefingDialog, ImpactDialog, RetroDialog, TriageDialog } from './PhaseDialogs'
import { ProblemsPanel } from './ProblemsPanel'
import { ServiceMap } from './ServiceMap'
import { TeamPanel } from './TeamPanel'
import { TopBar } from './TopBar'

/** Cronômetro do War Room (só nos cenários que têm): reinicia a cada hora e encerra a hora ao zerar. */
function useCronometro(estado: EstadoJogo, duracao: number, bloqueado: boolean, aoZerar: () => void) {
  const [restante, setRestante] = useState(duracao)
  const [pausado, setPausado] = useState(false)
  const [rodada, setRodada] = useState(estado.rodada)
  const ativo = estado.fase === 'WAR_ROOM' && duracao > 0
  const zerar = useRef(aoZerar)

  // Nova rodada: reinicia o relógio (ajuste de estado durante a renderização, padrão recomendado pelo React)
  if (rodada !== estado.rodada) {
    setRodada(estado.rodada)
    setRestante(duracao)
    setPausado(false)
  }

  useEffect(() => {
    zerar.current = aoZerar
  })

  useEffect(() => {
    if (!ativo || pausado || bloqueado) return
    const id = setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [ativo, pausado, bloqueado])

  useEffect(() => {
    if (ativo && restante === 0) {
      toast.warning('⏰ Tempo esgotado! A hora acabou.')
      zerar.current()
    }
  }, [ativo, restante])

  return { restante: duracao > 0 ? restante : null, pausado, alternarPausa: () => setPausado((p) => !p) }
}

/** Durante o War Room: toast para sucessos/falhas e para cada lição de ITIL nova ("o que vocês acabaram de fazer"). */
function useToastsDoLog(catalog: Catalog, estado: EstadoJogo) {
  const ultimo = useRef(estado.log.at(-1)?.id ?? 0)
  const licoes = useRef(estado.licoesVistas.length)
  useEffect(() => {
    const novos = estado.log.filter((l) => l.id > ultimo.current)
    ultimo.current = estado.log.at(-1)?.id ?? 0
    const novasLicoes = estado.licoesVistas.slice(licoes.current).map((id) => LICOES[id])
    licoes.current = estado.licoesVistas.length
    if (estado.fase !== 'WAR_ROOM') return
    for (const l of novos) {
      if (l.tipo === 'sucesso') toast.success(l.texto)
      else if (l.tipo === 'falha') toast.error(l.texto)
    }
    for (const l of novasLicoes) {
      const pratica = catalog.practices.find((p) => p.id === l.practiceId)?.nome
      toast.info(`🎓 ${l.titulo}${pratica ? ` · ${pratica}` : ''}`, { description: l.texto, duration: 9000 })
    }
  }, [catalog, estado.log, estado.fase, estado.licoesVistas])
}

export function GameScreen({ catalog, estado }: { catalog: Catalog; estado: EstadoJogo }) {
  const encerrar = useGame((s) => s.encerrar)
  const [dialogo, setDialogo] = useState<{ incidentId: number; jogadorId: number | null } | null>(null)
  const [comunicar, setComunicar] = useState(false)
  const [arrastando, setArrastando] = useState<Incidente | null>(null)
  const duracao = indice(catalog).scenario.get(estado.scenarioId)!.cronometroSeg
  const cron = useCronometro(estado, duracao, dialogo !== null || comunicar, encerrar)
  useToastsDoLog(catalog, estado)

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const aoIniciar = (e: DragStartEvent) => {
    const id = e.active.data.current?.incidentId as number | undefined
    setArrastando(estado.incidentes.find((i) => i.id === id) ?? null)
  }
  const aoSoltar = (e: DragEndEvent) => {
    setArrastando(null)
    const incidentId = e.active.data.current?.incidentId as number | undefined
    const jogadorId = e.over?.data.current?.jogadorId as number | undefined
    if (incidentId != null && jogadorId != null) setDialogo({ incidentId, jogadorId })
  }

  const incDialogo = dialogo ? estado.incidentes.find((i) => i.id === dialogo.incidentId) : undefined
  const tipoDialogo = incDialogo ? indice(catalog).type.get(incDialogo.typeId) : undefined

  return (
    <div className="flex min-h-svh flex-col">
      <TopBar catalog={catalog} estado={estado} restante={cron.restante} pausado={cron.pausado} onPausar={cron.alternarPausa} />

      <DndContext sensors={sensores} onDragStart={aoIniciar} onDragEnd={aoSoltar} onDragCancel={() => setArrastando(null)}>
        <main className="mx-auto grid w-full max-w-[1800px] flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(300px,0.6fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <ServiceMap catalog={catalog} estado={estado} />
            <EventLog estado={estado} />
          </div>
          <IncidentBoard
            catalog={catalog}
            estado={estado}
            onAbrir={(inc) => setDialogo({ incidentId: inc.id, jogadorId: null })}
            onComunicar={() => setComunicar(true)}
          />
          <aside className="flex min-w-0 flex-col gap-4">
            <TeamPanel catalog={catalog} estado={estado} />
            <ProblemsPanel catalog={catalog} estado={estado} />
          </aside>
        </main>
        <DragOverlay dropAnimation={null}>
          {arrastando && <IncidentCard catalog={catalog} estado={estado} inc={arrastando} arrastavel={false} overlay />}
        </DragOverlay>
      </DndContext>

      {incDialogo && tipoDialogo && (
        <ActionDialog
          catalog={catalog}
          estado={estado}
          aberto
          onFechar={() => setDialogo(null)}
          jogadorId={dialogo?.jogadorId}
          titulo={`${incDialogo.codigo} · ${tipoDialogo.nome}`}
          descricao={tipoDialogo.sintoma}
          opcoes={opcoesIncidente(catalog, estado, incDialogo)}
        />
      )}
      <ActionDialog
        catalog={catalog}
        estado={estado}
        aberto={comunicar}
        onFechar={() => setComunicar(false)}
        titulo="Avisar os clientes"
        descricao="Publicar um aviso na página de status e informar a diretoria sobre o incidente grave."
        opcoes={[{ acao: { tipo: 'COMUNICAR' }, actionId: 'COMUNICAR' }]}
      />

      <BriefingDialog catalog={catalog} estado={estado} />
      <TriageDialog catalog={catalog} estado={estado} />
      <ImpactDialog catalog={catalog} estado={estado} />
      <RetroDialog catalog={catalog} estado={estado} />
    </div>
  )
}
