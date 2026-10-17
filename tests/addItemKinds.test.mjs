import test from 'node:test'
import assert from 'node:assert/strict'
import { addItem } from '../src/services/addItemService.js'
import { POS, OTHER, baseForm, setup } from './helpers/setup.mjs'

const add = (form, repo) => addItem(form, { positionName: POS }, repo)

test('Старлінк: S/N з префіксом KIT унікальний, роутер додається окремим записом', async () => {
  const { client, repo } = setup()
  const form = baseForm({ presetName: 'Старлінк', category: 'З\'язок', variant: 'Міні', kitNumbers: 'KIT300', extraQty: '1' })
  const r = await add(form, repo)
  assert.equal(r.message, 'Додано «Старлінк — Міні», S/N KIT300 і роутерів: 1')
  assert.deepEqual(r.formPatch, { notes: '', kitNumbers: 'KIT', extraQty: '' })
  assert.deepEqual(client.state.rows.map(x => x.item_name), ['Старлінк — Міні, S/N KIT300', 'Роутер Старлінк'])
  assert.equal(client.state.rows[0].serial, 'KIT300')
  const dup = await add({ ...form, variant: '3 версія', kitNumbers: 'kit300' }, repo)
  assert.equal(dup.message, `Такий S/N уже є: KIT300 (${POS})`)
  assert.equal((await add({ ...form, kitNumbers: '' }, repo)).message, 'Вкажіть S/N')
  assert.equal((await add({ ...form, kitNumbers: 'KIT' }, repo)).message, 'Вкажіть S/N')
  assert.equal((await add({ ...form, variant: '' }, repo)).message, 'Оберіть версію')
  assert.equal((await add({ ...form, kitNumbers: 'KIT1,KIT2' }, repo)).message, 'Вводьте один S/N: кожен Старлінк додається окремо')
})

test('Старлінк: номер без префікса доповнюється «KIT», старий запис без префікса вважається тим самим номером', async () => {
  const { client, repo } = setup([
    { id: 1, position_name: POS, item_name: 'Старлінк — Міні, KIT 20000015486', category: 'З\'язок', status: 'На позиції', quantity: 1, notes: '', variant: null, brand: null, serial: null }
  ])
  const form = baseForm({ presetName: 'Старлінк', category: 'З\'язок', variant: 'Міні' })
  const old = await add({ ...form, kitNumbers: 'KIT20000015486' }, repo)
  assert.equal(old.message, `Такий S/N уже є: KIT20000015486 (${POS})`)
  const bare = await add({ ...form, kitNumbers: '20000015486' }, repo)
  assert.equal(bare.message, `Такий S/N уже є: KIT20000015486 (${POS})`)
  const fresh = await add({ ...form, kitNumbers: '777' }, repo)
  assert.equal(fresh.message, 'Додано «Старлінк — Міні», S/N KIT777')
  assert.equal(client.state.rows.at(-1).item_name, 'Старлінк — Міні, S/N KIT777')
})

test('дрони без імен: довільна кількість, однакова модель зливається', async () => {
  const { client, repo } = setup()
  const form = baseForm({ presetName: 'Дрони', category: 'БПЛА', variant: 'Mavic 3T', quantity: 5 })
  const r = await add(form, repo)
  assert.equal(r.message, 'Додано на позицію!')
  assert.deepEqual(r.formPatch, { notes: '', quantity: 1, callsign: '' })
  assert.equal(client.state.rows[0].item_name, 'Дрони — Mavic 3T')
  assert.equal(client.state.rows[0].quantity, 5)
  assert.match((await add({ ...form, quantity: 2 }, repo)).message, /тепер 7 шт\./)
  assert.equal(client.state.rows.length, 1)
  assert.equal((await add({ ...form, variant: '' }, repo)).message, 'Оберіть модель дрона')
  assert.equal((await add({ ...form, quantity: 1.5 }, repo)).message, 'Кількість має бути цілим числом')
  assert.equal((await add({ ...form, variant: 'Matrice', quantity: 2 }, repo)).message, 'Додано на позицію!')
  assert.equal(client.state.rows.at(-1).item_name, 'Дрони — Matrice')
})

test('дрони з іменами через кому: кожне ім’я — окремий дрон, решта — без імені', async () => {
  const { client, repo } = setup()
  const form = baseForm({ presetName: 'Дрони', category: 'БПЛА', variant: 'Mavic 3T', quantity: 5, callsign: ' «Панда», Лис ,, ' })
  const r = await add(form, repo)
  assert.equal(r.message, 'Додано на позицію: 5 шт., у тому числі з іменами: Панда, Лис')
  const byName = Object.fromEntries(client.state.rows.map(x => [x.item_name, x.quantity]))
  assert.deepEqual(byName, { 'Дрони — Mavic 3T "Панда"': 1, 'Дрони — Mavic 3T "Лис"': 1, 'Дрони — Mavic 3T': 3 })
  assert.equal(client.state.rows[0].variant, 'Mavic 3T "Панда"')
  assert.deepEqual(r.formPatch, { notes: '', quantity: 1, callsign: '' })
})

