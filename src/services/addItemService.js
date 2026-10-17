import * as itemsRepository from '../api/itemsRepository.js'
import { round2 } from '../utils/number.js'
import { findPreset, allowsDecimal, quantityColumns } from '../domain/catalog.js'
import { nameWithDetail, nameWithSerial } from '../domain/itemName.js'
import { isPlaceholderSerial, serialForColumn } from '../domain/serial.js'
import { isBlank, parseSegmentLength, parseSerialFields, validateQuantity } from '../domain/validation.js'
import { addExtraItem, parseExtraQty } from './extraItemService.js'
import { addKitItem } from './addKitService.js'
import { findSerialClash, mergeIntoExisting } from './duplicateService.js'
import { addDroneItems } from './addDroneService.js'
import { failure, insertErrorText } from './result.js'

// Додавання майна на позицію.
//   form — поля форми: presetName, status, category, quantity, notes, brand, serial, variant,
//          deviceModel, callsign, customName, kitNumbers, lengthM, extraQty
//   ctx  — { positionName }
// Повертає результат з services/result.js; зміни форми віддає в formPatch.

const checkError = error => failure('Помилка перевірки: ' + error.message)

// Додаткова позиція (павук, роутер): текст для повідомлення і признак помилки
const describeExtra = async (preset, count, form, ctx, repo) => {
  if (!(count > 0)) return { text: '', failed: false }
  const err = await addExtraItem({
    preset, count, positionName: ctx.positionName, status: form.status, category: form.category
  }, repo)
  if (err) return { text: ` ${preset.extra.label} не додано: ${err}`, failed: true }
  return { text: ` + ${preset.extra.plural}: ${count}`, failed: false }
}

export const addItem = async (form, ctx, repo = itemsRepository) => {
  if (!form.presetName) return {}

  const preset = findPreset(form.presetName)
  let fullName = form.presetName
  let qty = round2(form.quantity === '' || form.quantity === null ? NaN : form.quantity)
  let cols = {}
  let extraCount = 0
  // «Невідомо» / «Зафарбовано»: не унікальний номер, тому однакові рядки зливаються кількістю
  let placeholderSerial = false

  if (preset && preset.kit) return addKitItem(preset, form, ctx, repo)
  // Дрони: кількість довільна, імена через кому (кожне — окремий дрон)
  if (preset && preset.callsign) return addDroneItems(preset, form, ctx, repo)

  // Комбінований облік (Лопасті): рядок «просто є / немає» без кількості (колонка no_count) або зі штуками
  const noCount = !!(preset && preset.presenceOrCount && form.noCount)

  // Необов'язковий серійний номер (зарядка до рації): без номера це звичайне майно з кількістю
  const plainSerial = !!(preset && preset.needsSerial && preset.serialOptional && isBlank(form.serial))

  if (preset && preset.needsSerial && !plainSerial) {
    const fields = parseSerialFields(
      preset,
      { brand: form.brand, serial: form.serial, model: form.deviceModel },
      'Вводьте один серійний номер без ком: кожна одиниця додається окремо'
    )
    if (fields.error) return failure(fields.error)
    const { brand, model, serial } = fields
    fullName = nameWithSerial(preset, brand, model, serial)
    qty = 1
    cols = { brand: brand || null, variant: model || null, serial: serialForColumn(serial) }
    placeholderSerial = isPlaceholderSerial(serial)

    const extra = parseExtraQty(preset, form.extraQty)
    if (extra.error) return failure(extra.error)
    extraCount = extra.count

    if (!placeholderSerial) {
      const { dup, error: dupErr } = await findSerialClash(preset, brand, serial, repo)
      if (dupErr) return checkError(dupErr)
      if (dup) return failure('Такий серійний номер уже є: ' + dup.position_name)
    }
  } else if (preset && preset.variants) {
    // Необов'язковий вид (переноски): без нього запис лишається просто з назвою й кількістю
    if (form.variant || !preset.variantOptional) {
      if (!form.variant) return failure(`Оберіть ${preset.variantLabel || 'вид'}`)
      fullName = nameWithDetail(preset.name, form.variant)
      cols = { variant: form.variant }
    }
  } else if (preset && preset.freeName) {
    const n = form.customName.trim()
    if (!n) return failure('Вкажіть назву')
    fullName = nameWithDetail(preset.name, n)
    cols = { variant: n }
  } else if (preset && preset.lengthM && !(preset.lengthOptional && isBlank(form.lengthM))) {
    // Довжина необов'язкова не скрізь: без неї запис лишається просто з назвою й кількістю
    const len = parseSegmentLength(form.lengthM)
    if (len.error) return failure(len.error)
    fullName = nameWithDetail(preset.name, `${len.value} м`)
    cols = { variant: `${len.value} м` }
  }

  if (noCount) {
    qty = Number(form.quantity) > 0 ? 1 : 0
    cols = { ...cols, no_count: true }
  }

  const qtyError = validateQuantity(qty, allowsDecimal(fullName))
  if (qtyError) return failure(qtyError)

  // Таке саме майно на позиції з тим самим статусом не дублюємо: додаємо кількість до наявного рядка
  if (!(preset && preset.needsSerial) || placeholderSerial || plainSerial) {
    const { data: same, error: sameErr } = await repo.findSameRow({
      positionName: ctx.positionName, itemName: fullName, status: form.status, columns: quantityColumns(fullName, 'id, quantity, notes')
    })
    if (sameErr) return checkError(sameErr)
    if (same && same.length) {
      const merged = await mergeIntoExisting(same[0], { preset, fullName, qty, notes: form.notes, noCount }, repo)
      if (merged.isError || !(extraCount > 0)) return merged
      const extra = await describeExtra(preset, extraCount, form, ctx, repo)
      return { ...merged, message: merged.message + extra.text, isError: extra.failed, formPatch: { ...merged.formPatch, serial: '', extraQty: '' } }
    }
  }

  const { error } = await repo.insertItem({
    position_name: ctx.positionName,
    category: form.category,
    item_name: fullName,
    status: form.status,
    quantity: qty,
    notes: form.notes,
    ...cols
  })
  if (error) {
    console.error('SUPABASE ERROR:', error)
    return failure(insertErrorText(error))
  }

  const extra = await describeExtra(preset, extraCount, form, ctx, repo)
  return {
    message: `Додано на позицію!${extra.text}`,
    isError: extra.failed,
    reload: true,
    formPatch: {
      notes: '', quantity: 1, serial: '', deviceModel: '', customName: '',
      callsign: '', lengthM: '', extraQty: ''
    }
  }
}
