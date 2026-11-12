import type { Catalog } from '@shared/catalog'
import { toast } from 'sonner'
import { create } from 'zustand'
import { criarPartida, encerrarRodada } from '@/engine/engine'
import { metricasFinais } from '@/engine/selectors'
import type { ConfigPartida, EstadoJogo } from '@/engine/types'
import { api } from '@/lib/api'

export type Tela = 'home' | 'lobby' | 'jogo' | 'postmortem'

interface GameStore {
  tela: Tela
  catalog: Catalog | null
  estado: EstadoJogo | null
  sessionId: string | null
  ultimaConfig: Omit<ConfigPartida, 'seed'> | null
  regrasAbertas: boolean
  /** Mentor: dicas passo a passo durante o War Room (ligado no tutorial). */
  mentor: boolean

  setCatalog: (c: Catalog) => void
  irPara: (t: Tela) => void
  abrirRegras: (aberto: boolean) => void
  alternarMentor: () => void
  iniciar: (cfg: Omit<ConfigPartida, 'seed'>) => void
  /** Aplica uma transição do motor; erros viram toast. */
  aplicar: (f: (cat: Catalog, s: EstadoJogo) => EstadoJogo) => boolean
  encerrar: () => void
}

export const useGame = create<GameStore>((set, get) => ({
  tela: 'home',
  catalog: null,
  estado: null,
  sessionId: null,
  ultimaConfig: null,
  regrasAbertas: false,
  mentor: true,

  setCatalog: (catalog) => set({ catalog }),
  irPara: (tela) => set({ tela }),
  abrirRegras: (regrasAbertas) => set({ regrasAbertas }),
  alternarMentor: () => set((s) => ({ mentor: !s.mentor })),

  iniciar: (cfg) => {
    const cat = get().catalog!
    const seed = Math.floor(Math.random() * 2 ** 31)
    const tutorial = cat.scenarios.find((s) => s.id === cfg.scenarioId)?.dificuldade === 'TUTORIAL'
    set({ estado: criarPartida(cat, { ...cfg, seed }), tela: 'jogo', sessionId: null, ultimaConfig: cfg, mentor: tutorial })
    api
      .criarSessao({ ...cfg, seed })
      .then(({ id }) => set({ sessionId: id }))
      .catch(() => toast.warning('Servidor indisponível: esta partida não entrará no ranking.'))
  },

  aplicar: (f) => {
    const { catalog, estado } = get()
    if (!catalog || !estado) return false
    try {
      set({ estado: f(catalog, estado) })
      return true
    } catch (e) {
      toast.error((e as Error).message)
      return false
    }
  },

  /** Fim do War Room: calcula o impacto e salva a foto da rodada (e o resultado, se acabou). */
  encerrar: () => {
    const ok = get().aplicar(encerrarRodada)
    const { estado, sessionId, catalog } = get()
    if (!ok || !estado || !sessionId || !catalog) return
    const snap = estado.snapshots.at(-1)!
    api
      .salvarRodada(sessionId, { rodada: snap.rodada, saudeGeral: snap.saudeGeral, confianca: snap.confianca, saudeServicos: snap.saude })
      .catch(() => {})
    if (estado.resultado) {
      const m = metricasFinais(catalog, estado)
      api
        .finalizar(sessionId, {
          status: estado.resultado,
          confiancaFinal: m.confiancaFinal,
          saudeGeralMedia: m.saudeGeralMedia,
          slaCumpridoPct: m.slaCumpridoPct,
          estrelas: m.estrelas,
        })
        .catch(() => {})
    }
  },
}))