test('дрони: імен рівно стільки, скільки кількість: без рядка «без імені»', async () => {
  const { client, repo } = setup()
  const form = baseForm({ presetName: 'Дрони', category: 'БПЛА', variant: 'Matrice', quantity: 2, callsign: 'А, Б' })
  assert.equal((await add(form, repo)).message, 'Додано на позицію: 2 шт., у тому числі з іменами: А, Б')
  assert.deepEqual(client.state.rows.map(x => x.item_name), ['Дрони — Matrice "А"', 'Дрони — Matrice "Б"'])
})

test('дрони: перевірки імен — більше, ніж дронів; повтор у списку; ім’я вже є на іншій позиції', async () => {
  const { client, repo } = setup([
    { id: 1, position_name: OTHER, item_name: 'Дрони — Mavic 3T "Панда"', status: 'На позиції', quantity: 1, notes: '', variant: 'Mavic 3T "Панда"' }
  ])
  const form = baseForm({ presetName: 'Дрони', category: 'БПЛА', variant: 'Mavic 3T', quantity: 3 })
  assert.equal((await add({ ...form, quantity: 1, callsign: 'А, Б' }, repo)).message, 'Імен більше, ніж дронів: 2 імен на 1 шт. Збільште кількість або приберіть імена')
  assert.equal((await add({ ...form, callsign: 'А, а' }, repo)).message, "Ім'я «А» вказано кілька разів")
  assert.equal((await add({ ...form, callsign: 'А, Панда' }, repo)).message, `Дрон з іменем «Панда» уже є: ${OTHER}`)
  // нічого не додано: усі перевірки до запису («А» було ближче до початку списку)
  assert.equal(client.state.rows.length, 1)
})

test('дрони: іменні та безіменні додаються до наявного рядка моделі', async () => {
  const { client, repo } = setup([
    { id: 1, position_name: POS, item_name: 'Дрони — Mavic 3T', status: 'На позиції', quantity: 2, notes: '', variant: 'Mavic 3T' }
  ])
  const form = baseForm({ presetName: 'Дрони', category: 'БПЛА', variant: 'Mavic 3T', quantity: 4, callsign: 'Лис' })
  const r = await add(form, repo)
  assert.match(r.message, /тепер 5 шт\./)
  assert.match(r.message, /Іменних дронів додано: 1/)
  const byName = Object.fromEntries(client.state.rows.map(x => [x.item_name, x.quantity]))
  assert.deepEqual(byName, { 'Дрони — Mavic 3T': 5, 'Дрони — Mavic 3T "Лис"': 1 })
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
  assert.equal((await add(baseForm(), s.repo)).message, 'Такий серійний номер уже є')
  s = setup([], { failOn: { op: 'insert', error: { code: '23505', message: 'pos_name_status' } } })
  assert.equal((await add(baseForm(), s.repo)).message, 'Такий запис уже є, оновіть сторінку')
  s = setup([], { failOn: { op: 'insert', error: { message: 'boom' } } })
  assert.equal((await add(baseForm(), s.repo)).message, 'Помилка бази: boom')
  s = setup([], { failOn: { op: 'select', error: { message: 'down' } } })
  assert.equal((await add(baseForm(), s.repo)).message, 'Помилка перевірки: down')
})

test('лопасті: модель необхідна, кількість рахується штуками, однакова модель зливається', async () => {
  const { client, repo } = setup()
  const form = baseForm({ presetName: 'Лопасті', category: 'БПЛА', variant: 'Matrice', quantity: 4 })
  assert.equal((await add({ ...form, variant: '' }, repo)).message, 'Оберіть модель')
  assert.equal((await add(form, repo)).message, 'Додано на позицію!')
  assert.equal(client.state.rows[0].item_name, 'Лопасті — Matrice')
  assert.equal(client.state.rows[0].quantity, 4)
  assert.equal((await add({ ...form, quantity: 2 }, repo)).message, 'Таке майно вже є: кількість збільшено, тепер 6 шт.')
  assert.equal((await add({ ...form, variant: 'Outel', quantity: 1 }, repo)).message, 'Додано на позицію!')
  assert.equal(client.state.rows.length, 2)
})

test('редагування одного дрона не змінилось: ім’я лише одному, кількість > 1 з ім’ям відхиляється', async () => {
  const { saveEdit } = await import('../src/services/editItemService.js')
  const { editFormFromItem } = await import('../src/services/editFormService.js')
  const { presetOf } = await import('../src/domain/catalog.js')
  const item = { id: 1, position_name: POS, item_name: 'Дрони — Mavic 3T', category: 'БПЛА', status: 'На позиції', quantity: 3, notes: '', variant: 'Mavic 3T', brand: null, serial: null }
  const { repo } = setup([item])
  const r = await saveEdit(item, presetOf(item.item_name), { ...editFormFromItem(item), callsign: 'Лис' }, { confirm: () => true }, repo)
  assert.equal(r.message, 'Дрон з іменем один: спершу зменште кількість до 1')
})
