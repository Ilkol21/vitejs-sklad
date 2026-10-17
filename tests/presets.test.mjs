import test from 'node:test'
import assert from 'node:assert/strict'
import { PRESET_ITEMS } from '../src/config/presets.js'

const variantsOf = name => PRESET_ITEMS.find(p => p.name === name).variants

test('каталог: назви пунктів і варіанти не повторюються', () => {
  const names = PRESET_ITEMS.map(p => p.name)
  assert.equal(new Set(names).size, names.length)
  for (const p of PRESET_ITEMS.filter(x => x.variants)) {
    assert.equal(new Set(p.variants).size, p.variants.length, p.name)
  }
})

test('БК: є патрони 5.45, старі варіанти на місці', () => {
  assert.deepEqual(variantsOf('БК'), ['ВОГ-17', 'Патрони 5.56', 'Патрони 5.45'])
})

test('Скиди: додані варіанти для 4 Pro і Матріс, старі лишилися', () => {
  assert.deepEqual(variantsOf('Скиди'), ['Одинарний', 'Подвійний', 'Для 4 Pro', 'Для Матріс'])
})

test('Батарейки до дронів: додано «Matrice шиті» і «Matrice не шиті», старий «Матріс» лишився', () => {
  const v = variantsOf('Батарейки до дронів')
  for (const name of ['Аутель', 'Мавік 3', 'Матріс', 'Мавік 4 Pro', 'Matrice шиті', 'Matrice не шиті']) assert.ok(v.includes(name), name)
})

test('Лопасті: звичайне майно з вибором моделі та кількістю, без «Є / Немає»', () => {
  const p = PRESET_ITEMS.find(x => x.name === 'Лопасті')
  assert.equal(p.presence, undefined)
  assert.deepEqual(p.variants, ['Mavic 4 Pro', 'Matrice', 'Outel'])
})
