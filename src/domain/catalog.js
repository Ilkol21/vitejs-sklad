import { PRESET_ITEMS } from '../config/presets.js'
import { DEFAULT_MEASURE_UNIT, NAME_SEPARATOR } from '../config/app.js'

// Пункт каталогу за назвою: «Дрони»
export const findPreset = name => PRESET_ITEMS.find(p => p.name === name)

// Пункт каталогу за повною назвою запису: «Дрони — Mavic 3T» -> пресет «Дрони»
export const presetOf = fullName => {
  const base = String(fullName || '').split(NAME_SEPARATOR)[0]
  return findPreset(base)
}

export const unitOf = name => {
  const p = presetOf(name)
  return (p && p.unit) || DEFAULT_MEASURE_UNIT
}

// Літри й метри можуть бути дробовими, решта лише цілими
export const allowsDecimal = name => unitOf(name) === 'л' || unitOf(name) === 'м'

export const isPresence = name => {
  const p = presetOf(name)
  return !!(p && p.presence)
}

// Кількість для тексту: для «Є / Немає» слово, для решти число з одиницею
export const qtyText = (name, q) =>
  isPresence(name) ? (Number(q) > 0 ? 'є' : 'немає') : `${q} ${unitOf(name)}`

// Для планшетів назва пристрою й модель йдуть в одну колонку «Марка» у звіті
export const mergesModel = base => {
  const p = findPreset(base)
  return !!(p && p.hasModel)
}

// Підпис поля «вид»: «версію» -> «Версію», без підпису -> «Вид»
export const variantFieldLabel = preset =>
  preset.variantLabel ? preset.variantLabel.charAt(0).toUpperCase() + preset.variantLabel.slice(1) : 'Вид'
