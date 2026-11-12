import { Fragment, type ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { GLOSSARIO, REGEX_SIGLAS } from '@/lib/glossario'
import { cn } from '@/lib/utils'

/** Sigla com sublinhado pontilhado e explicação no tooltip (ex.: <Sigla s="SLA" />). */
export function Sigla({ s, children, className }: { s: string; children?: ReactNode; className?: string }) {
  const g = GLOSSARIO[s]
  if (!g) return <>{children ?? s}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <abbr
          tabIndex={0}
          className={cn('cursor-help no-underline decoration-dotted decoration-1 underline-offset-2 hover:underline', className)}
          style={{ textDecorationLine: 'underline' }}
        >
          {children ?? s}
        </abbr>
      </TooltipTrigger>
      <TooltipContent className="block max-w-72">
        <span className="block font-semibold">{s} · {g.nome}</span>
        <span className="block opacity-90">{g.texto}</span>
      </TooltipContent>
    </Tooltip>
  )
}

/** Texto livre em que toda sigla conhecida (SLA, CAB, P1…) vira um <Sigla />. */
export function TextoComSiglas({ children }: { children: string }) {
  const partes = children.split(REGEX_SIGLAS)
  return (
    <>
      {partes.map((p, i) => (i % 2 === 1 ? <Sigla key={i} s={p} /> : <Fragment key={i}>{p}</Fragment>))}
    </>
  )
}
