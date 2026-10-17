import test from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { groupItemRows } from '../src/domain/serialGroups.js'
import { useDroneGroup } from '../src/composables/useDroneGroup.js'
import { POS, OTHER } from './helpers/setup.mjs'

let id = 0
const radio = (serial, over = {}) => ({
  id: ++id, position_name: POS, category: 'Зв’язок', status: 'На позиції', notes: '', quantity: 1, no_count: false,
  item_name: `Рація — Motorola, S/N ${serial}`, variant: null, brand: 'Motorola', serial, ...over
})
const plain = (over = {}) => ({
  id: ++id, position_name: POS, category: 'Живлення', status: 'На позиції', notes: '', quantity: 1,
  item_name: 'Генератор', variant: null, brand: null, serial: null, ...over
})

test('однакове майно з різними S/N зводиться в один запис; одинак, без S/N, різні статуси і марки — окремо', () => {
  const rows = [
    radio('456', { quantity: 2, notes: 'нова' }), radio('123'), plain(), radio('789', { status: 'На ремонт' }),
    radio('1', { brand: 'Baofeng', item_name: 'Рація — Baofeng, S/N 1' })
  ]
  const out = groupItemRows(rows)
  assert.deepEqual(out.map(e => e.type), ['serials', 'row', 'row', 'row'])
  const g = out[0]
  assert.equal(g.title, 'Рація — Motorola')
  assert.equal(g.total, 3)
  assert.deepEqual(g.serials, ['123', '456'])
  assert.equal(g.items.length, 2)
  assert.equal(g.notes, 'нова')
})

test('позиція розділяє групи лише у звіті (byPosition)', () => {
  const rows = [radio('1'), radio('2', { position_name: OTHER })]
  assert.equal(groupItemRows(rows).length, 1)
  assert.equal(groupItemRows(rows, { byPosition: true }).length, 2)
})

test('таблиця показує S/N одним рядком через кому з загальною кількістю', async () => {
  const { default: ItemsTable } = await import('../src/components/ItemsTable.vue')
  const counts = { 'На позиції': 2, 'Потреба': 0, 'На ремонт': 0 }
  const html = await renderToString(createSSRApp(ItemsTable, {
    status: 'На позиції', counts, items: [radio('123'), radio('456', { quantity: 2 }), plain()]
  }))
  assert.equal((html.match(/group-row/g) || []).length, 1)
  assert.match(html, /S\/N: 123, 456/)
  assert.match(html, /<b>3<\/b>/)
  assert.match(html, /Генератор/)
  assert.doesNotMatch(html, /S\/N 123<\/b>/)
})

test('вікно групи S/N: кожен номер з власним статусом і кількістю', async () => {
  const { default: SerialGroupModal } = await import('../src/components/SerialGroupModal.vue')
  const group = groupItemRows([radio('123'), radio('456', { quantity: 2 })])[0]
  const html = await renderToString(createSSRApp(SerialGroupModal, { group }))
  assert.match(html, /разом 3 шт\./)
  assert.match(html, /S\/N 123/)
  assert.match(html, /S\/N 456/)
  assert.equal((html.match(/<select/g) || []).length, 2)
  assert.equal((html.match(/type="number"/g) || []).length, 2)
})

test('вікно групи S/N оновлюється з даними і закривається, коли залишається один номер', () => {
  const a = radio('1'); const b = radio('2'); const c = radio('3')
  const items = ref([a, b, c])
  const { group, openGroup } = useDroneGroup(items)
  openGroup(groupItemRows(items.value)[0])
  assert.equal(group.value.total, 3)
  items.value = [{ ...a, status: 'На ремонт' }, b, c]
  assert.equal(group.value.total, 2)
  items.value = [b]
  assert.equal(group.value, null)
})
