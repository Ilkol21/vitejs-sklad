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

test('поле серійного номера має випадний список з позначками', async () => {
  const { default: SerialField } = await import('../src/components/SerialField.vue')
  const render = value => renderToString(createSSRApp(SerialField, { modelValue: value, placeholder: 'Серійний номер *' }))
  const manual = await render('AB-1')
  assert.match(manual, /<option value>Ввести номер<\/option>/)
  assert.match(manual, /<option value="Невідомо">Невідомо<\/option>/)
  assert.match(manual, /<option value="Зафарбовано">Зафарбовано<\/option>/)
  assert.doesNotMatch(manual, /<input disabled/)
  assert.match(manual, /value="AB-1"/)
  // при позначці поле вводу блокується
  assert.match(await render('Зафарбовано'), /<input disabled/)
})
