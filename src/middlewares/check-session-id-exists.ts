import { FastifyReply, FastifyRequest } from 'fastify'
import { knex } from '../database'
import { Tables } from 'knex/types/tables'

export interface CustomFastifyRequest extends FastifyRequest {
  user?: Tables['users']
}

export async function checkSessionIdExists(
  request: CustomFastifyRequest,
  reply: FastifyReply,
) {
  const sessionId = request.cookies.sessionId

  if (!sessionId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const user = await knex('users')
    .select()
    .where({ session_id: sessionId })
    .first()

  if (!user) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  request.user = user
}
