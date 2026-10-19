import test from 'node:test'
import assert from 'node:assert/strict'
import { addItem } from '../src/services/addItemService.js'
import { saveEdit } from '../src/services/editItemService.js'
import { editFormFromItem } from '../src/services/editFormService.js'
import { changeStatus, changePresence, changeQuantity, asksRepairQty, moveToRepair } from '../src/services/itemActionsService.js'
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

const light = (id, status, quantity, over = {}) => ({
  id, position_name: POS, item_name: 'Світло', category: 'Живлення', status, quantity, notes: '', variant: null, brand: null, serial: null, ...over
})

test('«Є / Немає»: у «На позиції» список міняє лише кількість, «Потреба» переносить у статус «Потреба»', async () => {
  const { client, repo } = setup([light(1, 'На позиції', 1)])
  assert.equal((await changePresence(client.state.rows[0], '0', repo)).reload, true)
  assert.deepEqual([client.state.rows[0].status, client.state.rows[0].quantity], ['На позиції', 0])
  assert.deepEqual(await changePresence(client.state.rows[0], '0', repo), {})
  const need = await changePresence(client.state.rows[0], 'need', repo)
  assert.equal(need.message, 'Переміщено в «Потреба»')
  assert.deepEqual([client.state.rows[0].status, client.state.rows[0].quantity], ['Потреба', 0])
})

test('«Потреба»: кількість необов’язкова, можна вказати або прибрати, а вихід з «Потреби» робить «Є»', async () => {
  const { client, repo } = setup([light(1, 'На позиції', 1)])
  await changePresence(client.state.rows[0], 'need', repo)
  await changeQuantity(1, client.state.rows[0], '4', repo)
  assert.deepEqual([client.state.rows[0].status, client.state.rows[0].quantity], ['Потреба', 4])
  await changeQuantity(1, client.state.rows[0], '0', repo)
  assert.equal(client.state.rows[0].quantity, 0)
  await changeQuantity(1, client.state.rows[0], '2', repo)
  const back = await changeStatus(client.state.rows[0], 'На позиції', repo)
  assert.equal(back.reload, true)
  assert.deepEqual([client.state.rows[0].status, client.state.rows[0].quantity], ['На позиції', 1])
  // без змін для рядка з кількістю: статус міняється, кількість та же
  const cnt = setup([row(7, { quantity: 5 })])
  await changeStatus(cnt.client.state.rows[0], 'Потреба', cnt.repo)
  assert.deepEqual([cnt.client.state.rows[0].status, cnt.client.state.rows[0].quantity], ['Потреба', 5])
})

test('«Є / Немає»: «Потреба» зливається з рядком у «Потребі» (береться більше), «На ремонт» не змінюється вибором «Є»', async () => {
  const { client, repo } = setup([light(1, 'На позиції', 1), light(2, 'Потреба', 3)])
  const r = await changePresence(client.state.rows[0], 'need', repo)
  assert.equal(r.message, "Об'єднано з наявним рядком «Потреба»")
  assert.equal(client.state.rows.length, 1)
  assert.deepEqual([client.state.rows[0].id, client.state.rows[0].status, client.state.rows[0].quantity], [2, 'Потреба', 3])
  const rep = setup([light(3, 'На ремонт', 0)])
  await changePresence(rep.client.state.rows[0], '1', rep.repo)
  assert.deepEqual([rep.client.state.rows[0].status, rep.client.state.rows[0].quantity], ['На ремонт', 1])
})

