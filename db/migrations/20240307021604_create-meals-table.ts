import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('meals', (table) => {
    table.uuid('id').primary()
    table.text('name').notNullable()
    table.text('description')
    table.dateTime('date').defaultTo(knex.fn.now()).notNullable()
    table.boolean('is_in_diet').defaultTo(false)
    table.uuid('user_id').unsigned()
    table.foreign('user_id').references('users.id').onDelete('CASCADE')
    table.timestamps(true, true)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('meals')
}
