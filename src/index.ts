import 'dotenv/config'
import Fastify from 'fastify'
import sql from './db/client'

const app = Fastify({ logger: true })

const start = async () => {
  try {
    const res = await sql`SELECT 1`;
    app.log.info('Database connected');
    app.get('/health', async () => {
      return { status: 'ok', ...res }
    })
    await app.listen({ port: Number(process.env.PORT) || 3000 })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
