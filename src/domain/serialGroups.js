import { round2 } from '../utils/number.js'
import { mergeNotes } from './notes.js'
import { itemParts, nameWithDetail } from './itemName.js'
import { isPresenceRow, displaySerial } from './catalog.js'
import { groupDroneRows } from './droneGroups.js'

// Однакове майно з різними серійними номерами (дві рації Motorola з S/N 123 і 456) у базі — окремі рядки,
// бо кожен номер унікальний. Для показу (таблиця застосунку та звіт Excel) вони зводяться в один рядок:
// кількості додаються, серійні номери йдуть через кому.

const compareText = (a, b) => String(a).localeCompare(String(b), 'uk', { numeric: true })

const serialKey = (item, p, byPosition) =>
  ['serials', byPosition ? item.position_name : '', item.status, item.category, p.base, p.detail, p.brand,
    isPresenceRow(item)].join('\u0001')

// Записи після groupDroneRows → записи для показу:
//   { type: 'serials', key, title, status, category, position, presence, items, total, serials, notes } — група
//   з двох і більше записів з різними серійними номерами. Усе інше (рядки без S/N, одинокі S/N, групи дронів)
//   лишається без змін. Група стає на місце свого першого рядка.
// byPosition: у звіті по кількох позиціях кожна позиція зводиться окремо.
export const groupSerialRows = (entries, { byPosition = false } = {}) => {
  const groups = new Map()

  for (const entry of entries) {
    if (entry.type !== 'row') continue
    const p = itemParts(entry.item)
    if (!p.serial) continue
    const key = serialKey(entry.item, p, byPosition)
    if (!groups.has(key)) {
      const label = [p.brand, p.detail].filter(Boolean).join(' ')
      groups.set(key, {
        type: 'serials',
        key,
        title: label ? nameWithDetail(p.base, label) : p.base,
        status: entry.item.status,
        category: entry.item.category,
        position: entry.item.position_name,
        presence: isPresenceRow(entry.item),
        items: [],
        total: 0,
        serials: [],
        notes: ''
      })
    }
    const group = groups.get(key)
    group.items.push(entry.item)
    group.total = round2(group.total + (Number(entry.item.quantity) || 0))
    const serial = displaySerial(p.base, p.serial)
    if (!group.serials.includes(serial)) group.serials.push(serial)
    group.notes = mergeNotes(group.notes, entry.item.notes || '')
  }

  const result = []
  const emitted = new Set()
  for (const entry of entries) {
    const group = entry.type === 'row' ? groups.get(serialKey(entry.item, itemParts(entry.item), byPosition)) : null
    if (!group || group.items.length < 2) {
      result.push(entry)
    } else if (!emitted.has(group.key)) {
      emitted.add(group.key)
      group.serials.sort(compareText)
      result.push(group)
    }
  }
  return result
}

// Усе зведення для показу: групи дронів за іменами, потім групи майна за серійними номерами
export const groupItemRows = (items, options) => groupSerialRows(groupDroneRows(items, options), options)

// Серійні номери групи для показу: «123, 456»
export const serialsText = group => group.serials.join(', ')

// Серійний номер одного запису (для підпису в вікні групи)
export const memberSerial = item => {
  const p = itemParts(item)
  return displaySerial(p.base, p.serial)
}
