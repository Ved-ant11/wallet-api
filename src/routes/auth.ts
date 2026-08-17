import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import sql from '../db/client.js'
import { th } from 'zod/v4/locales'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const authRoutes = (app: FastifyInstance) => {
  app.post('/auth/register', async (req, reply) => {
    const result = registerSchema.safeParse(req.body);
    if(!result.success) {
      return reply.status(400).send(result.error)
    }
    const { email, password } = result.data;
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const user = await sql.begin(async (tx) => {
        const [newUser] = await tx<{ user_id: string }[]>`
          INSERT INTO wallet.users (email, password_hash)
          VALUES (${email}, ${passwordHash})
          RETURNING user_id
        `
        await tx`
          INSERT INTO wallet.wallets (user_id)
          VALUES (${newUser.user_id})
        `
        return newUser;
      });
      return reply.status(201).send({ user_id: user.user_id, email });
    } catch (err:any) {
      if(err.code === '23505') {
        return reply.status(409).send({ message: 'Email already exists' });
      }
      throw err;
    }
  })
}