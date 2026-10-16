import test from 'node:test'
import assert from 'node:assert/strict'
import { buildWorkbook, reportFileName, exportExcel } from '../src/services/excelExportService.js'
import { POS, OTHER, setup } from './helpers/setup.mjs'

const row = (over = {}) => ({
  id: 1, position_name: POS, item_name: 'Генератор', category: 'Живлення', status: 'На позиції',
  quantity: 1, notes: '', variant: null, brand: null, serial: null, ...over
})

test('ім’я файлу звіту', () => {
  const d = new Date(2026, 9, 16)
  const date = d.toLocaleDateString('uk-UA').replace(/\./g, '-')
  assert.equal(reportFileName('128 ОГШБр', POS, d), `Звіт_Склад_128ОГШБр_Чіпс_${date}.xlsx`)
  assert.equal(reportFileName('', '', d), `Звіт_Склад_УсіПозиції_${date}.xlsx`)
})

test('книга: «Разом» лише для кількох позицій', () => {
  assert.deepEqual(buildWorkbook([row()]).SheetNames, ['Облік майна', 'Підсумок'])
  assert.deepEqual(buildWorkbook([row(), row({ id: 2, position_name: OTHER })]).SheetNames,
    ['Облік майна', 'Підсумок', 'Разом'])
})

test('порожній звіт і помилка бази', async () => {
  const empty = setup()
  assert.equal((await exportExcel({ reportPosition: POS, unitName: '' }, empty.repo)).message,
    'На позиції «Чіпс» немає майна для звіту')
  assert.equal((await exportExcel({ reportPosition: '', unitName: '' }, empty.repo)).message, 'Немає майна для звіту')
  const bad = setup([], { failOn: { op: 'select', error: { message: 'down' } } })
  const r = await exportExcel({ reportPosition: '', unitName: '' }, bad.repo)
  assert.equal(r.message, 'Помилка вивантаження Excel!')
  assert.equal(r.isError, true)
})
