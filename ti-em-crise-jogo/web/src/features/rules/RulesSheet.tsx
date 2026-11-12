import type { Catalog } from '@shared/catalog'
import { ArrowRight, BookOpen, GraduationCap, Heart } from 'lucide-react'
import type { ReactNode } from 'react'
import { PriorityMatrix } from '@/components/PriorityMatrix'
import { Sigla, TextoComSiglas } from '@/components/Sigla'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { REGRAS } from '@/engine/rules'
import { GLOSSARIO } from '@/lib/glossario'
import { iconFor } from '@/lib/icons'
import { useGame } from '@/store/game'

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-base font-semibold">{titulo}</h3>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

const forte = 'text-foreground font-medium'

const ETAPAS = [
  ['📣 Notícias', 'Chegam os chamados novos, os alertas e os eventos do dia. Correções aprovadas pelo CAB entram em produção.'],
  ['🧭 Triagem', 'Para cada chamado novo, respondam: qual o impacto e qual a urgência? Isso define a prioridade e o prazo.'],
  ['🗣 War Room', 'Conversem e usem as ações da equipe. Arrastem um card até um jogador (ou cliquem nele).'],
  ['📊 Resultado', 'Incidentes abertos causam estrago, a falha se espalha pelo mapa e a confiança dos clientes pode cair.'],
] as const

