import type { Catalog } from '@shared/catalog'
import { CheckCircle2, Clock, Lightbulb, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Sigla } from '@/components/Sigla'
import { Button } from '@/components/ui/button'
import { hora, indice } from '@/engine/selectors'
import type { EstadoJogo } from '@/engine/types'
import { ActionDialog } from './ActionDialog'

/** Causas encontradas (Gestão de Problemas) e suas correções (Habilitação de Mudanças). */
export function ProblemsPanel({ catalog, estado }: { catalog: Catalog; estado: EstadoJogo }) {
  const idx = indice(catalog)
  const [problemaAberto, setProblemaAberto] = useState<string | null>(null)
  const registros = Object.values(estado.problemas).sort((a, b) => a.rodadaDescoberta - b.rodadaDescoberta)
  const ativo = estado.fase === 'WAR_ROOM'
  const sel = problemaAberto ? idx.problem.get(problemaAberto)! : null

  return (
    <section aria-labelledby="causas-titulo" data-tour="causas" className="flex flex-col gap-2 rounded-xl">
      <h2 id="causas-titulo" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Causas encontradas ({registros.length})
      </h2>
      {registros.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground">
          Nenhuma ainda. Depois de conter um incidente, cliquem nele e escolham <strong>Investigar a causa</strong>.
        </p>
      )}
      {registros.map((r) => {
        const p = idx.problem.get(r.problemId)!
        const fix = idx.fix.get(p.fixChangeId)!
        const mud = estado.mudancas.find((m) => m.problemId === p.id && m.status === 'AGUARDANDO_CAB')
        return (
          <div key={r.problemId} className="flex flex-col gap-1.5 rounded-xl bg-card p-3 text-sm ring-1 ring-border">
            <div className="flex items-center gap-2">
              {r.status === 'RESOLVIDO' ? <CheckCircle2 className="size-4 shrink-0 text-ok" /> : <Lightbulb className="size-4 shrink-0 text-degraded" />}
              <span className="font-medium">{p.nome}</span>
              <span className="ml-auto text-xs text-muted-foreground">{r.status === 'RESOLVIDO' ? 'Eliminado' : 'Erro conhecido'}</span>
            </div>
            <p className="text-xs text-muted-foreground">{p.causaRaiz}</p>
            <p className="flex items-start gap-1 text-xs"><Wrench className="mt-0.5 size-3 shrink-0" /><span>Correção: {fix.nome}</span></p>
            {r.status !== 'RESOLVIDO' && mud && (
              <p className="flex items-start gap-1 text-xs text-primary">
                <Clock className="mt-0.5 size-3 shrink-0" />
                <span>{mud.codigo} no <Sigla s="CAB" />: vale a partir de {hora(estado, mud.rodadaAplicacao)}</span>
              </p>
            )}
            {ativo && r.status !== 'RESOLVIDO' && !mud && (
              <Button size="sm" className="gap-1.5" onClick={() => setProblemaAberto(p.id)}>
                <Wrench className="size-4" /> Corrigir de vez
              </Button>
            )}
          </div>
        )
      })}
      <ActionDialog
        catalog={catalog}
        estado={estado}
        aberto={!!sel}
        onFechar={() => setProblemaAberto(null)}
        titulo={sel ? `Corrigir: ${sel.nome}` : ''}
        descricao={sel ? `${idx.fix.get(sel.fixChangeId)!.nome}: ${idx.fix.get(sel.fixChangeId)!.descricao}` : undefined}
        opcoes={sel ? [{ acao: { tipo: 'CORRIGIR', problemId: sel.id }, actionId: 'CORRIGIR' }] : []}
      />
    </section>
  )
}
