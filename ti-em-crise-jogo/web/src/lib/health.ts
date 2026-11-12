import type { HealthStatus } from '@shared/catalog'

/** Encontra a faixa de status (Operacional, Degradado…) para um % de saúde. */
export function statusFor(saude: number, statuses: HealthStatus[]): HealthStatus | undefined {
  const s = Math.round(Math.max(0, Math.min(100, saude)))
  return statuses.find((h) => s >= h.faixaMin && s <= h.faixaMax)
}