/** O ciclo ITIL que o jogo ensina: incidente → problema → mudança. */
function Ciclo({ catalog }: { catalog: Catalog }) {
  const passos = ['CONTER', 'INVESTIGAR', 'CORRIGIR'].map((id) => catalog.actions.find((a) => a.id === id)!)
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {passos.map((a, i) => {
        const Icon = iconFor(a.icone)
        return (
          <div key={a.id} className="contents">
            {i > 0 && <ArrowRight className="size-5 self-center text-muted-foreground" />}
            <div className="flex min-w-36 flex-1 flex-col items-center gap-1 rounded-xl bg-muted/40 p-3 text-center">
              <Icon className="size-6 text-primary" />
              <span className={forte}>{i + 1}. {a.nome}</span>
              <span className="text-xs">{catalog.practices.find((p) => p.id === a.practiceId)?.nome}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function RulesSheet({ catalog }: { catalog: Catalog }) {
  const aberto = useGame((s) => s.regrasAbertas)
  const abrir = useGame((s) => s.abrirRegras)
  const acoes = catalog.roles[0]?.acoesPorRodada ?? 2

  return (
    <Sheet open={aberto} onOpenChange={abrir}>
      <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-heading text-xl">
            <BookOpen className="size-5 text-primary" /> Como jogar
          </SheetTitle>
          <SheetDescription>As regras do TI em Crise e a prática ITIL por trás de cada uma.</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="objetivo" className="min-h-0 flex-1 px-4 pb-4">
          <TabsList className="flex h-auto w-full flex-wrap">
            <TabsTrigger value="objetivo">Objetivo</TabsTrigger>
            <TabsTrigger value="hora">Uma hora de jogo</TabsTrigger>
            <TabsTrigger value="acoes">Ações e papéis</TabsTrigger>
            <TabsTrigger value="prioridade">Prioridade</TabsTrigger>
            <TabsTrigger value="saude">Saúde e confiança</TabsTrigger>
            <TabsTrigger value="glossario">Glossário</TabsTrigger>
          </TabsList>

          <ScrollArea className="mt-4 h-[calc(100svh-11rem)] pr-3">
            <TabsContent value="objetivo" className="flex flex-col gap-5">
              <Bloco titulo="A missão">
                <p>
                  Vocês são a equipe de TI da <strong className={forte}>ServiceUp</strong>, uma loja online. O dia começa às 08h com tudo
                  funcionando, mas os problemas vão aparecer. O jogo é <strong className={forte}>cooperativo</strong>: todos vencem juntos se
                  chegarem ao fim do expediente com a <strong className={forte}>confiança dos clientes</strong> acima de zero.
                </p>
              </Bloco>
              <Bloco titulo="❤ A confiança dos clientes é a vida da equipe">
                <p>
                  Ela começa em 100 e cai quando um serviço fica abaixo da meta de saúde, quando um prazo (<Sigla s="SLA" />) estoura ou
                  quando a equipe fica em silêncio durante um incidente grave.
                </p>
              </Bloco>
              <Bloco titulo="O segredo: o ciclo ITIL">
                <p>Apagar incêndio não basta. Um incidente só contido pode voltar. Para ele sumir de vez, sigam as 3 etapas:</p>
                <Ciclo catalog={catalog} />
                <p>
                  E previnam: <strong className={forte}>monitorar</strong> um serviço faz os próximos problemas chegarem como alerta, antes
                  de causar estrago.
                </p>
              </Bloco>
              <Bloco titulo="Mentor">
                <p className="flex items-start gap-2">
                  <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    Durante o War Room, o mentor sugere o próximo passo e destaca onde clicar. Ele começa ligado no cenário
                    "Primeiro Plantão" e pode ser ligado ou desligado pelo botão no topo da tela.
                  </span>
                </p>
              </Bloco>
            </TabsContent>

            <TabsContent value="hora" className="flex flex-col gap-5">
              <Bloco titulo="Cada rodada é uma hora do expediente">
                <ol className="flex flex-col gap-2">
                  {ETAPAS.map(([f, t]) => (
                    <li key={f} className="rounded-lg bg-muted/40 p-3">
                      <span className={forte}>{f}</span>: {t}
                    </li>
                  ))}
                </ol>
              </Bloco>
              <Bloco titulo="A vida de um incidente">
                <p className="flex flex-wrap items-center gap-1">
                  <Badge variant="outline">Alerta</Badge> → <Badge variant="outline">Novo</Badge> → <Badge variant="outline">Causando estrago</Badge> →{' '}
                  <Badge variant="outline">Contido</Badge> → <Badge variant="outline">Resolvido de vez</Badge>
                </p>
                <p>
                  Um incidente <strong className={forte}>causando estrago</strong> tira saúde do serviço a cada hora, e o estrago cresce enquanto
                  ninguém o contém. Um incidente <strong className={forte}>contido</strong> tem {REGRAS.chanceReincidencia * 100}% de chance
                  de voltar a cada hora, até que a causa seja corrigida de vez.
                </p>
              </Bloco>
              <Bloco titulo="Retrospectiva">
                <p>Em uma das horas, a equipe para e escolhe uma melhoria (Melhoria Contínua).</p>
              </Bloco>
            </TabsContent>

            <TabsContent value="acoes" className="flex flex-col gap-5">
              <Bloco titulo="Ações por hora">
                <p>
                  Cada jogador tem <strong className={forte}>{acoes} ações por hora</strong> (as bolinhas no card). Equipes de até 3 pessoas
                  ganham +1. Cada ação gasta 1 bolinha, e todas voltam no começo da próxima hora.
                </p>
              </Bloco>
              <Bloco titulo="As 5 ações">
                <ul className="flex flex-col gap-2">
                  {catalog.actions.map((a) => {
                    const Icon = iconFor(a.icone)
                    return (
                      <li key={a.id} className="flex gap-3 rounded-lg bg-muted/40 p-3">
                        <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={forte}>{a.nome}</span>
                            <Badge variant="secondary">{catalog.practices.find((p) => p.id === a.practiceId)?.nome}</Badge>
                          </div>
                          <p className="mt-1"><TextoComSiglas>{a.descricao}</TextoComSiglas></p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </Bloco>
              <Bloco titulo="Papéis: cada um tem uma vantagem">
                <ul className="flex flex-col gap-2">
                  {catalog.roles.map((r) => {
                    const Icon = iconFor(r.icone)
                    return (
                      <li key={r.id} className="flex gap-3 rounded-lg bg-muted/40 p-3">
                        <Icon className="mt-0.5 size-5 shrink-0" style={{ color: r.corHex }} />
                        <div>
                          <p className={forte}>{r.nome}</p>
                          <p><TextoComSiglas>{r.vantagem}</TextoComSiglas>{r.skills.length > 0 && ' Ao conter um incidente da sua área, o serviço recupera +10 de saúde.'}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </Bloco>
            </TabsContent>

            <TabsContent value="prioridade" className="flex flex-col gap-5">
              <Bloco titulo="Impacto × Urgência = Prioridade">
                <p>Na triagem, a equipe responde a 2 perguntas:</p>
                <ol className="list-decimal pl-5">
                  <li><strong className={forte}>Impacto:</strong> qual a importância do serviço afetado? É a etiqueta <Sigla s="P1" />, <Sigla s="P2" /> ou <Sigla s="P3" />.</li>
                  <li><strong className={forte}>Urgência:</strong> o problema está parando o serviço ou piorando rápido? Sim = alta; dá para esperar = baixa.</li>
                </ol>
                <p>O cruzamento das respostas dá a prioridade e o prazo para conter (<Sigla s="SLA" />). Errar não tira confiança: o jogo mostra a resposta certa.</p>
                <PriorityMatrix catalog={catalog} />
              </Bloco>
            </TabsContent>

            <TabsContent value="saude" className="flex flex-col gap-5">
              <Bloco titulo="Saúde dos serviços (como numa página de status)">
                <ul className="flex flex-col gap-1.5">
                  {catalog.healthStatuses.map((h) => {
                    const Icon = iconFor(h.icone)
                    return (
                      <li key={h.id} className="flex items-center gap-2">
                        <Icon className="size-4" style={{ color: h.corHex }} />
                        <span className="w-20 font-mono">{h.faixaMin}–{h.faixaMax}%</span>
                        <span className="text-foreground">{h.nome}</span>
                      </li>
                    )
                  })}
                </ul>
              </Bloco>
              <Bloco titulo="Meta de cada tipo de serviço">
                <table className="w-full text-left">
                  <thead className="text-xs uppercase">
                    <tr><th className="py-1">Serviço</th><th>Conta na saúde geral</th><th>Meta de saúde</th><th>No mercado</th></tr>
                  </thead>
                  <tbody className="text-foreground">
                    {catalog.priorities.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="py-1.5"><Sigla s={p.id} /> {p.nome}</td>
                        <td>{p.peso}×</td>
                        <td>≥ {p.metaSaude}%</td>
                        <td className="text-muted-foreground">{p.slaDisponibilidadeRef}% no ar ({p.downtimeMensalRef} fora/mês)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Bloco>
              <Bloco titulo="❤ Quando a confiança cai">
                <ul className="flex flex-col gap-1.5">
                  <li className="flex gap-2"><Heart className="mt-1 size-3.5 shrink-0 text-down" /> Serviço abaixo da meta: quanto mais abaixo, mais cai. Os P1 pesam 3 vezes mais.</li>
                  <li className="flex gap-2"><Heart className="mt-1 size-3.5 shrink-0 text-down" /> Prazo (<Sigla s="SLA" />) estourado: −{REGRAS.penalidadeSla}.</li>
                  <li className="flex gap-2"><Heart className="mt-1 size-3.5 shrink-0 text-down" /> Incidente grave (serviço P1 abaixo de {REGRAS.limiarIncidenteGrave}% ou chamado de prioridade Crítica) sem avisar os clientes: a queda da hora fica 50% maior.</li>
                </ul>
                <p>
                  Um incidente que chega sem aviso tira saúde na hora. Serviços sem estrago recuperam +{REGRAS.recuperacaoNatural} por hora.
                </p>
              </Bloco>
            </TabsContent>

            <TabsContent value="glossario" className="flex flex-col gap-5">
              <Bloco titulo="Siglas">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                  {Object.entries(GLOSSARIO).map(([s, g]) => (
                    <div key={s} className="contents">
                      <dt className="font-mono font-semibold text-foreground">{s}</dt>
                      <dd><span className="text-foreground">{g.nome}.</span> {g.texto}</dd>
                    </div>
                  ))}
                </dl>
              </Bloco>
              <Bloco titulo="Práticas ITIL no jogo">
                <ul className="flex flex-col gap-2">
                  {catalog.practices.map((p) => (
                    <li key={p.id} className="rounded-lg bg-muted/40 p-3">
                      <p className={forte}>{p.nome}</p>
                      <p><TextoComSiglas>{p.resumo}</TextoComSiglas> <em>No jogo:</em> <TextoComSiglas>{p.dicaJogo}</TextoComSiglas></p>
                    </li>
                  ))}
                </ul>
              </Bloco>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
