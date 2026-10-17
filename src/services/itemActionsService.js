import * as itemsRepository from '../api/itemsRepository.js'
import { round2 } from '../utils/number.js'
import { allowsDecimal, qtyText, quantityColumns } from '../domain/catalog.js'
import { mergeRowQuantities } from '../domain/quantity.js'
import { failure, success, nothing } from './result.js'

// Швидкі дії з рядком таблиці: кількість, статус, видалення.

// item може бути відсутнім (рядок зник зі списку): тоді просто оновлюємо за id, без перевірки типу кількості
export const changeQuantity = async (id, item, newQty, repo = itemsRepository) => {
  if (newQty === '' || Number(newQty) < 0) return { reload: true }
  const qty = round2(newQty)
  if (item && !allowsDecimal(item.item_name) && !Number.isInteger(qty)) {
    return { ...failure('Кількість має бути цілим числом'), reload: true }
  }
  const { error } = await repo.updateItem(id, { quantity: qty })
  return error ? failure('Помилка оновлення: ' + error.message) : nothing()
}

// Такий самий рядок (позиція + назва + статус) не дублюємо: кількість зливається в наявний
export const changeStatus = async (item, newStatus, repo = itemsRepository) => {
  if (!item || item.status === newStatus) return nothing()

  const { data: same, error: sameErr } = await repo.findSameRow({
    positionName: item.position_name, itemName: item.item_name, status: newStatus,
    columns: quantityColumns(item.item_name, 'id, quantity'), excludeId: item.id
  })
  if (sameErr) return { ...failure('Помилка статусу: ' + sameErr.message), reload: true }

  if (same && same.length) {
    const target = same[0]
    const merged = mergeRowQuantities(target, item, item.item_name)
    if (merged.error) return { ...failure(merged.error), reload: true }
    const total = merged.total
    const { error: mergeErr } = await repo.updateItem(target.id, { quantity: total })
    if (mergeErr) return { ...failure('Помилка об\'єднання: ' + mergeErr.message), reload: true }
    const { error: delErr } = await repo.deleteItem(item.id)
    if (delErr) return { ...failure('Помилка видалення: ' + delErr.message), reload: true }
    return success(`Об'єднано з наявним рядком: тепер ${qtyText(item.item_name, total, merged.noCount)}`, { reload: true })
  }

  const { error } = await repo.updateItem(item.id, { status: newStatus })
  return error ? failure('Помилка статусу: ' + error.message) : { reload: true }
}

// Текст підтвердження видалення: воно безповоротне, а командир отримає про нього повідомлення в Telegram
export const deleteConfirmText = item => {
  const what = item
    ? `«${item.item_name}»\nПозиція: ${item.position_name}\nСтатус: ${item.status}\nКількість: ${qtyText(item.item_name, item.quantity, item.no_count)}`
    : 'цей запис'
  return `Видалити назавжди?\n\n${what}\n\nЦю дію не можна скасувати. Командир отримає повідомлення про видалення.`
}

export const removeItem = async (item, id, { confirm = window.confirm.bind(window) } = {}, repo = itemsRepository) => {
  if (!confirm(deleteConfirmText(item))) return nothing()
  const { error } = await repo.deleteItem(id)
  return error ? failure('Помилка видалення: ' + error.message) : success('Видалено', { reload: true })
}