test('нове майно зі статусом «Потреба»: кількість необов’язкова, порожня = 0, зливання бере більше', async () => {
  const { client, repo } = setup()
  const form = baseForm({ presetName: 'Світло', category: 'Живлення', status: 'Потреба', quantity: '' })
  assert.equal((await add(form, repo)).message, 'Додано на позицію!')
  assert.deepEqual([client.state.rows[0].status, client.state.rows[0].quantity], ['Потреба', 0])
  assert.equal((await add({ ...form, quantity: 3 }, repo)).message, 'Світло: потрібно 3')
  assert.equal((await add({ ...form, quantity: 2 }, repo)).message, 'Світло: потрібно 3')
  assert.equal(client.state.rows.length, 1)
  assert.equal(client.state.rows[0].quantity, 3)
  // «На позиції» поводиться як раніше: Є / Немає
  assert.equal((await add({ ...form, status: 'На позиції', quantity: 1 }, repo)).message, 'Додано на позицію!')
  assert.equal(client.state.rows[1].quantity, 1)
})

test('таблиця: у «На позиції» список Є / Немає / Потреба, у «Потребі» — поле кількості; лічильник рахує рядок «Потреби»', async () => {
  const { createSSRApp, ref } = await import('vue')
  const { renderToString } = await import('vue/server-renderer')
  const { default: ItemsTable } = await import('../src/components/ItemsTable.vue')
  const { useStatusFilter } = await import('../src/composables/useStatusFilter.js')
  const counts = { 'На позиції': 0, 'Потреба': 1, 'На ремонт': 0 }
  const ok = await renderToString(createSSRApp(ItemsTable, { status: 'На позиції', counts, items: [light(2, 'На позиції', 1)] }))
  assert.match(ok, /<option value="need">Потреба<\/option>/)
  assert.match(ok, /presence-select status-green/)
  const need = await renderToString(createSSRApp(ItemsTable, { status: 'Потреба', counts, items: [light(1, 'Потреба', 0)] }))
  assert.doesNotMatch(need, /presence-select/)
  assert.doesNotMatch(need, /value="need"/)
  assert.match(need, /placeholder="К-ть"/)
  const items = ref([light(1, 'Потреба', 0), light(2, 'На позиції', 0)])
  assert.deepEqual(useStatusFilter(items).counts.value, { 'На позиції': 0, 'Потреба': 1, 'На ремонт': 0 })
})

test('Excel: рядок «Є / Немає» у «Потребі» показує кількість «скільки потрібно», без кількості — порожньо', () => {
  const out = buildReportRows([light(1, 'Потреба', 3), light(2, 'Потреба', 0, { item_name: 'Стяжки' }), light(3, 'На позиції', 1, { item_name: 'Посуд' })])
  const by = Object.fromEntries(out.map(r => [r['Найменування'], r]))
  // «Потреба» у звіті так само, як у застосунку: без «НЕМАЄ», з кількістю або без
  assert.deepEqual([by['Світло']['Кількість'], by['Світло']['Наявність'], by['Світло']['Статус']], [3, 'ПОТРЕБА', 'Потреба'])
  assert.deepEqual([by['Стяжки']['Кількість'], by['Стяжки']['Наявність'], by['Стяжки']['Статус']], ['', 'ПОТРЕБА', 'Потреба'])
  const sum = Object.fromEntries(buildSummaryRows([light(1, 'Потреба', 0), light(2, 'На позиції', 0, { item_name: 'Стяжки' })], true).map(g => [g['Найменування'], g]))
  assert.equal(sum['Світло']['Наявність'], 'ПОТРЕБА')
  assert.equal(sum['Стяжки']['Наявність'], 'НЕМАЄ')
  assert.deepEqual([by['Посуд']['Кількість'], by['Посуд']['Наявність']], ['', 'Є'])
})

test('вікно «Скільки потрібно?»: рядок іде в «Потребу» лише з кількістю, помилка в полі лишає його на місці', async () => {
  const { moveToNeed, asksNeedQty } = await import('../src/services/itemActionsService.js')
  const { client, repo } = setup([row(1, { item_name: 'Лопати', variant: null, quantity: 0 })])
  assert.equal(asksNeedQty(client.state.rows[0]), true)
  const empty = await moveToNeed(client.state.rows[0], '', repo)
  assert.deepEqual([empty.isError, empty.message, empty.close], [true, 'Вкажіть, скільки потрібно', undefined])
  assert.equal((await moveToNeed(client.state.rows[0], '1.5', repo)).message, 'Кількість має бути цілим числом')
  assert.equal(client.state.rows[0].status, 'На позиції')
  const ok = await moveToNeed(client.state.rows[0], '3', repo)
  assert.deepEqual([ok.message, ok.reload, ok.close], ['Переміщено в «Потреба»', true, true])
  assert.deepEqual([client.state.rows[0].status, client.state.rows[0].quantity], ['Потреба', 3])
  assert.equal(asksNeedQty(client.state.rows[0]), false)
})

