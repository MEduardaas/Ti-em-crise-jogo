import { useQuery } from '@tanstack/react-query'
import type { Catalog, RankingEntry } from '@shared/catalog'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json', ...init.headers } : init?.headers,
  })
  if (!res.ok) throw new Error(`${res.status} em ${url}`)
  return (res.status === 204 ? undefined : await res.json()) as T
}

/** Todo o conteúdo do jogo (serviços, ocorrências, papéis, ações, cenários). */
export function useCatalog() {
  return useQuery({ queryKey: ['catalog'], queryFn: () => request<Catalog>('/api/catalog') })
}

export function useRanking() {
  return useQuery({
    queryKey: ['ranking'],
    queryFn: () => request<RankingEntry[]>('/api/ranking'),
    staleTime: 0,
  })
}

export const api = {
  criarSessao: (body: { scenarioId: string; nomeEquipe: string; seed: number; jogadores: { nome: string; roleId: string }[] }) =>
    request<{ id: string; seed: number }>('/api/sessions', { method: 'POST', body: JSON.stringify(body) }),
  salvarRodada: (id: string, body: { rodada: number; saudeGeral: number; confianca: number; saudeServicos: Record<string, number> }) =>
    request<void>(`/api/sessions/${id}/rounds`, { method: 'POST', body: JSON.stringify(body) }),
  finalizar: (
    id: string,
    body: { status: 'VITORIA' | 'DERROTA'; confiancaFinal: number; saudeGeralMedia: number; slaCumpridoPct: number; estrelas: number },
  ) => request<void>(`/api/sessions/${id}/finish`, { method: 'POST', body: JSON.stringify(body) }),
}
