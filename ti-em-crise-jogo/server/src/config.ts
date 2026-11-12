import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const envPath = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(envPath)) process.loadEnvFile(envPath)

export const config = {
  port: Number(process.env.PORT ?? 3333),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'ti_em_crise',
  },
}
