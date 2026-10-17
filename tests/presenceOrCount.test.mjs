import test from 'node:test'
import assert from 'node:assert/strict'
import { addItem } from '../src/services/addItemService.js'
import { saveEdit } from '../src/services/editItemService.js'
import { editFormFromItem } from '../src/services/editFormService.js'
import { changeStatus } from '../src/services/itemActionsService.js'
import { buildReportRows, buildSummaryRows } from '../src/domain/report.js'
import { presetOf, isPresenceRow, qtyText } from '../src/domain/catalog.js'
import { POS, baseForm, setup } from './helpers/setup.mjs'

const add = (form, repo) => addItem(form, { positionName: POS }, repo)
const blades = (over = {}) => baseForm({ presetName: 'Лопасті', category: 'БПЛА', variant: 'Matrice', noCount: false, ...over })
const row = (id, over = {}) => ({
  id, position_name: POS, item_name: 'Лопасті — Matrice', category: 'БПЛА', status: 'На позиції',
  quantity: 1, notes: '', variant: 'Matrice', brand: null, serial: null, no_count: false, ...over
})

test('«просто є» додається без кількості: прапорець no_count, кількість 1', async () => {
  const { client, repo } = setup()
  const r = await add(blades({ noCount: true, quantity: 7 }), repo)
  assert.equal(r.message, 'Додано на позицію!')
  assert.equal(client.state.rows[0].no_count, true)
  assert.equal(client.state.rows[0].quantity, 1)
  const none = await add(blades({ variant: 'Outel', noCount: true, quantity: 0 }), repo)
  assert.equal(none.message, 'Додано на позицію!')
  assert.equal(client.state.rows[1].quantity, 0)
})

test('з кількістю: прапорець не виставляється, кількість зберігається', async () => {
  const { client, repo } = setup()
  await add(blades({ quantity: 4 }), repo)
  assert.equal(client.state.rows[0].quantity, 4)
  assert.notEqual(client.state.rows[0].no_count, true)
})

test('«просто є» зливається з «просто є» без накопичення штук, а з кількістю — відмова без збитку даних', async () => {
  const { client, repo } = setup([row(1, { no_count: true, quantity: 1 })])
  const same = await add(blades({ noCount: true, quantity: 0 }), repo)
  assert.equal(same.message, 'Лопасті — Matrice: немає')
  assert.equal(client.state.rows[0].quantity, 0)
  const mixed = await add(blades({ noCount: false, quantity: 3 }), repo)
  assert.equal(mixed.isError, true)
  assert.match(mixed.message, /уже є як «Є \/ Немає»/)
  assert.equal(client.state.rows.length, 1)
  assert.equal(client.state.rows[0].quantity, 0)
})

test('з кількістю зливається з кількістю, а «просто є» не затирає рахунок', async () => {
  const { client, repo } = setup([row(1, { quantity: 4 })])
  assert.match((await add(blades({ quantity: 2 }), repo)).message, /тепер 6 шт\./)
  const refuse = await add(blades({ noCount: true }), repo)
  assert.equal(refuse.isError, true)
  assert.match(refuse.message, /^Уже є з кількістю: 6 шт\./)
  assert.equal(client.state.rows[0].quantity, 6)
})

test('редагування: перемикання між «просто є» і кількістю', async () => {
  const item = row(1, { quantity: 5 })
  const { client, repo } = setup([item])
  const preset = presetOf(item.item_name)
  const ok = { confirm: () => true }
  const toPresence = await saveEdit(item, preset, { ...editFormFromItem(item), noCount: true }, ok, repo)
  assert.equal(toPresence.message, 'Зміни збережено')
  assert.equal(client.state.rows[0].no_count, true)
  assert.equal(client.state.rows[0].quantity, 1)
  const back = client.state.rows[0]
  await saveEdit(back, preset, { ...editFormFromItem(back), noCount: false }, ok, repo)
  assert.equal(client.state.rows[0].no_count, false)
  assert.equal(client.state.rows[0].quantity, 1)
})

test('старий рядок «Лопасті» без моделі можна зберігати без вибору моделі, а з моделлю — перейменовується', async () => {
  const legacy = row(1, { item_name: 'Лопасті', variant: null, no_count: true, quantity: 1, notes: 'стара' })
  const { client, repo } = setup([legacy])
  const preset = presetOf(legacy.item_name)
  const form = editFormFromItem(legacy)
  assert.equal(form.noCount, true)
  const keep = await saveEdit(legacy, preset, { ...form, notes: 'нова' }, { confirm: () => true }, repo)
  assert.equal(keep.message, 'Зміни збережено')
  assert.equal(client.state.rows[0].item_name, 'Лопасті')
  assert.equal(client.state.rows[0].notes, 'нова')
  assert.equal(client.state.rows[0].no_count, true)
  await saveEdit(client.state.rows[0], preset, { ...form, variant: 'Outel' }, { confirm: () => true }, repo)
  assert.equal(client.state.rows[0].item_name, 'Лопасті — Outel')
})

