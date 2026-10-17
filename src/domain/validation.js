import { MAX_SEGMENT_LENGTH_M } from '../config/app.js'
import { round2 } from '../utils/number.js'
import { hasListSeparator } from './itemName.js'
import { normalizeSerial } from './serial.js'

// Перевірки полів форми. Кожна повертає { value } або { error }, щоб не змішувати перевірку з показом повідомлень.

// Довжина одного відрізка в метрах (кабель): число більше 0
export const parseSegmentLength = raw => {
  const len = round2(String(raw).trim() === '' ? NaN : raw)
  if (!Number.isFinite(len) || len <= 0 || len > MAX_SEGMENT_LENGTH_M) {
    return { error: 'Вкажіть довжину відрізка в метрах (більше 0)' }
  }
  return { value: len }
}

// Марка / модель / серійний номер для майна з серійним номером.
// listError — текст помилки, якщо введено кілька номерів
export const parseSerialFields = (preset, fields, listError) => {
  const brand = preset.noBrand ? '' : String(fields.brand).trim()
  const serial = normalizeSerial(fields.serial)
  const model = preset.hasModel ? String(fields.model || '').trim() : ''
  if (!preset.noBrand && !brand) return { error: preset.hasModel ? 'Вкажіть назву пристрою' : 'Вкажіть марку' }
  if (!serial) return { error: 'Вкажіть серійний номер' }
  if (preset.hasModel && !model) return { error: 'Вкажіть модель' }
  if (hasListSeparator(brand + model + serial)) return { error: listError }
  return { brand, model, serial }
}

// Кількість: ціле число (або дробове для літрів і метрів), не менше 0
export const validateQuantity = (qty, decimalAllowed) => {
  if (!Number.isFinite(qty) || qty < 0) return 'Вкажіть кількість (0 або більше)'
  if (!decimalAllowed && !Number.isInteger(qty)) return 'Кількість має бути цілим числом'
  return null
}
