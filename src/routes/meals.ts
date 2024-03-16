import { format } from 'date-fns'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { knex } from '../database'
import {
  CustomFastifyRequest,
  checkSessionIdExists,
} from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.get(
    '/',
    { preHandler: [checkSessionIdExists] },
    async (request: CustomFastifyRequest) => {
      const userId = request.user!.id

      const meals = await knex('meals').select().where({ user_id: userId })

      return { meals }
    },
  )

  app.get(
    '/:mealId',
    { preHandler: [checkSessionIdExists] },
    async (request: CustomFastifyRequest, reply) => {
      const getTransactionsParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      const { mealId } = getTransactionsParamsSchema.parse(request.params)

      const userId = request.user!.id

      const meal = await knex('meals')
        .select()
        .where({ id: mealId, user_id: userId })
        .first()

      if (!meal) {
        return reply.code(404).send('Meal not found')
      }

      return meal
    },
  )

  app.get(
    '/metrics',
    { preHandler: [checkSessionIdExists] },
    async (request: CustomFastifyRequest, reply) => {
      const userId = request.user!.id

      const totalMeals = await knex('meals')
        .where({ user_id: request.user?.id })
        .orderBy('date', 'desc')

      const totalMealsInDiet = await knex('meals')
        .where({ user_id: userId, is_in_diet: true })
        .count('id', { as: 'total' })
        .first()

      const totalMealsOffDiet = await knex('meals')
        .where({ user_id: userId, is_in_diet: false })
        .count('id', { as: 'total' })
        .first()

      const { bestInDietSequence } = totalMeals.reduce(
        (acc, meal) => {
          if (meal.is_in_diet) {
            acc.currentSequence += 1
          } else {
            acc.currentSequence = 0
          }

          if (acc.currentSequence > acc.bestInDietSequence) {
            acc.bestInDietSequence = acc.currentSequence
          }

          return acc
        },
        { bestInDietSequence: 0, currentSequence: 0 },
      )

      const resumeData = {
        totalMeals: totalMeals.length,
        totalMealsInDiet: totalMealsInDiet?.total,
        totalMealsOffDiet: totalMealsOffDiet?.total,
        bestInDietSequence,
      }

      reply.send(resumeData)
    },
  )

  app.post(
    '/',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const createMealsBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        date: z.coerce.date().optional(),
        isInDiet: z.boolean(),
      })

      const { name, description, isInDiet, date } = createMealsBodySchema.parse(
        request.body,
      )

      const user = await knex('users')
        .select('id')
        .where({
          session_id: request.cookies.sessionId,
        })
        .first()

      const formattedDate = date ? format(date, 'yyyy-MM-dd HH:mm:ss') : null

      await knex('meals').insert({
        id: randomUUID(),
        user_id: user!.id,
        name,
        ...(formattedDate && { date: formattedDate }),
        description,
        is_in_diet: isInDiet,
      })

      return reply.status(201).send()
    },
  )

  app.put(
    '/:mealId',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getTransactionsParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      const { mealId } = getTransactionsParamsSchema.parse(request.params)

      const user = await knex('meals')
        .join('users', 'meals.user_id', 'users.id')
        .select('users.session_id')
        .where('meals.id', mealId)
        .first()

      if (!user) return reply.code(404).send('Meal not found')

      if (user.session_id !== request.cookies.sessionId)
        return reply.code(401).send('Unauthorized')

      const updateMealsBodySchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        date: z.coerce.date().optional(),
        isInDiet: z.boolean().optional(),
      })

      const { name, description, isInDiet, date } = updateMealsBodySchema.parse(
        request.body,
      )

      const formattedDate = date ? format(date, 'yyyy-MM-dd HH:mm:ss') : null

      if (name || description || isInDiet !== undefined || date) {
        await knex('meals')
          .update({
            ...(name && { name }),
            ...(formattedDate && { date: formattedDate }),
            ...(description && { description }),
            ...(isInDiet !== undefined && { is_in_diet: isInDiet }),
            updated_at: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          })
          .where({
            id: mealId,
          })
      }
    },
  )

  app.delete(
    '/:mealId',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getTransactionsParamsSchema = z.object({
        mealId: z.string().uuid(),
      })

      const { mealId } = getTransactionsParamsSchema.parse(request.params)

      const user = await knex('meals')
        .join('users', 'meals.user_id', 'users.id')
        .select('users.session_id')
        .where('meals.id', mealId)
        .first()

      if (!user) return reply.code(404).send('Meal not found')

      if (user.session_id !== request.cookies.sessionId)
        return reply.code(401).send('Unauthorized')

      await knex('meals').delete().where({ id: mealId })
    },
  )
}
