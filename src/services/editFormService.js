import { itemParts, splitCallsign, cleanCallsign, hasListSeparator, nameWithDetail, nameWithSerial, nameWithKit } from '../domain/itemName.js'
import { presetOf } from '../domain/catalog.js'
import { parseSegmentLength, parseSerialFields } from '../domain/validation.js'
import { normalizeSerial, withSerialPrefix, serialForColumn } from '../domain/serial.js'

// Форма редагування: заповнення з запису і перетворення назад у нову назву та колонки.

export const emptyEditForm = () => ({
  fullName: '', brand: '', serial: '', variant: '', name: '', model: '', callsign: '', length: '', notes: '', noCount: false
})

// Запис -> поля форми
export const editFormFromItem = item => {
  const p = itemParts(item)
  const preset = presetOf(item.item_name)
  const form = {
    fullName: item.item_name,
    brand: p.brand,
    // Старі записи Старлінка були без префікса KIT: у формі вони показуються вже з ним
    serial: preset && preset.serialPrefix ? withSerialPrefix(p.serial, preset.serialPrefix) : normalizeSerial(p.serial),
    variant: p.detail,
    name: p.detail,
    model: p.detail,
    length: preset && preset.lengthM ? String(parseFloat(p.detail) || '') : '',
    callsign: '',
    notes: item.notes || '',
    noCount: !!item.no_count
  }
  if (preset && preset.callsign) {
    const parts = splitCallsign(p.detail)
    form.variant = parts.model
    form.callsign = parts.name
  }
  return form
}

// Комбінований облік (Лопасті): «просто є» зберігається в колонці no_count, а кількість стає 1 або 0.
// Колонку надсилаємо лише коли режим змінився, щоб звичайне редагування не залежало від наявності колонки
const noCountCols = (item, f) => {
  const next = !!f.noCount
  if (next === !!item.no_count) return {}
  const cols = { no_count: next }
  if (next) cols.quantity = Number(item.quantity) > 0 ? 1 : 0
  return cols
}

// Поля форми -> { newName, cols } або { error }.
// Перевірка унікальності імені дрона потребує бази й виконується окремо (див. editItemService).
export const buildEditedItem = (item, preset, f) => {
  if (preset && preset.kit) {
    const v = f.variant.trim()
    const kit = withSerialPrefix(f.serial, preset.serialPrefix)
    if (!v) return { error: `Оберіть ${preset.variantLabel || 'вид'}` }
    if (!kit) return { error: 'Вкажіть S/N' }
    if (hasListSeparator(kit)) return { error: 'Вводьте один S/N' }
    return { newName: nameWithKit(preset, v, kit), cols: { variant: v, brand: null, serial: serialForColumn(kit) } }
  }
  if (preset && preset.needsSerial) {
    const fields = parseSerialFields(preset, f, 'Вводьте один серійний номер без ком')
    if (fields.error) return { error: fields.error }
    const { brand, model, serial } = fields
    return {
      newName: nameWithSerial(preset, brand, model, serial),
      cols: { variant: model || null, brand: brand || null, serial: serialForColumn(serial) }
    }
  }
  if (preset && preset.variants) {
    const v = f.variant.trim()
    // Старий рядок без моделі («Лопасті» з «Є / Немає») можна редагувати, не вибираючи модель
    if (!v && preset.presenceOrCount && item.item_name === preset.name) {
      return { newName: item.item_name, cols: noCountCols(item, f) }
    }
    if (!v) return { error: `Оберіть ${preset.variantLabel || 'вид'}` }
    let detail = v
    let callsignName = ''
    if (preset.callsign) {
      callsignName = cleanCallsign(f.callsign)
      if (callsignName) {
        if (Number(item.quantity) > 1) return { error: 'Дрон з іменем один: спершу зменште кількість до 1' }
        detail = `${v} "${callsignName}"`
      }
    }
    const cols = { variant: detail, ...noCountCols(item, f) }
    return { newName: nameWithDetail(preset.name, detail), cols, callsignName }
  }
  if (preset && preset.freeName) {
    const n = f.name.trim()
    if (!n) return { error: 'Вкажіть назву' }
    return { newName: nameWithDetail(preset.name, n), cols: { variant: n } }
  }
  if (preset && preset.lengthM) {
    const len = parseSegmentLength(f.length)
    if (len.error) return { error: len.error }
    return { newName: nameWithDetail(preset.name, `${len.value} м`), cols: { variant: `${len.value} м` } }
  }
  if (!preset) {
    // Старий запис, якого немає в поточному списку: дозволяємо виправити назву повністю
    const n = f.fullName.trim()
    if (!n) return { error: 'Вкажіть назву' }
    return { newName: n, cols: {} }
  }
  return { newName: item.item_name, cols: {} }
}
