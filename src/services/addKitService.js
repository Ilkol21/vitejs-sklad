import { itemParts, nameWithKit, hasListSeparator } from '../domain/itemName.js'
import { isPlaceholderSerial, withSerialPrefix, sameSerial, serialForColumn } from '../domain/serial.js'
import { addExtraItem, parseExtraQty } from './extraItemService.js'
import { mergeIntoExisting } from './duplicateService.js'
import { failure, insertErrorText } from './result.js'

const checkError = error => failure('Помилка перевірки: ' + error.message)

// S/N Старлінка унікальний на всіх позиціях і версіях. Старі записи можуть бути без префікса KIT,
// тому номери порівнюються без урахування префіксу
const findKitClash = async (preset, kit, repo) => {
  const { data, error } = await repo.fetchSameBase(preset.name)
  if (error) return { error }
  return { taken: (data || []).find(row => sameSerial(itemParts(row).serial, kit, preset.serialPrefix)) }
}

// Текст про роутер після додавання старлінка: { text, failed }
const describeRouter = async (preset, count, form, ctx, repo, okText, failPrefix) => {
  if (!(count > 0)) return { text: '', failed: false }
  const err = await addExtraItem({
    preset, count, positionName: ctx.positionName, status: form.status, category: form.category
  }, repo)
  if (err) return { text: `${failPrefix}${preset.extra.label} не додано: ${err}`, failed: true }
  return { text: okText, failed: false }
}

// Старлінк: версія + один S/N, що починається з «KIT» (кожен Старлінк додається окремо) + необов'язковий роутер.
// Замість номера можна вказати «Невідомо» / «Зафарбовано»: вони не унікальні, тому однакові рядки зливаються.
export const addKitItem = async (preset, form, ctx, repo) => {
  if (!form.variant) return failure(`Оберіть ${preset.variantLabel || 'вид'}`)

  const kit = withSerialPrefix(form.kitNumbers, preset.serialPrefix)
  if (!kit) return failure('Вкажіть S/N')
  if (hasListSeparator(kit)) return failure('Вводьте один S/N: кожен Старлінк додається окремо')

  const extra = parseExtraQty(preset, form.extraQty)
  if (extra.error) return failure(extra.error)

  const fullName = nameWithKit(preset, form.variant, kit)
  const placeholder = isPlaceholderSerial(kit)
  const done = { reload: true, formPatch: { notes: '', kitNumbers: preset.serialPrefix || '', extraQty: '' } }

  if (placeholder) {
    // Такий самий рядок на позиції з тим самим статусом не дублюємо: збільшуємо кількість
    const { data: same, error: sameErr } = await repo.findSameRow({
      positionName: ctx.positionName, itemName: fullName, status: form.status, columns: 'id, quantity, notes'
    })
    if (sameErr) return checkError(sameErr)
    if (same && same.length) {
      const merged = await mergeIntoExisting(same[0], { preset, fullName, qty: 1, notes: form.notes }, repo)
      if (merged.isError) return merged
      const router = await describeRouter(preset, extra.count, form, ctx, repo, ` + ${preset.extra.plural}: ${extra.count}`, ' ')
      return { ...merged, ...done, message: merged.message + router.text, isError: router.failed }
    }
  } else {
    const { taken, error: exErr } = await findKitClash(preset, kit, repo)
    if (exErr) return checkError(exErr)
    if (taken) return failure(`Такий S/N уже є: ${kit} (${taken.position_name})`)
  }

  const { error } = await repo.insertItem({
    position_name: ctx.positionName,
    category: form.category,
    item_name: fullName,
    variant: form.variant,
    serial: serialForColumn(kit),
    status: form.status,
    quantity: 1,
    notes: form.notes
  })
  if (error) {
    console.error('SUPABASE ERROR:', error)
    return failure(insertErrorText(error))
  }

  const router = await describeRouter(preset, extra.count, form, ctx, repo, ` і ${preset.extra.plural}: ${extra.count}`, '. ')
  return {
    ...done,
    message: `Додано «${preset.name} — ${form.variant}», S/N ${kit}${router.text}`,
    isError: router.failed
  }
}
