import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import request from 'supertest'
import { app } from '../src/app'

beforeAll(async () => {
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  execSync('npm run knex migrate:rollback --all')
  execSync('npm run knex migrate:latest')
})

describe('User routes', () => {
  it('should be able to create a new user', async () => {
    await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'john@dev.com',
      })
      .expect(201)
  })
})

describe('Meals routes', () => {
  it('should be able to create a new meal', async () => {
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'john@dev.com',
      })
      .expect(201)

    const cookies = createUserResponse.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Pão integral',
        description: 'Café da manhã',
        isInDiet: true,
      })
      .expect(201)
  })

  it('should be able to update a meal', async () => {
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'john@dev.com',
      })
      .expect(201)

    const cookies = createUserResponse.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Pão integral',
        description: 'Café da manhã',
        isInDiet: true,
      })
      .expect(201)

    const mealsList = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    const mealId = mealsList.body.meals[0].id

    await request(app.server)
      .put(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .send({
        isInDiet: false,
      })
      .expect(200)
  })

  it('should be able to delete a meal', async () => {
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'john@dev.com',
      })
      .expect(201)

    const cookies = createUserResponse.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Pão integral',
        description: 'Café da manhã',
        isInDiet: true,
      })
      .expect(201)

    const mealsList = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    const mealId = mealsList.body.meals[0].id

    await request(app.server)
      .del(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(200)
  })

  it('should be able to list all meals', async () => {
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'john@dev.com',
      })
      .expect(201)

    const cookies = createUserResponse.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Pão integral',
        description: 'Café da manhã',
        isInDiet: true,
      })
      .expect(201)

    await request(app.server).get('/meals').set('Cookie', cookies).expect(200)
  })

  it('should be able to get specific meal', async () => {
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'john@dev.com',
      })
      .expect(201)

    const cookies = createUserResponse.get('Set-Cookie')

    await request(app.server)
      .post('/meals')
      .set('Cookie', cookies)
      .send({
        name: 'Pão integral',
        description: 'Café da manhã',
        isInDiet: true,
      })
      .expect(201)

    const mealsList = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    const mealId = mealsList.body.meals[0].id

    await request(app.server)
      .get(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(200)
  })

  it('should be able to get metrics of meals', async () => {
    const createUserResponse = await request(app.server)
      .post('/users')
      .send({
        name: 'John Doe',
        email: 'john@dev.com',
      })
      .expect(201)

    const cookies = createUserResponse.get('Set-Cookie')

    const mealsToCreate = [
      {
        name: 'Pão integral',
        description: 'Café da manhã',
        isInDiet: true,
      },
      {
        name: 'Whey',
        description: '',
        isInDiet: true,
      },
      {
        name: 'Hamburguer',
        description: 'Hamburguer do Clésio',
        isInDiet: false,
      },
    ]

    for (const meal of mealsToCreate) {
      await request(app.server)
        .post('/meals')
        .set('Cookie', cookies)
        .send(meal)
        .expect(201)
    }

    const metricsResponse = await request(app.server)
      .get('/meals/metrics')
      .set('Cookie', cookies)
      .expect(200)

    expect(metricsResponse.body).toEqual({
      totalMeals: 3,
      totalMealsInDiet: 2,
      totalMealsOffDiet: 1,
      bestInDietSequence: 2,
    })
  })
})
