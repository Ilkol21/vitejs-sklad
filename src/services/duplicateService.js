import { round2 } from '../utils/number.js'
import { mergeNotes } from '../domain/notes.js'
import { unitOf } from '../domain/catalog.js'
import { itemParts } from '../domain/itemName.js'
import { failure, success } from './result.js'

// Перевірки дублікатів і зливання рядків під час додавання майна.

// Дрон з іменем один: таке ім'я не повторюється ні на одній позиції (незалежно від статусу)
export const findNamedDroneClash = async (preset, fullDetail, repo) => {
  const { data, error } = await repo.fetchSameBase(preset.name)
  if (error) return { error }
  const taken = (data || []).find(r => itemParts(r).detail.toLowerCase() === fullDetail.toLowerCase())
  return { taken }
}

// Один серійний номер = один запис (на жодній з позицій)
export const findSerialClash = async (preset, brand, serial, repo) => {
  const { data, error } = await repo.fetchSameBase(preset.name)
  if (error) return { error }
  const dup = (data || []).find(r => {
    const p = itemParts(r)
    return p.brand.toLowerCase() === brand.toLowerCase() && p.serial.toLowerCase() === serial.toLowerCase()
  })
  return { dup }
}

// Таке майно вже є на позиції з тим самим статусом: оновлюємо наявний рядок замість дубліката
export const mergeIntoExisting = async (row, { preset, fullName, qty, notes }, repo) => {
  if (preset && preset.presence) {
    const { error } = await repo.updateItem(row.id, { quantity: qty > 0 ? 1 : 0 })
    if (error) return failure('Помилка оновлення: ' + error.message)
    return success(`${preset.name}: ${qty > 0 ? 'є' : 'немає'}`, { reload: true, formPatch: { quantity: 1 } })
  }
  if (qty === 0) {
    return failure(`Уже є: ${row.quantity} ${unitOf(fullName)}. Щоб позначити, що немає, змініть кількість у таблиці на 0`)
  }
  const total = round2(Number(row.quantity) + qty)
  const { error } = await repo.updateItem(row.id, { quantity: total, notes: mergeNotes(row.notes, notes) })
  if (error) return failure('Помилка оновлення: ' + error.message)
  return success(`Таке майно вже є: кількість збільшено, тепер ${total} ${unitOf(fullName)}`, {
    reload: true,
    formPatch: { notes: '', quantity: 1 }
  })
}
