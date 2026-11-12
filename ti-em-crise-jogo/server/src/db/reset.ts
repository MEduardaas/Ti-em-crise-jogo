// Recria o banco do zero: DROP + db/schema.sql + db/seed.sql
// Uso: npm run db:reset   (apaga também o histórico de partidas)
import { readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'
import { config } from '../config.ts'

const dbDir = new URL('../../../db/', import.meta.url)
const { database, ...conn } = config.db

const connection = await mysql.createConnection({ ...conn, multipleStatements: true })
try {
  const schema = await readFile(new URL('schema.sql', dbDir), 'utf8')
  const seed = await readFile(new URL('seed.sql', dbDir), 'utf8')

  console.log(`Recriando o banco "${database}"...`)
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``)
  await connection.query(schema)
  await connection.query(seed)

  const [rows] = await connection.query(
    `SELECT table_name AS tabela, table_rows AS linhas
       FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name`,
    [database],
  )
  console.table(rows)
  console.log('Banco pronto.')
} finally {
  await connection.end()
}
