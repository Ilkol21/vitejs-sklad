import * as itemsRepository from '../api/itemsRepository.js'
import { round2 } from '../utils/number.js'
import { mergeNotes } from '../domain/notes.js'
import { unitOf } from '../domain/catalog.js'
import { itemParts } from '../domain/itemName.js'
import { isPlaceholderSerial } from '../domain/serial.js'

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

// Серійний номер / KIT унікальний на всіх позиціях
const findSerialClash = async (item, preset, cols, repo) => {
  const { data, error } = await repo.fetchSameBase(preset.name, { withId: true })
  if (error) return { error }
  const sn = (cols.serial || '').toLowerCase()
  const br = (cols.brand || '').toLowerCase()
  const clash = (data || []).find(r => {
    if (r.id === item.id) return false
    const p = itemParts(r)
    return p.serial.toLowerCase() === sn && (preset.kit || p.brand.toLowerCase() === br)
  })
  return { clash }
}

// Нова назва збіглася з наявним рядком (та сама позиція й статус): кількості зливаємо
const mergeOnRename = async (item, newName, form, confirm, repo) => {
  const { data: same, error } = await repo.findSameRow({
    positionName: item.position_name, itemName: newName, status: item.status,
    columns: 'id, quantity, notes', excludeId: item.id
  })
  if (error) return { result: checkError(error) }
  if (!(same && same.length)) return {}

  const target = same[0]
  const total = round2(Number(target.quantity) + Number(item.quantity))
  const question = `Запис «${newName}» уже є (${target.quantity} ${unitOf(newName)}).\nОб'єднати: буде ${total} ${unitOf(newName)}, а цей рядок зникне?`
  if (!confirm(question)) return { result: nothing() }

  const notes = mergeNotes(target.notes, form.notes)
  const { error: mergeErr } = await repo.updateItem(target.id, { quantity: total, notes })
  if (mergeErr) return { result: failure('Помилка об\'єднання: ' + mergeErr.message) }
  const { error: delErr } = await repo.deleteItem(item.id)
  if (delErr) return { result: failure('Помилка видалення: ' + delErr.message) }
  return { result: success(`Об'єднано з наявним рядком: тепер ${total} ${unitOf(newName)}`, { reload: true, close: true }) }
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
  const hasSerial = preset && (preset.kit || preset.needsSerial) && !isPlaceholderSerial(form.serial)
  // Рядок «Невідомо» / «Зафарбовано» може мати кілька одиниць, а реальний номер має лише один запис
  if (hasSerial && Number(item.quantity) > 1 && isPlaceholderSerial(itemParts(item).serial)) {
    return failure(SINGLE_SERIAL_ERROR)
  }
  if (hasSerial) {
    const { clash, error } = await findSerialClash(item, preset, cols, repo)
    if (error) return checkError(error)
    if (clash) return failure(`Такий ${preset.kit ? 'KIT' : 'серійний номер'} уже є: ${clash.position_name}`)
  }

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
