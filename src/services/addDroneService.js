import { quantityColumns } from '../domain/catalog.js'
import { parseCallsigns, nameWithDetail } from '../domain/itemName.js'
import { validateQuantity } from '../domain/validation.js'
import { round2 } from '../utils/number.js'
import { findNamedDroneClash, mergeIntoExisting } from './duplicateService.js'
import { failure, insertErrorText } from './result.js'

// Додавання дронів. Кількість — скільки вкажуть. Імена через кому (необов'язково): кожне ім'я — окремий дрон
// з кількістю 1, а решта кількості (загальна мінус кількість імен) додається звичайним рядком моделі.
// Приклад: модель Mavic 3T, кількість 5, імена «Панда, Лис» -> 2 іменні + 3 без імені.

const checkError = error => failure('Помилка перевірки: ' + error.message)

// Імена без повторів у самому списку (без урахування регістру): повертає ім'я в написанні, яке ввели першим
const findRepeatedName = names => {
  const seen = new Map()
  for (const n of names) {
    const key = n.toLowerCase()
    if (seen.has(key)) return seen.get(key)
    seen.set(key, n)
  }
  return null
}

export const addDroneItems = async (preset, form, ctx, repo) => {
  if (!form.variant) return failure(`Оберіть ${preset.variantLabel || 'вид'}`)

  const qty = round2(form.quantity === '' || form.quantity === null ? NaN : form.quantity)
  const qtyError = validateQuantity(qty, false)
  if (qtyError) return failure(qtyError)

  const names = parseCallsigns(form.callsign)
  const repeated = findRepeatedName(names)
  if (repeated) return failure(`Ім'я «${repeated}» вказано кілька разів`)
  // Імен не може бути більше, ніж дронів: кожне ім'я — окремий дрон
  if (names.length > qty) {
    return failure(`Імен більше, ніж дронів: ${names.length} імен на ${qty} шт. Збільште кількість або приберіть імена`)
  }

  // Ім'я дрона не повторюється ні на одній позиції (незалежно від статусу); перевіряємо всі до першої зміни в базі
  const rows = []
  for (const nm of names) {
    const detail = `${form.variant} "${nm}"`
    const { taken, error } = await findNamedDroneClash(preset, detail, repo)
    if (error) return checkError(error)
    if (taken) return failure(`Дрон з іменем «${nm}» уже є: ${taken.position_name}`)
    rows.push({
      position_name: ctx.positionName,
      category: form.category,
      item_name: nameWithDetail(preset.name, detail),
      variant: detail,
      status: form.status,
      quantity: 1,
      notes: form.notes
    })
  }

  const unnamed = round2(qty - names.length)
  const fullName = nameWithDetail(preset.name, form.variant)
  let mergeResult = null

  // Решта кількості — дрони без імені: зливаються з уже наявним рядком тієї ж моделі та статусу
  if (unnamed > 0 || names.length === 0) {
    const { data: same, error: sameErr } = await repo.findSameRow({
      positionName: ctx.positionName, itemName: fullName, status: form.status,
      columns: quantityColumns(fullName, 'id, quantity, notes')
    })
    if (sameErr) return checkError(sameErr)
    if (same && same.length) {
      // Для дронів без імені нуль допустимий лише як позначка «немає», тому зливання робить та ж функція, що й раніше
      mergeResult = { row: same[0], qty: unnamed }
    } else {
      rows.push({
        position_name: ctx.positionName,
        category: form.category,
        item_name: fullName,
        variant: form.variant,
        status: form.status,
        quantity: unnamed,
        notes: form.notes
      })
    }
  }

  if (rows.length) {
    const { error } = await repo.insertItems(rows)
    if (error) {
      console.error('SUPABASE ERROR:', error)
      return failure(insertErrorText(error))
    }
  }

  const formPatch = { notes: '', quantity: 1, callsign: '' }
  if (mergeResult) {
    const merged = await mergeIntoExisting(mergeResult.row, {
      preset, fullName, qty: mergeResult.qty, notes: form.notes
    }, repo)
    if (merged.isError) return merged
    const named = names.length ? ` Іменних дронів додано: ${names.length}.` : ''
    return { ...merged, message: merged.message + named, formPatch: { ...merged.formPatch, ...formPatch } }
  }

  const message = names.length
    ? `Додано на позицію: ${qty} шт., у тому числі з іменами: ${names.join(', ')}`
    : 'Додано на позицію!'
  return { message, isError: false, reload: true, formPatch }
}
