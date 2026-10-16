import * as itemsRepository from '../api/itemsRepository.js'

// Додаткова позиція до основної (роутер до Старлінка, павук до рації): окремий запис з власною кількістю,
// додається до наявного, якщо такий уже є з тим самим статусом.
// Повертає текст помилки або null.
export const addExtraItem = async ({ preset, count, positionName, status, category }, repo = itemsRepository) => {
  const name = preset.extra.name
  const { data: same, error: findErr } = await repo.findSameRow({
    positionName, itemName: name, status, columns: 'id, quantity'
  })
  if (findErr) return findErr.message
  if (same && same.length) {
    const { error } = await repo.updateItem(same[0].id, { quantity: Number(same[0].quantity) + count })
    return error ? error.message : null
  }
  const { error } = await repo.insertItem({
    position_name: positionName, category, item_name: name, status, quantity: count, notes: ''
  })
  return error ? error.message : null
}

// Кількість додаткової позиції з форми: { count } (0 = не додавати) або { error }
export const parseExtraQty = (preset, rawValue) => {
  if (!preset || !preset.extra) return { count: 0 }
  const raw = String(rawValue === null || rawValue === undefined ? '' : rawValue).trim()
  if (raw === '') return { count: 0 }
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) {
    return { error: `Кількість ${preset.extra.plural} має бути цілим числом` }
  }
  return { count: n }
}
