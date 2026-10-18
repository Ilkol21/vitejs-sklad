import * as itemsRepository from '../api/itemsRepository.js'
import { round2 } from '../utils/number.js'
import { STATUS } from '../config/app.js'
import { allowsDecimal, isPresenceRow, qtyText, quantityColumns } from '../domain/catalog.js'
import { mergeRowQuantities } from '../domain/quantity.js'
import { isDroneRow, droneName } from '../domain/droneGroups.js'
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
// Рядок «Є / Немає»: у «Потребі» його кількість — це скільки потрібно (необов'язково, 0 = просто потрібно).
// Тому при переході в «Потребу» вона стає 0, а при виході з неї рядок знову «Є».
// needQty — кількість, яку людина вказала у вікні «Скільки потрібно?» (див. moveToNeed): з нею рядок іде в «Потребу».
export const changeStatus = async (item, newStatus, repo = itemsRepository, { needQty } = {}) => {
  if (!item || item.status === newStatus) return nothing()

  const presence = isPresenceRow(item)
  const withQty = needQty !== undefined
  const toNeed = (presence || withQty) && newStatus === STATUS.NEED
  const fromNeed = presence && item.status === STATUS.NEED
  const quantity = withQty ? needQty : (toNeed ? 0 : (fromNeed ? 1 : Number(item.quantity)))
  const setsQty = presence || withQty
  const moved = setsQty ? { ...item, quantity } : item

  const { data: same, error: sameErr } = await repo.findSameRow({
    positionName: item.position_name, itemName: item.item_name, status: newStatus,
    columns: quantityColumns(item.item_name, 'id, quantity'), excludeId: item.id
  })
  if (sameErr) return { ...failure('Помилка статусу: ' + sameErr.message), reload: true }

  if (same && same.length) {
    const target = same[0]
    const merged = mergeRowQuantities(target, moved, item.item_name)
    if (merged.error) return { ...failure(merged.error), reload: true }
    const total = merged.total
    const { error: mergeErr } = await repo.updateItem(target.id, { quantity: total })
    if (mergeErr) return { ...failure('Помилка об\'єднання: ' + mergeErr.message), reload: true }
    const { error: delErr } = await repo.deleteItem(item.id)
    if (delErr) return { ...failure('Помилка видалення: ' + delErr.message), reload: true }
    const text = toNeed ? '«Потреба»' : `: тепер ${qtyText(item.item_name, total, merged.noCount)}`
    return success(`Об'єднано з наявним рядком${toNeed ? ' ' : ''}${text}`, { reload: true })
  }

  const { error } = await repo.updateItem(item.id, setsQty ? { status: newStatus, quantity } : { status: newStatus })
  if (error) return failure('Помилка статусу: ' + error.message)
  return toNeed ? success('Переміщено в «Потреба»', { reload: true }) : { reload: true }
}

// Чи питати кількість перед переходом у «Потребу». Дрон з іменем — завжди 1 шт., тому переходить одразу.
export const asksNeedQty = item => !!item && item.status !== STATUS.NEED && !(isDroneRow(item) && droneName(item))

// Перехід у «Потребу» з вікна «Скільки потрібно?»: рядок переходить лише з вказаною кількістю.
// Для «Є / Немає» кількість необов'язкова (порожньо = просто потрібно), для майна з кількістю — обов'язкова.
// Помилка в самому полі лишає вікно відкритим, щоб виправити; після переходу або помилки бази вікно закривається.
export const moveToNeed = async (item, value, repo = itemsRepository) => {
  if (!item) return { close: true }
  const empty = String(value ?? '').trim() === ''
  const presence = isPresenceRow(item)
  if (empty && !presence) return failure('Вкажіть, скільки потрібно')
  const qty = empty ? 0 : round2(value)
  if (!Number.isFinite(qty) || qty < 0 || (!presence && qty === 0)) return failure('Вкажіть, скільки потрібно')
  if ((presence || !allowsDecimal(item.item_name)) && !Number.isInteger(qty)) return failure('Кількість має бути цілим числом')
  return { ...(await changeStatus(item, STATUS.NEED, repo, { needQty: qty })), close: true }
}

// Випадаючий список рядка «Є / Немає» (у статусі «Потреба» його немає, там поле кількості):
// «Є» (1), «Немає» (0) міняють лише кількість, «Потреба» (choice = 'need') переносить рядок у статус «Потреба».
export const changePresence = async (item, choice, repo = itemsRepository) => {
  if (!item) return nothing()
  if (choice === 'need') return changeStatus(item, STATUS.NEED, repo)
  const quantity = Number(choice) > 0 ? 1 : 0
  if (Number(item.quantity) === quantity) return nothing()
  const { error } = await repo.updateItem(item.id, { quantity })
  return error ? failure('Помилка оновлення: ' + error.message) : { reload: true }
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
