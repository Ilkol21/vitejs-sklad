import { SERIAL_UNKNOWN, SERIAL_PLACEHOLDERS, LEGACY_SERIAL_PLACEHOLDERS } from '../config/app.js'

const ALL_PLACEHOLDERS = [...SERIAL_PLACEHOLDERS, ...LEGACY_SERIAL_PLACEHOLDERS]

// Серійний номер без зайвих пробілів; «невідомо/зафарбовано» будь-яким регістром приводиться до канонічного написання
export const normalizeSerial = s => {
  const t = String(s || '').trim()
  const known = ALL_PLACEHOLDERS.find(p => p.toLowerCase() === t.toLowerCase())
  // Старі окремі «Невідомо» / «Зафарбовано» при збереженні стають однією позначкою
  return known ? SERIAL_UNKNOWN : t
}

// Чи це не номер, а позначка «Невідомо/Зафарбовано» (або стара окрема «Невідомо» / «Зафарбовано»)
export const isPlaceholderSerial = s => ALL_PLACEHOLDERS.includes(normalizeSerial(s))

// Значення для колонки serial: позначки не пишемо в колонку, щоб вони не порушували унікальний індекс серійних номерів
export const serialForColumn = s => (isPlaceholderSerial(s) ? null : s)


// S/N, що починається з префікса (у Старлінка це «KIT»): «KIT123», «kit 123» і «123» приводяться до «KIT123».
// Позначка «Невідомо/Зафарбовано» префіксу не має. Для порожнього значення (або лише префіксу) повертає ''.
// Старі записи були збережені без префікса («20000015486»), тому порівнювати номери треба через цю функцію.
export const withSerialPrefix = (serial, prefix) => {
  const t = normalizeSerial(serial)
  if (!prefix || isPlaceholderSerial(t)) return t
  const rest = t.toLowerCase().startsWith(prefix.toLowerCase()) ? t.slice(prefix.length).trim() : t
  return rest ? prefix + rest : ''
}

// Чи це той самий S/N (без урахування регістру та префіксу)
export const sameSerial = (a, b, prefix) =>
  withSerialPrefix(a, prefix).toLowerCase() === withSerialPrefix(b, prefix).toLowerCase()
