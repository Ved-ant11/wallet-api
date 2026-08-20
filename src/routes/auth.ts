import { FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import sql from '../db/client.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const authRoutes = (app: FastifyInstance) => {
  app.post('/auth/register', async (req, reply) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
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
    } catch (err: any) {
      if (err.code === '23505') {
        return reply.status(409).send({ message: 'Email already exists' });
      }
      throw err;
    }
  });

  app.post('/auth/login', async (req, reply) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return reply.status(400).send(result.error)
    }
    const { email, password } = result.data;
    const user = await sql<{ user_id: string, password_hash: string }[]>`
      SELECT user_id, password_hash
      FROM wallet.users
      WHERE email = ${email}
    `
    if (user.length === 0) {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }
    const [foundUser] = user;
    const passwordMatch = await bcrypt.compare(password, foundUser.password_hash);
    if (!passwordMatch) {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ user_id: foundUser.user_id }, process.env.JWT_SECRET as string);
    return reply.status(200).send({ user_id: foundUser.user_id, token });
  });
}