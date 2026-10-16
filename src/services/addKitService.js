import { itemParts, nameWithKit, hasListSeparator } from '../domain/itemName.js'
import { addExtraItem, parseExtraQty } from './extraItemService.js'
import { failure, insertErrorText } from './result.js'

// Старлінк: версія + один номер KIT (кожен Старлінк додається окремо) + необов'язковий роутер
export const addKitItem = async (preset, form, ctx, repo) => {
  if (!form.variant) return failure(`Оберіть ${preset.variantLabel || 'вид'}`)

  const kit = form.kitNumbers.trim()
  if (!kit) return failure('Вкажіть номер KIT')
  if (hasListSeparator(kit)) return failure('Вводьте один номер KIT: кожен Старлінк додається окремо')

  const extra = parseExtraQty(preset, form.extraQty)
  if (extra.error) return failure(extra.error)

  // Номер KIT унікальний на всіх позиціях і версіях
  const { data: existing, error: exErr } = await repo.fetchSameBase(preset.name)
  if (exErr) return failure('Помилка перевірки: ' + exErr.message)
  const taken = (existing || []).find(row => itemParts(row).serial.toUpperCase() === kit.toUpperCase())
  if (taken) return failure(`Такий KIT уже є: ${kit} (${taken.position_name})`)

  const { error } = await repo.insertItem({
    position_name: ctx.positionName,
    category: form.category,
    item_name: nameWithKit(preset, form.variant, kit),
    variant: form.variant,
    serial: kit,
    status: form.status,
    quantity: 1,
    notes: form.notes
  })
  if (error) {
    console.error('SUPABASE ERROR:', error)
    return failure(insertErrorText(error))
  }

  let extraMsg = ''
  let extraFailed = false
  if (extra.count > 0) {
    const extraErr = await addExtraItem({
      preset, count: extra.count, positionName: ctx.positionName, status: form.status, category: form.category
    }, repo)
    if (extraErr) { extraFailed = true; extraMsg = `. ${preset.extra.label} не додано: ${extraErr}` }
    else extraMsg = ` і ${preset.extra.plural}: ${extra.count}`
  }
  return {
    message: `Додано «${preset.name} — ${form.variant}», KIT ${kit}${extraMsg}`,
    isError: extraFailed,
    reload: true,
    formPatch: { notes: '', kitNumbers: '', extraQty: '' }
  }
}
