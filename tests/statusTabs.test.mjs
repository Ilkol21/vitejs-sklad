import test from 'node:test'
import assert from 'node:assert/strict'
import { ref } from 'vue'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { useStatusFilter } from '../src/composables/useStatusFilter.js'
import { buildReportRows } from '../src/domain/report.js'
import { changeStatus } from '../src/services/itemActionsService.js'
import { POS, OTHER, setup } from './helpers/setup.mjs'

const CATALOG_NAMES = ['Генератор', 'Кірка', 'Лопати', 'Сокира']

const row = (id, status, over = {}) => ({
  id, position_name: POS, item_name: CATALOG_NAMES[(id - 1) % CATALOG_NAMES.length], category: 'Живлення', status,
  quantity: 1, notes: '', variant: null, brand: null, serial: null, ...over
})

test('перемикач: за замовчуванням «На позиції», лічильники рахуються по всіх статусах', () => {
  const items = ref([row(1, 'На позиції'), row(2, 'Потреба'), row(3, 'На позиції'), row(4, 'На ремонт')])
  const { activeStatus, counts, visibleItems } = useStatusFilter(items)
  assert.equal(activeStatus.value, 'На позиції')
  assert.deepEqual(counts.value, { 'На позиції': 2, 'Потреба': 1, 'На ремонт': 1 })
  assert.deepEqual(visibleItems.value.map(i => i.id), [1, 3])
  activeStatus.value = 'Потреба'
  assert.deepEqual(visibleItems.value.map(i => i.id), [2])
  activeStatus.value = 'На ремонт'
  assert.deepEqual(visibleItems.value.map(i => i.id), [4])
})

test('зміна статусу переносить рядок у іншу вкладку, поточна вкладка лишається', async () => {
  const { client, repo } = setup([row(1, 'На позиції'), row(2, 'На позиції')])
  const items = ref(client.state.rows.map(r => ({ ...r })))
  const { activeStatus, counts, visibleItems } = useStatusFilter(items)
  const result = await changeStatus(items.value[0], 'На ремонт', repo)
  assert.equal(result.reload, true)
  // список перезавантажується з бази
  items.value = client.state.rows.map(r => ({ ...r }))
  assert.equal(activeStatus.value, 'На позиції')
  assert.deepEqual(visibleItems.value.map(i => i.id), [2])
  assert.deepEqual(counts.value, { 'На позиції': 1, 'Потреба': 0, 'На ремонт': 1 })
  activeStatus.value = 'На ремонт'
  assert.deepEqual(visibleItems.value.map(i => i.id), [1])
})

test('звіт: спершу «На позиції», потім «Потреба», потім «На ремонт» всередині кожної позиції', () => {
  const rows = [
    row(1, 'На ремонт', { item_name: 'А' }),
    row(2, 'Потреба', { item_name: 'Б' }),
    row(3, 'На позиції', { item_name: 'Я' }),
    row(4, 'На позиції', { item_name: 'Б' }),
    row(5, 'На позиції', { item_name: 'А', position_name: OTHER }),
    row(6, 'На ремонт', { item_name: 'А', position_name: OTHER }),
    row(7, 'Невідомий', { item_name: 'А' })
  ]
  const out = buildReportRows(rows).map(r => `${r['Позиція']}|${r['Статус']}|${r['Найменування']}`)
  assert.deepEqual(out, [
    `${POS}|На позиції|Б`, `${POS}|На позиції|Я`,
    `${POS}|Потреба|Б`,
    `${POS}|На ремонт|А`,
    `${POS}|Невідомий|А`,
    `${OTHER}|На позиції|А`,
    `${OTHER}|На ремонт|А`
  ])
})

test('компонент перемикача: три вкладки з лічильниками, активна позначена', async () => {
  const { default: StatusTabs } = await import('../src/components/StatusTabs.vue')
  const html = await renderToString(createSSRApp(StatusTabs, {
    modelValue: 'Потреба', counts: { 'На позиції': 5, 'Потреба': 2, 'На ремонт': 0 }
  }))
  assert.equal((html.match(/role="tab"/g) || []).length, 3)
  assert.match(html, /На позиції<\/span><span class="status-tab-count">5</)
  assert.match(html, /На ремонт<\/span><span class="status-tab-count">0</)
  assert.equal((html.match(/status-tab active/g) || []).length, 1)
  assert.match(html, /status-tab active status-orange[^>]*aria-selected="true"[^>]*><span[^>]*>🟡 Потреба/)
})


test('лічильник рахує лише пункти каталогу з кількістю > 0; моделі й номери — один пункт; павук/роутер не враховуються', () => {
  const items = ref([
    row(1, 'На позиції', { item_name: 'Рація — Motorola, S/N 1', brand: 'Motorola', serial: '1' }),
    row(2, 'На позиції', { item_name: 'Рація — Hytera, S/N 2', brand: 'Hytera', serial: '2' }),
    row(3, 'На позиції', { item_name: 'Дрони — Mavic 3T', variant: 'Mavic 3T', quantity: 5 }),
    row(4, 'На позиції', { item_name: 'Дрони — Mavic 4 Pro', variant: 'Mavic 4 Pro', quantity: 0 }),
    row(5, 'На позиції', { item_name: 'Кірка', quantity: 0 }),
    row(6, 'На позиції', { item_name: 'Світло', quantity: 0 }),
    row(7, 'На позиції', { item_name: 'Павук', quantity: 3 }),
    row(8, 'На позиції', { item_name: 'Роутер Старлінк', quantity: 1 }),
    row(9, 'Потреба', { item_name: 'Рація — Motorola, S/N 3', brand: 'Motorola', serial: '3', quantity: 0 }),
    row(10, 'Потреба', { item_name: 'Лопати', quantity: 2 }),
    row(11, 'На ремонт', { item_name: 'Дрони — Mavic 3T "Панда"', variant: 'Mavic 3T "Панда"' })
  ])
  const { counts } = useStatusFilter(items)
  // На позиції: Рація, Дрони (Кірка й Світло з 0 не рахуються; павук і роутер не в каталозі)
  // Потреба: Рація з 0 не рахується, Лопати — так
  assert.deepEqual(counts.value, { 'На позиції': 2, 'Потреба': 1, 'На ремонт': 1 })
})

test('пункт з кількома рядками рахується, якщо хоч один рядок у статусі має кількість > 0', () => {
  const items = ref([
    row(1, 'На позиції', { item_name: 'Дрони — Mavic 3T', variant: 'Mavic 3T', quantity: 0 }),
    row(2, 'На позиції', { item_name: 'Дрони — Mavic 4 Pro', variant: 'Mavic 4 Pro', quantity: 1 }),
    row(3, 'Потреба', { item_name: 'Дрони — Mavic 3T', variant: 'Mavic 3T', quantity: 0 })
  ])
  const { counts } = useStatusFilter(items)
  assert.deepEqual(counts.value, { 'На позиції': 1, 'Потреба': 0, 'На ремонт': 0 })
})
