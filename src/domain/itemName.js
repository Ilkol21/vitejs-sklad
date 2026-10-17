import { NAME_SEPARATOR, MAX_CALLSIGN_LENGTH } from '../config/app.js'
import { isPlaceholderSerial } from './serial.js'

// Розбір назви запису:
// «Рація — Motorola, S/N 123» -> назва / марка / серійний номер
// «Дрони — Mavic 3T» -> назва / вид
export const parseItemName = full => {
  const s = String(full || '')
  const i = s.indexOf(NAME_SEPARATOR)
  if (i < 0) return { base: s, detail: '', brand: '', serial: '' }
  const base = s.slice(0, i)
  const rest = s.slice(i + NAME_SEPARATOR.length)
  const m = rest.match(/^(?:(.*?),\s*)?(S\/N|KIT)\s+(.+)$/)
  if (m && m[2] === 'KIT') return { base, detail: (m[1] || '').trim(), brand: '', serial: m[3].trim() }
  if (m) return { base, detail: '', brand: (m[1] || '').trim(), serial: m[3].trim() }
  return { base, detail: rest, brand: '', serial: '' }
}

// Складові запису: з колонок variant / brand / serial, а для старих записів (без колонок) розбираємо назву
export const itemParts = item => {
  const parsed = parseItemName(item.item_name)
  if (!(item.variant || item.brand || item.serial)) return parsed
  // serial порожній, а в назві є S/N: це позначка «Невідомо» / «Зафарбовано»
  return { base: parsed.base, detail: item.variant || '', brand: item.brand || '', serial: item.serial || (isPlaceholderSerial(parsed.serial) ? parsed.serial : '') }
}

// Ім'я дрона: без лапок і зайвих пробілів; у назві записується в лапках
export const cleanCallsign = s =>
  String(s || '').replace(/["«»“”„]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_CALLSIGN_LENGTH)

// «Mavic 4 Pro "Панда"» -> { model: 'Mavic 4 Pro', name: 'Панда' }
export const splitCallsign = s => {
  const m = String(s || '').match(/^(.*?)\s+"([^"]*)"\s*$/)
  return m ? { model: m[1].trim(), name: m[2].trim() } : { model: String(s || '').trim(), name: '' }
}

// У полі має бути одне значення: коми, крапки з комою й переноси означають спробу ввести список
export const hasListSeparator = s => /[,;\n]/.test(s)

// Повна назва запису для різних видів майна
export const nameWithDetail = (base, detail) => `${base}${NAME_SEPARATOR}${detail}`

export const nameWithSerial = (preset, brand, model, serial) =>
  preset.noBrand
    ? `${preset.name}${NAME_SEPARATOR}S/N ${serial}`
    : `${preset.name}${NAME_SEPARATOR}${[brand, model].filter(Boolean).join(' ')}, S/N ${serial}`

// Старлінк: «Старлінк — Міні, S/N KIT30000123» (префікс KIT входить у сам S/N). Старі записи «..., KIT 123» все ще розпізнаються.
export const nameWithKit = (preset, variant, serial) => `${preset.name}${NAME_SEPARATOR}${variant}, S/N ${serial}`

// Шаблон пошуку усіх записів одного найменування
export const likePatternFor = baseName => `${baseName}${NAME_SEPARATOR}%`
