import { randomInt, randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { z } from 'zod'
import type { RankingEntry } from '../../../shared/catalog.ts'
import { pool } from '../db/pool.ts'

const createSession = z.object({
  scenarioId: z.string().min(1),
  nomeEquipe: z.string().trim().min(1).max(60),
  seed: z.number().int().nonnegative().optional(),
  jogadores: z
    .array(z.object({ nome: z.string().trim().min(1).max(40), roleId: z.string().min(1) }))
    .min(2)
    .max(6),
})

const roundSnapshot = z.object({
  rodada: z.number().int().min(1),
  saudeGeral: z.number().min(0).max(100),
  confianca: z.number().min(0).max(100),
  saudeServicos: z.record(z.string(), z.number().min(0).max(100)),
})

const finishSession = z.object({
  status: z.enum(['VITORIA', 'DERROTA']),
  confiancaFinal: z.number().int().min(0).max(100),
  saudeGeralMedia: z.number().min(0).max(100),
  slaCumpridoPct: z.number().min(0).max(100),
  estrelas: z.number().int().min(0).max(3),
})

const idParam = z.object({ id: z.uuid() })

export async function sessionRoutes(app: FastifyInstance) {
  // Cria uma partida com seus jogadores
  app.post('/api/sessions', async (req, reply) => {
    const body = createSession.parse(req.body)
    const id = randomUUID()
    const seed = body.seed ?? randomInt(0, 2 ** 31)

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query(
        'INSERT INTO game_session (id, scenario_id, nome_equipe, seed) VALUES (?, ?, ?, ?)',
        [id, body.scenarioId, body.nomeEquipe, seed],
      )
      await conn.query('INSERT INTO session_player (session_id, nome, role_id) VALUES ?', [
        body.jogadores.map((j) => [id, j.nome, j.roleId]),
      ])
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
    return reply.code(201).send({ id, seed })
  })

  // Registra a foto de uma rodada (para os gráficos do post-mortem)
  app.post('/api/sessions/:id/rounds', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const body = roundSnapshot.parse(req.body)
    await pool.query(
      `INSERT INTO session_round_snapshot (session_id, rodada, saude_geral, confianca, saude_servicos)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE saude_geral = VALUES(saude_geral), confianca = VALUES(confianca),
                               saude_servicos = VALUES(saude_servicos)`,
      [id, body.rodada, body.saudeGeral, body.confianca, JSON.stringify(body.saudeServicos)],
    )
    await pool.query('UPDATE game_session SET rodada_atual = ? WHERE id = ?', [body.rodada, id])
    return reply.code(204).send()
  })

  // Encerra a partida com o resultado final
  app.post('/api/sessions/:id/finish', async (req, reply) => {
    const { id } = idParam.parse(req.params)
    const body = finishSession.parse(req.body)
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE game_session
          SET status = ?, confianca_final = ?, saude_geral_media = ?, sla_cumprido_pct = ?, estrelas = ?,
              finalizado_em = NOW()
        WHERE id = ? AND status = 'EM_ANDAMENTO'`,
      [body.status, body.confiancaFinal, body.saudeGeralMedia, body.slaCumpridoPct, body.estrelas, id],
    )
    if (result.affectedRows === 0) return reply.code(404).send({ erro: 'Partida não encontrada ou já encerrada' })
    return reply.code(204).send()
  })

  // Ranking das melhores equipes (opcionalmente por cenário)
  app.get('/api/ranking', async (req) => {
    const { scenarioId } = z.object({ scenarioId: z.string().optional() }).parse(req.query)
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, nome_equipe AS nomeEquipe, scenario_id AS scenarioId, status, estrelas,
              confianca_final AS confiancaFinal, saude_geral_media AS saudeGeralMedia,
              sla_cumprido_pct AS slaCumpridoPct, finalizado_em AS finalizadoEm
         FROM game_session
        WHERE status <> 'EM_ANDAMENTO' AND (? IS NULL OR scenario_id = ?)
        ORDER BY status = 'VITORIA' DESC, estrelas DESC, confianca_final DESC, saude_geral_media DESC
        LIMIT 10`,
      [scenarioId ?? null, scenarioId ?? null],
    )
    return rows as RankingEntry[]
  })
}
