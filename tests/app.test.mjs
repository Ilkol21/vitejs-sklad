import test from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from '../src/App.vue'
import { PRESET_ITEMS } from '../src/config/presets.js'
import { POSITIONS } from '../src/config/app.js'

// Димовий тест: весь дерево компонентів збирається і малює основні блоки
test('App рендериться з усіма блоками', async () => {
  const html = await renderToString(createSSRApp(App))
  assert.match(html, /class="app-container"/)
  assert.match(html, /Облік майна БПЛА/)
  assert.match(html, /class="add-form"/)
  assert.match(html, /class="single-table-container"/)
  assert.match(html, /class="excel-footer-box"/)
  assert.match(html, /На цій позиції поки немає майна/)
  for (const p of PRESET_ITEMS) assert.ok(html.includes(`>${p.name.replace(/"/g, '&quot;')}</option>`) || html.includes(p.name.split('"')[0]), p.name)
  for (const pos of POSITIONS) assert.ok(html.includes(pos), pos)
})

test('серійний номер / KIT: одне поле зі стрілкою списку, без окремого селекта', async () => {
  const { default: SerialField } = await import('../src/components/SerialField.vue')
  const html = await renderToString(createSSRApp(SerialField, { modelValue: 'AB-1', placeholder: 'Серійний номер *' }))
  assert.equal((html.match(/<input/g) || []).length, 1)
  assert.doesNotMatch(html, /<select/)
  assert.match(html, /value="AB-1"/)
  assert.match(html, /class="serial-toggle"/)
  // список закритий, доки не натиснуто стрілку
  assert.doesNotMatch(html, /serial-options/)
})

test('S/N Старлінка: у формі поле «S/N» зі стартовим «KIT»', async () => {
  const html = await renderToString(createSSRApp(App))
  // Перший пункт каталогу — Старлінк: поле має починатися з «KIT», підпис — «S/N *»
  assert.match(html, /<input[^>]*placeholder="S\/N \*"[^>]*value="KIT"|<input[^>]*value="KIT"[^>]*placeholder="S\/N \*"/)
  assert.doesNotMatch(html, /Номер KIT/)
})

test('вікно редагування Старлінка показує підпис «S/N» і номер з префіксом', async () => {
  const { default: EditItemModal } = await import('../src/components/EditItemModal.vue')
  const { presetOf } = await import('../src/domain/catalog.js')
  const { editFormFromItem } = await import('../src/services/editFormService.js')
  // Старий запис без префікса KIT у формі показується вже з ним
  const item = { id: 1, position_name: 'Позиція «Зебра»', item_name: 'Старлінк — Міні, KIT 20000015486', quantity: 1, notes: '', variant: null, brand: null, serial: null }
  const html = await renderToString(createSSRApp(EditItemModal, { item, preset: presetOf(item.item_name), form: editFormFromItem(item) }))
  assert.match(html, /S\/N \*/)
  assert.doesNotMatch(html, /Номер KIT/)
  assert.match(html, /value="KIT20000015486"/)
})