test('зміна статусу: «є» з «є» — максимум, кількість з кількістю — сума, змішане — відмова', async () => {
  const a = row(1, { no_count: true, quantity: 1 })
  const b = row(2, { no_count: true, quantity: 0, status: 'На ремонт' })
  let s = setup([a, b])
  const r1 = await changeStatus(a, 'На ремонт', s.repo)
  assert.equal(r1.message, "Об'єднано з наявним рядком: тепер є")
  assert.equal(s.client.state.rows.length, 1)
  const c = row(3, { quantity: 2 })
  const d = row(4, { quantity: 3, status: 'На ремонт' })
  s = setup([c, d])
  assert.equal((await changeStatus(c, 'На ремонт', s.repo)).message, "Об'єднано з наявним рядком: тепер 5 шт.")
  const e = row(5, { no_count: true, quantity: 1 })
  const f = row(6, { quantity: 3, status: 'На ремонт' })
  s = setup([e, f])
  const mixed = await changeStatus(e, 'На ремонт', s.repo)
  assert.equal(mixed.isError, true)
  assert.equal(s.client.state.rows.length, 2)
})

test('Excel: «просто є» — у колонці «Наявність», з кількістю — у «Кількість» і «Од.»', () => {
  const rows = [
    row(1, { variant: 'Matrice', item_name: 'Лопасті — Matrice', no_count: true, quantity: 1 }),
    row(2, { variant: 'Outel', item_name: 'Лопасті — Outel', quantity: 6 }),
    row(3, { variant: 'Mavic 4 Pro', item_name: 'Лопасті — Mavic 4 Pro', no_count: true, quantity: 0 })
  ]
  const out = Object.fromEntries(buildReportRows(rows).map(r => [r['Вид / модель / назва'], r]))
  assert.deepEqual([out['Matrice']['Кількість'], out['Matrice']['Од.'], out['Matrice']['Наявність']], ['', '', 'Є'])
  assert.deepEqual([out['Outel']['Кількість'], out['Outel']['Од.'], out['Outel']['Наявність']], [6, 'шт.', ''])
  assert.deepEqual([out['Mavic 4 Pro']['Кількість'], out['Mavic 4 Pro']['Наявність']], ['', 'НЕМАЄ'])
  const sum = Object.fromEntries(buildSummaryRows(rows, true).map(g => [g['Вид / марка'], g]))
  assert.equal(sum['Matrice']['На позиції'], '')
  assert.equal(sum['Matrice']['Наявність'], 'Є')
  assert.equal(sum['Outel']['Разом є'], 6)
})

test('текст кількості та прапорець рядка', () => {
  assert.equal(isPresenceRow(row(1, { no_count: true })), true)
  assert.equal(isPresenceRow(row(1)), false)
  // Звичайне «Є / Немає» пункту каталогу не залежить від no_count
  assert.equal(isPresenceRow({ item_name: 'Світло', no_count: false }), true)
  assert.equal(qtyText('Лопасті — Matrice', 1, true), 'є')
  assert.equal(qtyText('Лопасті — Matrice', 3, false), '3 шт.')
  assert.equal(qtyText('Світло', 0), 'немає')
})

test('Excel: S/N Старлінка показується з префіксом KIT, інші серійні номери без змін, позначка лишається', () => {
  const base = { position_name: POS, category: 'x', status: 'На позиції', quantity: 1, notes: '', brand: null }
  const rows = buildReportRows([
    { ...base, id: 1, item_name: 'Старлінк — Міні, KIT 20000015486', variant: null, serial: null },
    { ...base, id: 2, item_name: 'Старлінк — Міні, S/N KIT777', variant: 'Міні', serial: 'KIT777' },
    { ...base, id: 3, item_name: 'Старлінк — Міні, S/N Невідомо/Зафарбовано', variant: 'Міні', serial: null },
    { ...base, id: 4, item_name: 'Рація — Motorola, S/N 123', variant: null, brand: 'Motorola', serial: '123' }
  ])
  // Три Міні на одній позиції зведені в один рядок: S/N через кому, кількість разом
  const mini = rows.find(r => r['Вид / модель / назва'] === 'Міні')
  assert.deepEqual(mini['Серійний номер'].split(', ').sort(), ['KIT20000015486', 'KIT777', 'Невідомо/Зафарбовано'].sort())
  assert.equal(mini['Кількість'], 3)
  assert.equal(rows.find(r => r['Найменування'] === 'Рація')['Серійний номер'], '123')
  assert.equal(Object.keys(rows[0]).includes('Серійний номер / KIT'), false)
})

test('Excel: однакове майно з різними S/N — один рядок із загальною кількістю й номерами через кому', () => {
  const base = { position_name: POS, category: 'Зв’язок', status: 'На позиції', quantity: 1, notes: '', variant: null, brand: 'Motorola', no_count: false }
  const rows = buildReportRows([
    { ...base, id: 1, item_name: 'Рація — Motorola, S/N 123', serial: '123' },
    { ...base, id: 2, item_name: 'Рація — Motorola, S/N 456', serial: '456' },
    { ...base, id: 3, item_name: 'Рація — Motorola, S/N 789', serial: '789', status: 'На ремонт' },
    { ...base, id: 4, item_name: 'Рація — Baofeng, S/N 1', serial: '1', brand: 'Baofeng' }
  ])
  assert.equal(rows.length, 3)
  const moto = rows.find(r => r['Статус'] === 'На позиції' && r['Марка'] === 'Motorola')
  assert.equal(moto['Кількість'], 2)
  assert.equal(moto['Серійний номер'], '123, 456')
  assert.equal(rows.find(r => r['Марка'] === 'Baofeng')['Серійний номер'], '1')
  assert.equal(rows.find(r => r['Статус'] === 'На ремонт')['Серійний номер'], '789')
})
