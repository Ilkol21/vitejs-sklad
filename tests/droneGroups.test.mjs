import test from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { groupDroneRows } from '../src/domain/droneGroups.js'
import { buildReportRows, buildSummaryRows } from '../src/domain/report.js'
import { useDroneGroup } from '../src/composables/useDroneGroup.js'
import { POS, OTHER } from './helpers/setup.mjs'

let id = 0
const drone = (model, name, over = {}) => ({
  id: ++id, position_name: POS, category: 'БПЛА', status: 'На позиції', notes: '',
  item_name: `Дрони — ${model}${name ? ` "${name}"` : ''}`, variant: name ? `${model} "${name}"` : model,
  quantity: name ? 1 : 3, brand: null, serial: null, ...over
})
const other = (n, over = {}) => ({ id: ++id, position_name: POS, category: 'x', status: 'На позиції', item_name: n, quantity: 1, notes: '', ...over })

test('іменні дрони тієї ж моделі збираються разом з безіменними, усі відмінні моделі — окремо', () => {
  const rows = [drone('Mavic 3T', 'Панда'), drone('Mavic 3T', null), drone('Mavic 3T', 'Лис'), drone('Matrice', null), other('Генератор')]
  const out = groupDroneRows(rows)
  assert.equal(out.length, 3)
  const g = out.find(e => e.type === 'drones')
  assert.equal(g.title, 'Дрони — Mavic 3T')
  assert.equal(g.total, 5)
  assert.deepEqual(g.names, ['Панда', 'Лис'])
  assert.equal(g.items.length, 3)
  // модель без іменних дронів та інше майно — звичайні рядки
  assert.deepEqual(out.map(e => e.type), ['drones', 'row', 'row'])
})

test('група стає на місце першого свого рядка, порядок інших рядків не змінюється', () => {
  const rows = [other('А'), drone('Matrice', 'Арт'), other('Б'), drone('Matrice', null)]
  assert.deepEqual(groupDroneRows(rows).map(e => e.type === 'drones' ? 'G' : e.item.item_name), ['А', 'G', 'Б'])
})

test('статус і позиція розділяють групи: кілька статусів — кілька груп', () => {
  const rows = [drone('Matrice', 'А'), drone('Matrice', 'Б', { status: 'На ремонт' }), drone('Matrice', 'В', { position_name: OTHER })]
  assert.equal(groupDroneRows(rows, { byPosition: true }).length, 3)
  // без byPosition (таблиця однієї позиції) позиція не враховується, статус — враховується
  assert.equal(groupDroneRows(rows).length, 2)
})

test('Excel «Облік майна»: один рядок на модель, кількість разом, імена в окремій колонці', () => {
  const rows = [drone('Mavic 3T', 'Панда'), drone('Mavic 3T', null), drone('Mavic 3T', 'Лис', { notes: 'новий' }), other('Генератор')]
  const report = buildReportRows(rows)
  assert.equal(report.length, 2)
  const d = report.find(r => r['Найменування'] === 'Дрони')
  assert.equal(d['Вид / модель / назва'], 'Mavic 3T')
  assert.equal(d['Кількість'], 5)
  assert.equal(d['Од.'], 'шт.')
  assert.equal(d['Імена дронів'], 'Панда, Лис')
  assert.equal(d['Примітки'], 'новий')
  assert.equal(d['Статус'], 'На позиції')
  // усі рядки мають однаковий набір колонок, у звичайних «Імена дронів» порожня
  assert.deepEqual(Object.keys(d), Object.keys(report.find(r => r['Найменування'] === 'Генератор')))
  assert.equal(report.find(r => r['Найменування'] === 'Генератор')['Імена дронів'], '')
})

test('Excel: дрони на різних позиціях і статусах не зливаються, моделі — окремі рядки', () => {
  const rows = [
    drone('Matrice', 'А'), drone('Matrice', 'Б', { position_name: OTHER }), drone('Matrice', 'В', { status: 'На ремонт' }), drone('Mavic 3T', 'Г')
  ]
  const report = buildReportRows(rows)
  assert.equal(report.length, 4)
  assert.deepEqual(report.map(r => r['Імена дронів']).sort(), ['А', 'Б', 'В', 'Г'])
})

test('аркуш «Підсумок»: дрони моделі продовжують рахуватися разом (іменні + без імені)', () => {
  const rows = [drone('Mavic 3T', 'Панда'), drone('Mavic 3T', null), drone('Mavic 3T', 'Лис')]
  const sum = buildSummaryRows(rows, true)
  assert.equal(sum.length, 1)
  assert.equal(sum[0]['Вид / марка'], 'Mavic 3T')
  assert.equal(sum[0]['Разом є'], 5)
})

test('вікно групи: відкривається за ключем, оновлюється з даними, закривається коли іменних не лишилось', () => {
  const a = drone('Matrice', 'А'); const b = drone('Matrice', 'Б'); const c = drone('Matrice', null)
  const items = ref([a, b, c])
  const { group, openGroup } = useDroneGroup(items)
  assert.equal(group.value, null)
  openGroup(groupDroneRows(items.value)[0])
  assert.equal(group.value.total, 5)
  // одне ім’я пішло в іншу вкладку (зміна статусу): група лишається відкритою з рештою членів
  items.value = [{ ...a, status: 'На ремонт' }, b, c]
  assert.equal(group.value.total, 4)
  // іменних не лишилось — групи немає
  items.value = [c]
  assert.equal(group.value, null)
})

test('таблиця в застосунку показує групу одним рядком з усіма іменами та загальною кількістю', async () => {
  const { default: ItemsTable } = await import('../src/components/ItemsTable.vue')
  const counts = { 'На позиції': 2, 'Потреба': 0, 'На ремонт': 0 }
  const html = await renderToString(createSSRApp(ItemsTable, {
    status: 'На позиції', counts,
    items: [drone('Mavic 3T', 'Панда'), drone('Mavic 3T', null), drone('Mavic 3T', 'Лис'), other('Генератор')]
  }))
  assert.equal((html.match(/group-row/g) || []).length, 1)
  assert.match(html, /Дрони — Mavic 3T/)
  assert.match(html, /Імена: Панда, Лис/)
  assert.match(html, /<b>5<\/b>/)
  assert.doesNotMatch(html, /Mavic 3T "Панда"|Mavic 3T &quot;Панда&quot;/)
  assert.match(html, /Генератор/)
})

test('вікно групи показує кожен дрон з власним статусом, безіменних — з полем кількості', async () => {
  const { default: DroneGroupModal } = await import('../src/components/DroneGroupModal.vue')
  const items = [drone('Mavic 3T', 'Панда'), drone('Mavic 3T', null), drone('Mavic 3T', 'Лис')]
  const html = await renderToString(createSSRApp(DroneGroupModal, { group: groupDroneRows(items)[0] }))
  assert.match(html, /разом 5 шт\./)
  assert.match(html, /«Панда»/)
  assert.match(html, /«Лис»/)
  assert.match(html, /Без імені/)
  assert.equal((html.match(/<select/g) || []).length, 3)
  assert.equal((html.match(/type="number"/g) || []).length, 1)
})
