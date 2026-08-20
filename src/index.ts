import 'dotenv/config'
import Fastify from 'fastify'
import sql from './db/client'
import { authRoutes } from './routes/auth'
import { walletRoutes } from './routes/wallet'
import { transfersRoutes } from './routes/transfers'

const app = Fastify({ logger: true })

const start = async () => {
  try {
    const res = await sql`SELECT 1`;
    app.log.info('Database connected');
    app.get('/health', async () => {
      return { status: 'ok', ...res }
    })
    app.register(authRoutes);
    app.register(walletRoutes);
    app.register(transfersRoutes);
  
    await app.listen({ port: Number(process.env.PORT) || 3000 });
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
