import { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'

declare module 'fastify' {
  interface FastifyRequest {
    user: { user_id: string }
  }
}

export const authenticate = async (req: FastifyRequest, reply: FastifyReply) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return reply.status(401).send({ message: 'No authorization header' });
  }
  const token = authHeader.split(' ')[1]
  if (!token) {
    return reply.status(401).send({ message: 'No token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string)
    req.user = decoded as { user_id: string }
  } catch (err) {
    return reply.status(401).send({ message: 'Invalid or expired token' })
  }
}
