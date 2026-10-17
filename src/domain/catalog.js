import { PRESET_ITEMS } from '../config/presets.js'
import { withSerialPrefix } from './serial.js'
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

// Пункт, який можна вести і як «Є / Немає», і з кількістю: режим обирається для кожного рядка
export const isPresenceOrCount = name => {
  const p = presetOf(name)
  return !!(p && p.presenceOrCount)
}

// Чи рядок обліковується як «Є / Немає» (без кількості): за пунктом каталогу або за прапорцем no_count у рядка
export const isPresenceRow = item =>
  isPresence(item.item_name) || (isPresenceOrCount(item.item_name) && !!item.no_count)

// Колонки для запиту рядка-кандидата на зливання: колонку no_count запитуємо лише для пунктів з комбінованим обліком,
// щоб робота решти майна не залежала від того, чи вже додана ця колонка в базі
export const quantityColumns = (name, columns) => (isPresenceOrCount(name) ? `${columns}, no_count` : columns)

// Кількість для тексту: для «Є / Немає» слово, для решти число з одиницею.
// noCount — прапорець рядка «без кількості» для пунктів з комбінованим обліком
export const qtyText = (name, q, noCount = false) =>
  isPresence(name) || (noCount && isPresenceOrCount(name))
    ? (Number(q) > 0 ? 'є' : 'немає')
    : `${q} ${unitOf(name)}`

// Для планшетів назва пристрою й модель йдуть в одну колонку «Марка» у звіті
export const mergesModel = base => {
  const p = findPreset(base)
  return !!(p && p.hasModel)
}

// Підпис поля «вид»: «версію» -> «Версію», без підпису -> «Вид»
export const variantFieldLabel = preset =>
  preset.variantLabel ? preset.variantLabel.charAt(0).toUpperCase() + preset.variantLabel.slice(1) : 'Вид'


// S/N для показу у звіті: у пунктів з префіксом (Старлінк → KIT) номер завжди з ним, так само як у старих записах без префікса
export const displaySerial = (base, serial) => {
  const p = findPreset(base)
  return p && p.serialPrefix && serial ? withSerialPrefix(serial, p.serialPrefix) : serial
}
