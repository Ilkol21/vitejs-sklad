import test from 'node:test'
import assert from 'node:assert/strict'
import { addItem } from '../src/services/addItemService.js'
import { POS, OTHER, baseForm, setup } from './helpers/setup.mjs'

const add = (form, repo) => addItem(form, { positionName: POS }, repo)

test('простий предмет додається новим рядком', async () => {
  const { client, repo } = setup()
  const r = await add(baseForm({ quantity: 2, notes: 'ок' }), repo)
  assert.equal(r.message, 'Додано на позицію!')
  assert.equal(r.reload, true)
  assert.equal(r.formPatch.quantity, 1)
  assert.equal(client.state.rows.length, 1)
  assert.equal(client.state.rows[0].quantity, 2)
  assert.equal(client.state.rows[0].item_name, 'Генератор')
})

test('те саме майно зі статусом зливається, примітки об’єднуються', async () => {
  const { client, repo } = setup([
    { id: 1, position_name: POS, item_name: 'Генератор', status: 'На позиції', quantity: 2, notes: 'a' }
  ])
  const r = await add(baseForm({ quantity: 3, notes: 'b' }), repo)
  assert.equal(r.message, 'Таке майно вже є: кількість збільшено, тепер 5 шт.')
  assert.equal(client.state.rows.length, 1)
  assert.equal(client.state.rows[0].quantity, 5)
  assert.equal(client.state.rows[0].notes, 'a; b')
})

test('нуль до наявного не додається', async () => {
  const { repo } = setup([
    { id: 1, position_name: POS, item_name: 'Генератор', status: 'На позиції', quantity: 2, notes: '' }
  ])
  const r = await add(baseForm({ quantity: 0 }), repo)
  assert.equal(r.isError, true)
  assert.match(r.message, /^Уже є: 2 шт\./)
})

test('дробова кількість для штучного майна відхиляється, для літрів дозволена', async () => {
  const { client, repo } = setup()
  const bad = await add(baseForm({ quantity: 1.5 }), repo)
  assert.equal(bad.message, 'Кількість має бути цілим числом')
  const ok = await add(baseForm({ presetName: 'Бензин', category: 'Витратні матеріали', quantity: 1.5 }), repo)
  assert.equal(ok.message, 'Додано на позицію!')
  assert.equal(client.state.rows[0].quantity, 1.5)
})

test('«Є / Немає» оновлює наявний рядок', async () => {
  const { client, repo } = setup([
    { id: 1, position_name: POS, item_name: 'Світло', status: 'На позиції', quantity: 1, notes: '' }
  ])
  const r = await add(baseForm({ presetName: 'Світло', quantity: 0 }), repo)
  assert.equal(r.message, 'Світло: немає')
  assert.equal(client.state.rows[0].quantity, 0)
})

test('рація: серійний номер унікальний на всіх позиціях, регістр не важливий', async () => {
  const { client, repo } = setup([
    { id: 1, position_name: OTHER, item_name: 'Рація — Motorola, S/N ab1', status: 'На позиції',
      quantity: 1, notes: '', brand: 'Motorola', serial: 'ab1', variant: null }
  ])
  const form = baseForm({ presetName: 'Рація', brand: 'motorola', serial: 'AB1' })
  const dup = await add(form, repo)
  assert.equal(dup.message, `Такий серійний номер уже є: ${OTHER}`)
  const ok = await add({ ...form, serial: 'AB2', extraQty: '2' }, repo)
  assert.equal(ok.message, 'Додано на позицію! + павуків: 2')
  const names = client.state.rows.map(r => r.item_name)
  assert.deepEqual(names, ['Рація — Motorola, S/N ab1', 'Рація — motorola, S/N AB2', 'Павук'])
  assert.equal(client.state.rows[2].quantity, 2)
})

test('валідація серійного майна', async () => {
  const { repo } = setup()
  const p = 'Рація'
  assert.equal((await add(baseForm({ presetName: p }), repo)).message, 'Вкажіть марку')
  assert.equal((await add(baseForm({ presetName: p, brand: 'M' }), repo)).message, 'Вкажіть серійний номер')
  assert.equal((await add(baseForm({ presetName: p, brand: 'M', serial: '1,2' }), repo)).message,
    'Вводьте один серійний номер без ком: кожна одиниця додається окремо')
  assert.equal((await add(baseForm({ presetName: p, brand: 'M', serial: '1', extraQty: '1.5' }), repo)).message,
    'Кількість павуків має бути цілим числом')
  assert.equal((await add(baseForm({ presetName: 'Планшети', brand: 'N', serial: '1' }), repo)).message, 'Вкажіть модель')
  assert.equal((await add(baseForm({ presetName: 'Планшети', serial: '1' }), repo)).message, 'Вкажіть назву пристрою')
})
