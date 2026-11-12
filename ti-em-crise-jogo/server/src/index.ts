import Fastify from 'fastify'
import { ZodError } from 'zod'
import { config } from './config.ts'
import { pool } from './db/pool.ts'
import { catalogRoutes } from './routes/catalog.ts'
import { sessionRoutes } from './routes/sessions.ts'

const app = Fastify({ logger: { level: 'info' } })

app.setErrorHandler((err, _req, reply) => {
  if (err instanceof ZodError) {
    return reply.code(400).send({ erro: 'Dados inválidos', detalhes: err.issues })
  }
  const e = err as { statusCode?: number; code?: string; message?: string }
  // Erros do próprio Fastify com status 4xx (ex.: JSON malformado)
  if (e.statusCode && e.statusCode < 500) return reply.code(e.statusCode).send({ erro: e.message })
  // FK inexistente (ex.: scenarioId ou roleId inválido)
  if (e.code === 'ER_NO_REFERENCED_ROW_2') return reply.code(400).send({ erro: 'Referência inválida' })
  app.log.error(err)
  return reply.code(500).send({ erro: 'Erro interno' })
})

app.get('/api/health', async () => {
  await pool.query('SELECT 1')
  return { status: 'ok' }
})

await app.register(catalogRoutes)
await app.register(sessionRoutes)

try {
  await app.listen({ port: config.port, host: '127.0.0.1' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
