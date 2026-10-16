import test from 'node:test'
import assert from 'node:assert/strict'
import { addItem } from '../src/services/addItemService.js'
import { POS, baseForm, setup } from './helpers/setup.mjs'

const add = (form, repo) => addItem(form, { positionName: POS }, repo)

test('Старлінк: KIT унікальний, роутер додається окремим записом', async () => {
  const { client, repo } = setup()
  const form = baseForm({ presetName: 'Старлінк', category: 'Зв\'язок', variant: 'Міні', kitNumbers: 'K-1', extraQty: '1' })
  const r = await add(form, repo)
  assert.equal(r.message, 'Додано «Старлінк — Міні», KIT K-1 і роутерів: 1')
  assert.deepEqual(r.formPatch, { notes: '', kitNumbers: '', extraQty: '' })
  assert.deepEqual(client.state.rows.map(x => x.item_name), ['Старлінк — Міні, KIT K-1', 'Роутер Старлінк'])
  const dup = await add({ ...form, variant: '3 версія', kitNumbers: 'k-1' }, repo)
  assert.equal(dup.message, `Такий KIT уже є: k-1 (${POS})`)
  assert.equal((await add({ ...form, kitNumbers: '' }, repo)).message, 'Вкажіть номер KIT')
  assert.equal((await add({ ...form, variant: '' }, repo)).message, 'Оберіть версію')
})

test('дрони: ім’я унікальне, з іменем завжди 1 шт.', async () => {
  const { client, repo } = setup()
  const form = baseForm({ presetName: 'Дрони', category: 'БПЛА', variant: 'Mavic 3T', callsign: ' «Панда» ', quantity: 5 })
  const r = await add(form, repo)
  assert.equal(r.message, 'Додано на позицію!')
  assert.equal(client.state.rows[0].item_name, 'Дрони — Mavic 3T "Панда"')
  assert.equal(client.state.rows[0].quantity, 1)
  const dup = await add({ ...form, status: 'Потреба' }, repo)
  assert.equal(dup.message, `Дрон з іменем «Панда» уже є: ${POS}`)
  assert.equal((await add({ ...form, variant: '' }, repo)).message, 'Оберіть модель дрона')
})

test('кабель: довжина відрізка', async () => {
  const { client, repo } = setup()
  const form = baseForm({ presetName: 'Кабель RG8', lengthM: '12.345', quantity: 3 })
  assert.equal((await add(form, repo)).message, 'Додано на позицію!')
  assert.equal(client.state.rows[0].item_name, 'Кабель RG8 — 12.35 м')
  const bad = await add({ ...form, lengthM: '0' }, repo)
  assert.equal(bad.message, 'Вкажіть довжину відрізка в метрах (більше 0)')
})

test('помилки бази повертаються з тими самими текстами', async () => {
  let s = setup([], { failOn: { op: 'insert', error: { code: '23505', message: 'violates items_unique_serial' } } })
  assert.equal((await add(baseForm(), s.repo)).message, 'Такий серійний номер / KIT уже є')
  s = setup([], { failOn: { op: 'insert', error: { code: '23505', message: 'pos_name_status' } } })
  assert.equal((await add(baseForm(), s.repo)).message, 'Такий запис уже є, оновіть сторінку')
  s = setup([], { failOn: { op: 'insert', error: { message: 'boom' } } })
  assert.equal((await add(baseForm(), s.repo)).message, 'Помилка бази: boom')
  s = setup([], { failOn: { op: 'select', error: { message: 'down' } } })
  assert.equal((await add(baseForm(), s.repo)).message, 'Помилка перевірки: down')
})
