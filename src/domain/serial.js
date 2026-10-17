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
