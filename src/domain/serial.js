import { SERIAL_PLACEHOLDERS } from '../config/app.js'

// Серійний номер без зайвих пробілів; «невідомо» / «ЗАФАРБОВАНО» приводяться до канонічного написання
export const normalizeSerial = s => {
  const t = String(s || '').trim()
  return SERIAL_PLACEHOLDERS.find(p => p.toLowerCase() === t.toLowerCase()) || t
}

// Чи це не номер, а позначка «Невідомо» / «Зафарбовано»
export const isPlaceholderSerial = s => SERIAL_PLACEHOLDERS.includes(normalizeSerial(s))

// Значення для колонки serial: позначки не пишемо в колонку, щоб вони не порушували унікальний індекс серійних номерів
export const serialForColumn = s => (isPlaceholderSerial(s) ? null : s)
