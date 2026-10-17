import { round2 } from '../utils/number.js'
import { mergeNotes } from './notes.js'
import { itemParts, splitCallsign, nameWithDetail } from './itemName.js'
import { presetOf } from './catalog.js'

// Дрон з іменем це окремий рядок у базі («Дрони — Mavic 3T "Панда"», 1 шт.), але рахується разом з усіма дронами
// тієї ж моделі. Тут — зведення таких рядків в один для таблиці застосунку та звіту Excel.

export const isDroneRow = item => !!presetOf(item.item_name)?.callsign

const splitDrone = item => splitCallsign(itemParts(item).detail)
export const droneModel = item => splitDrone(item).model
export const droneName = item => splitDrone(item).name

const groupKey = (item, byPosition) =>
  [byPosition ? item.position_name : '', item.status, presetOf(item.item_name).name, droneModel(item)].join('\u0001')

// Рядки → записи для показу:
//   { type: 'row', key, item }  — звичайний рядок;
//   { type: 'drones', key, title, model, status, category, position, items, total, names, notes } — група моделі.
// Група створюється лише коли в моделі (у межах позиції й статусу) є хоча б один дрон з іменем; дрони без імен
// залишаються звичайним рядком. Порядок зберігається: група стає на місце свого першого рядка.
// byPosition: у звіті по кількох позиціях кожна позиція зводиться окремо.
export const groupDroneRows = (items, { byPosition = false } = {}) => {
  const list = items || []
  const groups = new Map()

  for (const item of list) {
    if (!isDroneRow(item)) continue
    const key = groupKey(item, byPosition)
    if (!groups.has(key)) {
      const preset = presetOf(item.item_name)
      const model = droneModel(item)
      groups.set(key, {
        type: 'drones',
        key,
        title: model ? nameWithDetail(preset.name, model) : preset.name,
        model,
        status: item.status,
        category: item.category,
        position: item.position_name,
        items: [],
        total: 0,
        names: [],
        notes: ''
      })
    }
    const group = groups.get(key)
    group.items.push(item)
    group.total = round2(group.total + (Number(item.quantity) || 0))
    const name = droneName(item)
    if (name) group.names.push(name)
    group.notes = mergeNotes(group.notes, item.notes || '')
  }

  const result = []
  const emitted = new Set()
  for (const item of list) {
    if (!isDroneRow(item)) {
      result.push({ type: 'row', key: item.id, item })
      continue
    }
    const group = groups.get(groupKey(item, byPosition))
    if (!group.names.length) {
      result.push({ type: 'row', key: item.id, item })
    } else if (!emitted.has(group.key)) {
      emitted.add(group.key)
      result.push(group)
    }
  }
  return result
}