test('вікно «Скільки потрібно?» для «Є / Немає»: кількість необов’язкова, з наявною «Потребою» зливається', async () => {
  const { moveToNeed } = await import('../src/services/itemActionsService.js')
  const light = (id, status, quantity) => row(id, { item_name: 'Світло', variant: null, status, quantity })
  const s = setup([light(1, 'На позиції', 0)])
  await moveToNeed(s.client.state.rows[0], '', s.repo)
  assert.deepEqual([s.client.state.rows[0].status, s.client.state.rows[0].quantity], ['Потреба', 0])
  const m = setup([light(1, 'На позиції', 1), light(2, 'Потреба', 2)])
  const r = await moveToNeed(m.client.state.rows[0], '5', m.repo)
  assert.equal(r.message, "Об'єднано з наявним рядком «Потреба»")
  assert.deepEqual(m.client.state.rows.map(x => [x.id, x.quantity]), [[2, 5]])
})

test('вікно «Скільки потрібно?»: для майна з кількістю поле обов’язкове з поточною кількістю, для «Є / Немає» — необов’язкове', async () => {
  const { createSSRApp } = await import('vue')
  const { renderToString } = await import('vue/server-renderer')
  const { default: NeedQtyModal } = await import('../src/components/NeedQtyModal.vue')
  const count = await renderToString(createSSRApp(NeedQtyModal, { item: row(1, { item_name: 'Лопати', variant: null, quantity: 4 }) }))
  assert.match(count, /Скільки потрібно, шт\. \*/)
  assert.match(count, /value="4"/)
  const presence = await renderToString(createSSRApp(NeedQtyModal, { item: row(2, { item_name: 'Світло', variant: null, quantity: 0 }) }))
  assert.match(presence, /Скільки потрібно \(необов&#39;язково\)/)
  assert.match(presence, /placeholder="Просто потрібно"/)
})

test('на ремонт йде вказана кількість: віднімається від «На позиції» і додається до «На ремонт»', async () => {
  const { client, repo } = setup([row(1, { quantity: 5 })])
  assert.equal(asksRepairQty(client.state.rows[0]), true)
  const r = await moveToRepair(client.state.rows[0], 2, repo)
  assert.equal(r.close, true)
  assert.equal(client.state.rows.find(x => x.id === 1).quantity, 3)
  const repair = client.state.rows.find(x => x.status === 'На ремонт')
  assert.equal(repair.quantity, 2)
  await moveToRepair(client.state.rows.find(x => x.id === 1), 1, repo)
  assert.equal(client.state.rows.find(x => x.status === 'На ремонт').quantity, 3)
  assert.equal(client.state.rows.find(x => x.id === 1).quantity, 2)
  assert.equal((await moveToRepair(client.state.rows.find(x => x.id === 1), 9, repo)).isError, true)
  await moveToRepair(client.state.rows.find(x => x.id === 1), 2, repo)
  assert.equal(client.state.rows.length, 1)
  assert.equal(client.state.rows[0].quantity, 5)
})

test('дрон з іменем і майно із серійним номером йдуть на ремонт цілком, без запиту кількості', () => {
  assert.equal(asksRepairQty(row(1, { item_name: 'Лопасті — Matrice', quantity: 1 })), false)
  assert.equal(asksRepairQty(row(2, { quantity: 3, status: 'Потреба' })), false)
})
