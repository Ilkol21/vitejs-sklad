import test from 'node:test'
import assert from 'node:assert/strict'
import { addItem } from '../src/services/addItemService.js'
import { saveEdit } from '../src/services/editItemService.js'
import { editFormFromItem } from '../src/services/editFormService.js'
import { normalizeSerial, isPlaceholderSerial } from '../src/domain/serial.js'
import { itemParts } from '../src/domain/itemName.js'
import { presetOf } from '../src/domain/catalog.js'
import { POS, OTHER, baseForm, setup } from './helpers/setup.mjs'

const add = (form, repo) => addItem(form, { positionName: POS }, repo)
const radio = (over = {}) => baseForm({ presetName: 'Рація', category: 'Зв\'язок', brand: 'Motorola', ...over })

test('нормалізація позначок', () => {
  assert.equal(normalizeSerial('  невідомо '), 'Невідомо')
  assert.equal(normalizeSerial('ЗАФАРБОВАНО'), 'Зафарбовано')
  assert.equal(normalizeSerial(' AB-1 '), 'AB-1')
  assert.equal(isPlaceholderSerial('невідомо'), true)
  assert.equal(isPlaceholderSerial('AB-1'), false)
})

test('«Невідомо» можна додавати кілька разів: рядок не дублюється, кількість росте', async () => {
  const { client, repo } = setup()
  const first = await add(radio({ serial: 'Невідомо' }), repo)
  assert.equal(first.message, 'Додано на позицію!')
  assert.equal(client.state.rows[0].item_name, 'Рація — Motorola, S/N Невідомо')
  assert.equal(client.state.rows[0].serial, null)
  const second = await add(radio({ serial: 'невідомо' }), repo)
  assert.equal(second.message, 'Таке майно вже є: кількість збільшено, тепер 2 шт.')
  assert.equal(client.state.rows.length, 1)
  assert.equal(client.state.rows[0].quantity, 2)
})

test('«Зафарбовано» не конфліктує з реальними номерами і з «Невідомо» іншої марки', async () => {
  const { client, repo } = setup([
    { id: 1, position_name: OTHER, item_name: 'Рація — Motorola, S/N 77', status: 'На позиції', quantity: 1, notes: '', brand: 'Motorola', serial: '77' }
  ])
  assert.equal((await add(radio({ serial: 'Зафарбовано' }), repo)).message, 'Додано на позицію!')
  assert.equal((await add(radio({ brand: 'Hytera', serial: 'Зафарбовано' }), repo)).message, 'Додано на позицію!')
  assert.equal(client.state.rows.length, 3)
  // реальний номер далі перевіряється на дублікати
  assert.equal((await add(radio({ serial: '77' }), repo)).message, `Такий серійний номер уже є: ${OTHER}`)
})

test('павук додається і для «Невідомо», відомий рядок не пропадає', async () => {
  const { client, repo } = setup()
  await add(radio({ serial: 'Невідомо', extraQty: '1' }), repo)
  const r = await add(radio({ serial: 'Невідомо', extraQty: '2' }), repo)
  assert.match(r.message, /тепер 2 шт\. \+ павуків: 2$/)
  assert.equal(client.state.rows.find(x => x.item_name === 'Павук').quantity, 3)
})

test('планшет і зарядка без марки теж приймають позначки', async () => {
  const { client, repo } = setup()
  await add(baseForm({ presetName: 'Планшети', category: 'БПЛА', brand: 'Autel', deviceModel: 'EVO', serial: 'Невідомо' }), repo)
  await add(baseForm({ presetName: 'Зарядка до рації', category: 'Зв\'язок', serial: 'Зафарбовано' }), repo)
  assert.deepEqual(client.state.rows.map(r => r.item_name), ['Планшети — Autel EVO, S/N Невідомо', 'Зарядка до рації — S/N Зафарбовано'])
})

test('редагування: позначка відображається у формі, можна замінити на реальний номер з перевіркою', async () => {
  const item = { id: 1, position_name: POS, item_name: 'Рація — Motorola, S/N Невідомо', category: 'x', status: 'На позиції', quantity: 1, notes: '', variant: null, brand: 'Motorola', serial: null }
  const taken = { id: 2, position_name: OTHER, item_name: 'Рація — Motorola, S/N 5', category: 'x', status: 'На позиції', quantity: 1, notes: '', variant: null, brand: 'Motorola', serial: '5' }
  const { client, repo } = setup([item, taken])
  assert.equal(itemParts(item).serial, 'Невідомо')
  const form = editFormFromItem(item)
  assert.equal(form.serial, 'Невідомо')
  const preset = presetOf(item.item_name)
  const clash = await saveEdit(item, preset, { ...form, serial: '5' }, { confirm: () => true }, repo)
  assert.equal(clash.message, `Такий серійний номер уже є: ${OTHER}`)
  const ok = await saveEdit(item, preset, { ...form, serial: '6' }, { confirm: () => true }, repo)
  assert.equal(ok.message, 'Зміни збережено')
  assert.equal(client.state.rows[0].item_name, 'Рація — Motorola, S/N 6')
  assert.equal(client.state.rows[0].serial, '6')
})

test('редагування: реальний номер → «Зафарбовано» зливається з наявним рядком; рядок з кількома одиницями не стає унікальним', async () => {
  const mk = (id, serial, name, q) => ({ id, position_name: POS, item_name: `Рація — Motorola, S/N ${name}`, category: 'x', status: 'На позиції', quantity: q, notes: '', variant: null, brand: 'Motorola', serial })
  const real = mk(1, '9', '9', 1)
  const unknown = mk(2, null, 'Зафарбовано', 2)
  const { client, repo } = setup([real, unknown])
  const preset = presetOf(real.item_name)
  const merged = await saveEdit(real, preset, { ...editFormFromItem(real), serial: 'Зафарбовано' }, { confirm: () => true }, repo)
  assert.equal(merged.message, "Об'єднано з наявним рядком: тепер 3 шт.")
  assert.deepEqual(client.state.rows.map(r => r.quantity), [3])
  const many = client.state.rows[0]
  const blocked = await saveEdit(many, preset, { ...editFormFromItem(many), serial: 'X1' }, { confirm: () => true }, repo)
  assert.equal(blocked.message, 'Серійний номер один: спершу зменшіть кількість до 1')
})
