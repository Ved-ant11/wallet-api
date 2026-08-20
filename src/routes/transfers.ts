import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../middleware/authenticate.js'
import sql from '../db/client.js'

const transferSchema = z.object({
  amount: z.number().positive().multipleOf(0.01),
  receiver_wallet_id: z.string().uuid(),
  idempotencyKey: z.string(),
})

export const transfersRoutes = async (app: FastifyInstance) => {
  app.post('/transfers', { preHandler: authenticate }, async (req, reply) => {
    const result = transferSchema.safeParse(req.body)
    if (!result.success) {
      return reply.status(400).send(result.error)
    }
    const { amount, receiver_wallet_id, idempotencyKey } = result.data
    const userId = req.user.user_id

    try {
      const [existing] = await sql`
        SELECT response FROM wallet.idempotency_keys
        WHERE key = ${idempotencyKey} AND user_id = ${userId}
      ` as { response: any }[];
      
      if (existing) {
        return reply.status(200).send(existing.response)
      }
      
      const transfer = await sql.begin(async (tx) => {
        // lock sender wallet row
        const [senderWallet] = await tx`
          SELECT wallet_id, balance
          FROM wallet.wallets
          WHERE user_id = ${userId}
          FOR UPDATE
        ` as { wallet_id: string, balance: string }[]

        // check receiver wallet exists
        const [receiverWallet] = await tx`
          SELECT wallet_id
          FROM wallet.wallets
          WHERE wallet_id = ${receiver_wallet_id}
        ` as { wallet_id: string }[]

        if (!receiverWallet) {
          throw { statusCode: 404, message: 'Receiver wallet not found' }
        }

        if (senderWallet.wallet_id === receiver_wallet_id) {
          throw { statusCode: 422, message: 'Cannot transfer to your own wallet' }
        }

        if (parseFloat(senderWallet.balance) < amount) {
          throw { statusCode: 422, message: 'Insufficient balance' }
        }

        // insert transfer record first — need transfer_id for transactions
        const [newTransfer] = await tx`
          INSERT INTO wallet.transfers (sender_wallet_id, receiver_wallet_id, amount, status)
          VALUES (${senderWallet.wallet_id}, ${receiver_wallet_id}, ${amount}, 'success')
          RETURNING transfer_id
        ` as { transfer_id: string }[]

        // deduct from sender
        await tx`
          UPDATE wallet.wallets
          SET balance = balance - ${amount}
          WHERE wallet_id = ${senderWallet.wallet_id}
        `

        // add to receiver
        await tx`
          UPDATE wallet.wallets
          SET balance = balance + ${amount}
          WHERE wallet_id = ${receiver_wallet_id}
        `
        await tx`
          INSERT INTO wallet.transactions (wallet_id, type, amount, reference_id, status)
          VALUES (${senderWallet.wallet_id}, 'debit', ${amount}, ${newTransfer.transfer_id}, 'success')
        `
        await tx`
          INSERT INTO wallet.transactions (wallet_id, type, amount, reference_id, status)
          VALUES (${receiver_wallet_id}, 'credit', ${amount}, ${newTransfer.transfer_id}, 'success')
        `

        const response = {
          transfer_id: newTransfer.transfer_id,
          amount,
          status: 'success',
        }
        
        await tx`
          INSERT INTO wallet.idempotency_keys (key, user_id, response)
          VALUES (${idempotencyKey}, ${userId}, ${JSON.stringify(response)})
        `
        return response;
      })

      return reply.status(201).send(transfer)
    } catch (err: any) {
      if (err.statusCode) {
        return reply.status(err.statusCode).send({ message: err.message })
      }
      throw err
    }
  })
}
