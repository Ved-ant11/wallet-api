import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate'
import sql from '../db/client.js'

export const walletRoutes = (app: FastifyInstance) => {
  app.get('/wallet/balance', { preHandler: authenticate }, async (req, reply) => {
    // req.user.user_id from the authenticate middleware
    const userId = req.user.user_id
    const details = await sql<{ wallet_id: string, balance: number }[]>`
      select wallet_id, balance
      from wallet.wallets
      where user_id = ${userId}
      `
    if(details.length === 0) {
      return reply.status(404).send({ error: 'Wallet not found' })
    }
    return { balance: details[0].balance, wallet_id: details[0].wallet_id }
  });
}
