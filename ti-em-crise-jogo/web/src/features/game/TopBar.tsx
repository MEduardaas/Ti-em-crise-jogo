import type { Catalog } from '@shared/catalog'
import { BookOpen, GraduationCap, Heart, LogOut, Pause, Play, Siren, SkipForward } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { calcularSaudeGeral, hora, incidenteGrave, saudeAtual } from '@/engine/selectors'
import type { EstadoJogo, Fase } from '@/engine/types'
import { cn } from '@/lib/utils'
import { useGame } from '@/store/game'
import { dicaDoMentor } from './mentor'

const ETAPAS: { fase: Fase; rotulo: string }[] = [
  { fase: 'BRIEFING', rotulo: '1 · Notícias' },
  { fase: 'TRIAGEM', rotulo: '2 · Triagem' },
  { fase: 'WAR_ROOM', rotulo: '3 · War Room' },
  { fase: 'IMPACTO', rotulo: '4 · Resultado' },
]

const corConfianca = (v: number) => (v > 60 ? 'var(--status-ok)' : v > 30 ? 'var(--status-degraded)' : 'var(--status-down)')

interface Props {
  catalog: Catalog
  estado: EstadoJogo
  /** null = cenário sem cronômetro */
  restante: number | null
  pausado: boolean
  onPausar: () => void
}

/** Destaca a área indicada pelo mentor (contorno pulsante). */
function useDestaque(alvo: string | undefined) {
  useEffect(() => {
    if (!alvo) return
    const els = document.querySelectorAll(`[data-tour="${alvo}"]`)
    els.forEach((e) => e.classList.add('tour-alvo'))
    return () => els.forEach((e) => e.classList.remove('tour-alvo'))
  }, [alvo])
}

export function TopBar({ catalog, estado, restante, pausado, onPausar }: Props) {
  const { abrirRegras, irPara, encerrar, mentor, alternarMentor } = useGame()
  const saude = calcularSaudeGeral(catalog, saudeAtual(estado))
  const faseIdx = ETAPAS.findIndex((e) => e.fase === estado.fase)
  const warRoom = estado.fase === 'WAR_ROOM'
  const grave = warRoom && incidenteGrave(catalog, estado)
  const dica = mentor ? dicaDoMentor(catalog, estado) : null
  useDestaque(dica?.alvo)
  const mm = restante === null ? '' : `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}`

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        {/* Relógio */}
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-3xl font-bold tabular-nums">{hora(estado, estado.rodada)}</span>
          <span className="text-sm text-muted-foreground">Hora {estado.rodada} de {estado.totalRodadas}</span>
        </div>

        {/* Etapas da hora */}
        <ol className="hidden items-center gap-1 xl:flex" aria-label="Etapas da hora">
          {ETAPAS.map((e, i) => (
            <li
              key={e.fase}
              aria-current={i === faseIdx ? 'step' : undefined}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs',
                i === faseIdx ? 'bg-primary font-semibold text-primary-foreground' : i < faseIdx ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {e.rotulo}
            </li>
          ))}
        </ol>

        {/* Saúde geral */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div tabIndex={0} className="flex flex-col leading-none">
              <span className="text-[0.65rem] uppercase text-muted-foreground">Saúde geral</span>
              <span className="font-mono text-2xl font-bold tabular-nums">{saude.toFixed(0)}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="block max-w-72">
            Média da saúde dos serviços. Os P1 contam 3×, os P2 2× e os P3 1×.
          </TooltipContent>
        </Tooltip>

        {/* Confiança dos clientes */}
        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between text-[0.7rem] uppercase text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="size-3.5 fill-current" style={{ color: corConfianca(estado.confianca) }} />
              Confiança dos clientes · se zerar, a equipe perde
            </span>
            <span className="font-mono text-base font-bold text-foreground tabular-nums">{Math.round(estado.confianca)}</span>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-label="Confiança dos clientes"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(estado.confianca)}
          >
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${estado.confianca}%`, backgroundColor: corConfianca(estado.confianca) }}
            />
          </div>
        </div>

        {/* War Room: cronômetro (se houver) e encerrar */}
        {warRoom && (
          <div className="flex items-center gap-2">
            {restante !== null && (
              <>
                <span
                  className={cn('font-mono text-2xl font-bold tabular-nums', restante <= 15 && !pausado && 'animate-pulse text-down')}
                  aria-live="off"
                >
                  {mm}
                </span>
                <Button variant="ghost" size="icon" onClick={onPausar} aria-label={pausado ? 'Retomar o tempo' : 'Pausar o tempo'}>
                  {pausado ? <Play className="size-4" /> : <Pause className="size-4" />}
                </Button>
              </>
            )}
            <Button onClick={encerrar} className="gap-2" data-tour="encerrar">
              <SkipForward className="size-4" /> Encerrar a hora
            </Button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={mentor ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5"
            aria-pressed={mentor}
            onClick={alternarMentor}
          >
            <GraduationCap className="size-4" /> Mentor {mentor ? 'ligado' : 'desligado'}
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => abrirRegras(true)}>
            <BookOpen className="size-4" /> Como jogar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sair da partida"
            onClick={() => confirm('Abandonar a partida?') && irPara('home')}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      {grave && (
        <div
          role="alert"
          className={cn(
            'flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium',
            estado.comunicadoNaRodada ? 'bg-degraded/15 text-degraded' : 'animate-pulse bg-down/20 text-down',
          )}
        >
          <Siren className="size-4" />
          {estado.comunicadoNaRodada
            ? 'INCIDENTE GRAVE em andamento: os clientes já foram avisados ✓'
            : 'INCIDENTE GRAVE! Avisem os clientes nesta hora, ou a confiança cai 50% mais rápido.'}
        </div>
      )}

      {dica && (
        <div className="border-t border-primary/30 bg-primary/10">
          <p className="mx-auto flex max-w-[1800px] items-start gap-2 px-4 py-2 text-sm" aria-live="polite">
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary" />
            <span><strong className="text-primary">Mentor:</strong> {dica.texto}</span>
          </p>
        </div>
      )}
    </header>
  )
}
