import { cn } from '@/lib/utils'

interface Props {
  value: number // 0–100
  color: string
  size?: number
  pulse?: boolean
  className?: string
}

/** Anel de saúde animado usado nos nós de serviço. */
export function HealthRing({ value, color, size = 64, pulse = false, className }: Props) {
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(100, value)) / 100)

  return (
    <div
      className={cn('relative grid place-items-center rounded-full', pulse && 'animate-pulse-ring', className)}
      style={{ width: size, height: size, color }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute font-mono text-sm font-semibold text-foreground">{Math.round(value)}%</span>
    </div>
  )
}
