import * as itemsRepository from '../api/itemsRepository.js'
import { round2 } from '../utils/number.js'
import { findPreset, allowsDecimal } from '../domain/catalog.js'
import { cleanCallsign, nameWithDetail, nameWithSerial } from '../domain/itemName.js'
import { parseSegmentLength, parseSerialFields, validateQuantity } from '../domain/validation.js'
import { addExtraItem, parseExtraQty } from './extraItemService.js'
import { addKitItem } from './addKitService.js'
import { findNamedDroneClash, findSerialClash, mergeIntoExisting } from './duplicateService.js'
import { failure, insertErrorText } from './result.js'

// Додавання майна на позицію.
//   form — поля форми: presetName, status, category, quantity, notes, brand, serial, variant,
//          deviceModel, callsign, customName, kitNumbers, lengthM, extraQty
//   ctx  — { positionName }
// Повертає результат з services/result.js; зміни форми віддає в formPatch.

const checkError = error => failure('Помилка перевірки: ' + error.message)

export const addItem = async (form, ctx, repo = itemsRepository) => {
  if (!form.presetName) return {}

  const preset = findPreset(form.presetName)
  let fullName = form.presetName
  let qty = round2(form.quantity === '' || form.quantity === null ? NaN : form.quantity)
  let cols = {}
  let extraCount = 0

  if (preset && preset.kit) return addKitItem(preset, form, ctx, repo)

  if (preset && preset.needsSerial) {
    const fields = parseSerialFields(
      preset,
      { brand: form.brand, serial: form.serial, model: form.deviceModel },
      'Вводьте один серійний номер без ком: кожна одиниця додається окремо'
    )
    if (fields.error) return failure(fields.error)
    const { brand, model, serial } = fields
    fullName = nameWithSerial(preset, brand, model, serial)
    qty = 1
    cols = { brand: brand || null, variant: model || null, serial }

    const extra = parseExtraQty(preset, form.extraQty)
    if (extra.error) return failure(extra.error)
    extraCount = extra.count

    const { dup, error: dupErr } = await findSerialClash(preset, brand, serial, repo)
    if (dupErr) return checkError(dupErr)
    if (dup) return failure('Такий серійний номер уже є: ' + dup.position_name)
  } else if (preset && preset.variants) {
    if (!form.variant) return failure(`Оберіть ${preset.variantLabel || 'вид'}`)
    let v = form.variant
    if (preset.callsign) {
      const nm = cleanCallsign(form.callsign)
      if (nm) {
        v = `${form.variant} "${nm}"`
        qty = 1
        const { taken, error: namedErr } = await findNamedDroneClash(preset, v, repo)
        if (namedErr) return checkError(namedErr)
        if (taken) return failure(`Дрон з іменем «${nm}» уже є: ${taken.position_name}`)
      }
    }
    fullName = nameWithDetail(preset.name, v)
    cols = { variant: v }
  } else if (preset && preset.freeName) {
    const n = form.customName.trim()
    if (!n) return failure('Вкажіть назву')
    fullName = nameWithDetail(preset.name, n)
    cols = { variant: n }
  } else if (preset && preset.lengthM) {
    const len = parseSegmentLength(form.lengthM)
    if (len.error) return failure(len.error)
    fullName = nameWithDetail(preset.name, `${len.value} м`)
    cols = { variant: `${len.value} м` }
  }

  const qtyError = validateQuantity(qty, allowsDecimal(fullName))
  if (qtyError) return failure(qtyError)

  // Таке саме майно на позиції з тим самим статусом не дублюємо: додаємо кількість до наявного рядка
  if (!(preset && preset.needsSerial)) {
    const { data: same, error: sameErr } = await repo.findSameRow({
      positionName: ctx.positionName, itemName: fullName, status: form.status, columns: 'id, quantity, notes'
    })
    if (sameErr) return checkError(sameErr)
    if (same && same.length) return mergeIntoExisting(same[0], { preset, fullName, qty, notes: form.notes }, repo)
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

  let extraMsg = ''
  let extraFailed = false
  if (extraCount > 0) {
    const extraErr = await addExtraItem({
      preset, count: extraCount, positionName: ctx.positionName, status: form.status, category: form.category
    }, repo)
    if (extraErr) { extraFailed = true; extraMsg = ` ${preset.extra.label} не додано: ${extraErr}` }
    else extraMsg = ` + ${preset.extra.plural}: ${extraCount}`
  }
  return {
    message: `Додано на позицію!${extraMsg}`,
    isError: extraFailed,
    reload: true,
    formPatch: {
      notes: '', quantity: 1, serial: '', deviceModel: '', customName: '',
      callsign: '', lengthM: '', extraQty: ''
    }
  }
}
