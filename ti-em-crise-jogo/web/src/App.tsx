import { LoaderCircle, ServerCrash } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { GameScreen } from '@/features/game/GameScreen'
import { HomeScreen } from '@/features/home/HomeScreen'
import { LobbyScreen } from '@/features/lobby/LobbyScreen'
import { PostMortemScreen } from '@/features/postmortem/PostMortemScreen'
import { RulesSheet } from '@/features/rules/RulesSheet'
import { useCatalog } from '@/lib/api'
import { useGame } from '@/store/game'

export default function App() {
  const { data, isPending, isError, error, refetch } = useCatalog()
  const { tela, estado, setCatalog } = useGame()

  useEffect(() => {
    if (data) setCatalog(data)
  }, [data, setCatalog])

  if (isPending) {
    return (
      <div className="grid min-h-svh place-items-center text-muted-foreground">
        <LoaderCircle className="size-8 animate-spin" aria-label="Carregando" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <ServerCrash className="size-12 text-down" />
          <h1 className="text-2xl font-semibold">Ironia: a TI caiu</h1>
          <p className="text-muted-foreground">
            Não consegui carregar o catálogo do jogo. Verifique se o servidor (<code>npm run dev</code>) e o MySQL
            estão rodando.
          </p>
          <code className="font-mono text-xs text-muted-foreground">{error.message}</code>
          <Button variant="outline" onClick={() => refetch()}>Tentar de novo</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {tela === 'home' && <HomeScreen catalog={data} />}
      {tela === 'lobby' && <LobbyScreen catalog={data} />}
      {tela === 'jogo' && estado && <GameScreen catalog={data} estado={estado} />}
      {tela === 'postmortem' && estado && <PostMortemScreen catalog={data} estado={estado} />}
      <RulesSheet catalog={data} />
    </>
  )
}
