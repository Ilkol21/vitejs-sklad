import * as itemsRepository from '../api/itemsRepository.js'
import { mergeNotes } from '../domain/notes.js'
import { qtyText, quantityColumns } from '../domain/catalog.js'
import { mergeRowQuantities } from '../domain/quantity.js'
import { itemParts } from '../domain/itemName.js'
import { isPlaceholderSerial, sameSerial } from '../domain/serial.js'
import { isBlank } from '../domain/validation.js'

const SINGLE_SERIAL_ERROR = 'Серійний номер один: спершу зменшіть кількість до 1'
import { buildEditedItem } from './editFormService.js'
import { failure, success, nothing, insertErrorText } from './result.js'

// Збереження змін запису.
//   item    — запис, що редагується
//   preset  — його пункт каталогу (або undefined для старих записів)
//   form    — поля форми редагування
//   confirm — функція підтвердження зливання (за замовчуванням window.confirm)

const checkError = error => failure('Помилка перевірки: ' + error.message)

// Ім'я дрона не повторюється на інших записах
const findCallsignClash = async (item, preset, detail, repo) => {
  const { data, error } = await repo.fetchSameBase(preset.name, { withId: true })
  if (error) return { error }
  const clash = (data || []).find(r => r.id !== item.id && itemParts(r).detail.toLowerCase() === detail.toLowerCase())
  return { clash }
}

// Серійний номер (у Старлінка з префіксом KIT) унікальний на всіх позиціях
const findSerialClash = async (item, preset, cols, repo) => {
  const { data, error } = await repo.fetchSameBase(preset.name, { withId: true })
  if (error) return { error }
  const sn = cols.serial || ''
  const br = (cols.brand || '').toLowerCase()
  const clash = (data || []).find(r => {
    if (r.id === item.id) return false
    const p = itemParts(r)
    return sameSerial(p.serial, sn, preset.serialPrefix) && (preset.kit || p.brand.toLowerCase() === br)
  })
  return { clash }
}

// Нова назва збіглася з наявним рядком (та сама позиція й статус): кількості зливаємо
const mergeOnRename = async (item, newName, form, confirm, repo) => {
  const { data: same, error } = await repo.findSameRow({
    positionName: item.position_name, itemName: newName, status: item.status,
    columns: quantityColumns(newName, 'id, quantity, notes'), excludeId: item.id
  })
  if (error) return { result: checkError(error) }
  if (!(same && same.length)) return {}

  const target = same[0]
  // Рядок, що зливається, має режим обліку з форми; «Є» й кількість не мішаються
  const merged = mergeRowQuantities(target, { ...item, no_count: form.noCount }, newName)
  if (merged.error) return { result: failure(merged.error) }
  const total = merged.total
  const question = `Запис «${newName}» уже є (${qtyText(newName, target.quantity, target.no_count)}).\nОб'єднати: буде ${qtyText(newName, total, merged.noCount)}, а цей рядок зникне?`
  if (!confirm(question)) return { result: nothing() }

  const notes = mergeNotes(target.notes, form.notes)
  const { error: mergeErr } = await repo.updateItem(target.id, { quantity: total, notes })
  if (mergeErr) return { result: failure('Помилка об\'єднання: ' + mergeErr.message) }
  const { error: delErr } = await repo.deleteItem(item.id)
  if (delErr) return { result: failure('Помилка видалення: ' + delErr.message) }
  return { result: success(`Об'єднано з наявним рядком: тепер ${qtyText(newName, total, merged.noCount)}`, { reload: true, close: true }) }
}

// Одна одиниця з номером виділяється в новий рядок, а в наявному кількість зменшується на 1.
// Спершу додаємо новий рядок: якщо номер зайнятий базою, кількість наявного не змінюється
const splitSerialOff = async (item, newName, cols, form, repo) => {
  const { error: insertErr } = await repo.insertItem({
    position_name: item.position_name, category: item.category, item_name: newName, status: item.status,
    quantity: 1, notes: form.notes.trim(), ...cols
  })
  if (insertErr) {
    console.error('SUPABASE ERROR:', insertErr)
    return failure(insertErrorText(insertErr))
  }
  const left = Number(item.quantity) - 1
  const { error } = await repo.updateItem(item.id, { quantity: left })
  if (error) return failure('Помилка оновлення: ' + error.message)
  return success(`Номер додано одній одиниці, ще ${left} без номера`, { reload: true, close: true })
}

export const saveEdit = async (item, preset, form, { confirm = window.confirm.bind(window) } = {}, repo = itemsRepository) => {
  if (!item) return nothing()

  const built = buildEditedItem(item, preset, form)
  if (built.error) return failure(built.error)
  const { newName, cols } = built

  if (preset && preset.variants && preset.callsign && built.callsignName) {
    const { clash, error } = await findCallsignClash(item, preset, cols.variant, repo)
    if (error) return checkError(error)
    if (clash) return failure(`Дрон з іменем «${built.callsignName}» уже є: ${clash.position_name}`)
  }

  // Унікальний номер / KIT; позначки «Невідомо» / «Зафарбовано» унікальними не є, тому зливаються
  // Порожній номер у пункта без обов'язкового S/N унікальним не є
  const hasSerial = preset && (preset.kit || preset.needsSerial) && !isPlaceholderSerial(form.serial) && !isBlank(form.serial)
  // Рядок «Невідомо» / «Зафарбовано» або без номера може мати кілька одиниць, а реальний номер має лише один запис
  const oldSerial = itemParts(item).serial
  // Додати номер одній з кількох одиниць без номера (зарядка до рації): вона стає окремим записом, решта лишається без номера
  const splitOff = !!(hasSerial && preset.serialOptional && Number(item.quantity) > 1 && isBlank(oldSerial))
  if (!splitOff && hasSerial && Number(item.quantity) > 1 && (isPlaceholderSerial(oldSerial) || isBlank(oldSerial))) {
    return failure(SINGLE_SERIAL_ERROR)
  }
  if (hasSerial) {
    const { clash, error } = await findSerialClash(item, preset, cols, repo)
    if (error) return checkError(error)
    if (clash) return failure(`Такий ${preset.kit ? 'S/N' : 'серійний номер'} уже є: ${clash.position_name}`)
  }

  if (splitOff) return splitSerialOff(item, newName, cols, form, repo)

  if (newName !== item.item_name && !hasSerial) {
    const { result } = await mergeOnRename(item, newName, form, confirm, repo)
    if (result) return result
  }

  const { error } = await repo.updateItem(item.id, { item_name: newName, notes: form.notes.trim(), ...cols })
  if (error) {
    console.error('SUPABASE ERROR:', error)
    return failure(insertErrorText(error))
  }
  return success('Зміни збережено', { reload: true, close: true })
}
