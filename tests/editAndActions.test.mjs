import test from 'node:test'
import assert from 'node:assert/strict'
import { saveEdit } from '../src/services/editItemService.js'
import { editFormFromItem } from '../src/services/editFormService.js'
import { changeQuantity, changeStatus, removeItem, deleteConfirmText } from '../src/services/itemActionsService.js'
import { presetOf } from '../src/domain/catalog.js'
import { POS, OTHER, setup } from './helpers/setup.mjs'

const row = (over = {}) => ({
  id: 1, position_name: POS, item_name: 'Генератор', category: 'Живлення', status: 'На позиції',
  quantity: 1, notes: '', variant: null, brand: null, serial: null, ...over
})
const yes = { confirm: () => true }
const no = { confirm: () => false }

test('форма редагування дрона розбиває назву на модель та ім’я', () => {
  const f = editFormFromItem(row({ item_name: 'Дрони — Mavic 3T "Панда"', variant: 'Mavic 3T "Панда"' }))
  assert.equal(f.variant, 'Mavic 3T')
  assert.equal(f.callsign, 'Панда')
})

test('редагування: перейменування в нову назву оновлює запис і закриває вікно', async () => {
  const item = row({ item_name: 'Рація — Motorola, S/N 1', brand: 'Motorola', serial: '1', quantity: 1 })
  const { client, repo } = setup([item])
  const form = { ...editFormFromItem(item), brand: 'Hytera', notes: ' нове ' }
  const r = await saveEdit(item, presetOf(item.item_name), form, yes, repo)
  assert.equal(r.message, 'Зміни збережено')
  assert.equal(r.close, true)
  assert.equal(client.state.rows[0].item_name, 'Рація — Hytera, S/N 1')
  assert.equal(client.state.rows[0].notes, 'нове')
})

test('редагування: серійний номер не повторює чужий', async () => {
  const a = row({ id: 1, item_name: 'Рація — M, S/N 1', brand: 'M', serial: '1' })
  const b = row({ id: 2, position_name: OTHER, item_name: 'Рація — M, S/N 2', brand: 'M', serial: '2' })
  const { repo } = setup([a, b])
  const r = await saveEdit(b, presetOf(b.item_name), { ...editFormFromItem(b), serial: '1' }, yes, repo)
  assert.equal(r.message, `Такий серійний номер уже є: ${POS}`)
})

test('редагування: дрон з кількістю > 1 не може отримати ім’я', async () => {
  const item = row({ item_name: 'Дрони — Mavic 3T', variant: 'Mavic 3T', quantity: 3 })
  const { repo } = setup([item])
  const r = await saveEdit(item, presetOf(item.item_name), { ...editFormFromItem(item), callsign: 'Лис' }, yes, repo)
  assert.equal(r.message, 'Дрон з іменем один: спершу зменште кількість до 1')
})

test('редагування: збіг назви зливає рядки лише після підтвердження', async () => {
  const a = row({ id: 1, item_name: 'Дрони — Mavic 3T', variant: 'Mavic 3T', quantity: 2, notes: 'x' })
  const b = row({ id: 2, item_name: 'Дрони — Mavic 3TA', variant: 'Mavic 3TA', quantity: 1, notes: 'y' })
  const { client, repo } = setup([a, b])
  const form = { ...editFormFromItem(b), variant: 'Mavic 3T' }
  const declined = await saveEdit(b, presetOf(b.item_name), form, no, repo)
  assert.deepEqual(declined, {})
  assert.equal(client.state.rows.length, 2)
  const r = await saveEdit(b, presetOf(b.item_name), form, yes, repo)
  assert.equal(r.message, 'Об\'єднано з наявним рядком: тепер 3 шт.')
  assert.equal(client.state.rows.length, 1)
  assert.equal(client.state.rows[0].quantity, 3)
})

test('редагування старого запису без пункту каталогу змінює назву', async () => {
  const item = row({ item_name: 'Старе майно' })
  const { client, repo } = setup([item])
  const r = await saveEdit(item, undefined, { ...editFormFromItem(item), fullName: 'Нове майно' }, yes, repo)
  assert.equal(r.message, 'Зміни збережено')
  assert.equal(client.state.rows[0].item_name, 'Нове майно')
})

test('кількість: порожнє або від’ємне перезавантажує, дробове для штук відхиляється', async () => {
  const item = row({ quantity: 2 })
  const { client, repo } = setup([item])
  assert.deepEqual(await changeQuantity(1, item, '', repo), { reload: true })
  assert.deepEqual(await changeQuantity(1, item, '-1', repo), { reload: true })
  const frac = await changeQuantity(1, item, '1.5', repo)
  assert.equal(frac.message, 'Кількість має бути цілим числом')
  assert.equal(frac.reload, true)
  assert.deepEqual(await changeQuantity(1, item, '7', repo), {})
  assert.equal(client.state.rows[0].quantity, 7)
})

test('статус: зміна, злиття з наявним рядком, «Є / Немає» бере максимум', async () => {
  const a = row({ id: 1, quantity: 2 })
  const b = row({ id: 2, status: 'На ремонт', quantity: 3 })
  const { client, repo } = setup([a, b])
  assert.deepEqual(await changeStatus(a, 'На позиції', repo), {})
  const merged = await changeStatus(a, 'На ремонт', repo)
  assert.equal(merged.message, 'Об\'єднано з наявним рядком: тепер 5 шт.')
  assert.deepEqual(client.state.rows.map(r => [r.id, r.quantity]), [[2, 5]])

  const l1 = row({ id: 5, item_name: 'Світло', quantity: 1 })
  const l2 = row({ id: 6, item_name: 'Світло', status: 'Потреба', quantity: 0 })
  const p = setup([l1, l2])
  const r = await changeStatus(l1, 'Потреба', p.repo)
  // «Є / Немає» у «Потребу» йде без кількості (кількість там — «скільки потрібно»), тому зливання без «є»
  assert.equal(r.message, 'Об\'єднано з наявним рядком «Потреба»')
  assert.deepEqual(p.client.state.rows.map(x => [x.id, x.status, x.quantity]), [[6, 'Потреба', 0]])
  const plain = setup([row()])
  assert.deepEqual(await changeStatus(plain.client.state.rows[0], 'Потреба', plain.repo), { reload: true })
  assert.equal(plain.client.state.rows[0].status, 'Потреба')
})

test('видалення: без підтвердження нічого не відбувається', async () => {
  const item = row()
  const { client, repo } = setup([item])
  assert.deepEqual(await removeItem(item, 1, no, repo), {})
  assert.equal(client.state.rows.length, 1)
  const r = await removeItem(item, 1, yes, repo)
  assert.equal(r.message, 'Видалено')
  assert.equal(client.state.rows.length, 0)
  assert.match(deleteConfirmText(item), /^Видалити назавжди\?\n\n«Генератор»\nПозиція: Позиція «Чіпс»\nСтатус: На позиції\nКількість: 1 шт\./)
  assert.match(deleteConfirmText(null), /\n\nцей запис\n\n/)
})
