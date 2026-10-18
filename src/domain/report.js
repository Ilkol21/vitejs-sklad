import { POSITIONS, STATUS, STATUS_OPTIONS } from '../config/app.js'
import { round2 } from '../utils/number.js'
import { itemParts } from './itemName.js'
import { groupItemRows, serialsText } from './serialGroups.js'
import { presetOf, unitOf, isPresenceRow, mergesModel, displaySerial } from './catalog.js'

const positionIndex = name => {
  const i = POSITIONS.indexOf(name)
  return i < 0 ? 999 : i
}

// Порядок статусів у звіті співпадає з перемикачем у застосунку: на позиції, потреба, на ремонт
const statusIndex = status => {
  const i = STATUS_OPTIONS.findIndex(o => o.value === status)
  return i < 0 ? 999 : i
}

const compareText = (a, b) => String(a).localeCompare(String(b), 'uk', { numeric: true })

// Рядок звіту для одного запису: окремі колонки для виду, марки, серійного номера, кількості й одиниці виміру.
// Для планшетів назва пристрою й модель йдуть в одну колонку «Марка». «Імена дронів» заповнюються лише для групи дронів.
// Рядок «Є / Немає» у «Потребі» має необов'язкову кількість «скільки потрібно»: вона йде в «Кількість», а не в «Наявність»
const needsCount = item => isPresenceRow(item) && item.status === STATUS.NEED && Number(item.quantity) > 0

const reportRow = (item, p) => ({
  'Позиція': item.position_name,
  'Категорія': item.category,
  'Найменування': p.base,
  'Вид / модель / назва': mergesModel(p.base) ? '' : p.detail,
  'Марка': mergesModel(p.base) ? [p.brand, p.detail].filter(Boolean).join(' ') : p.brand,
  'Серійний номер': displaySerial(p.base, p.serial),
  'Статус': item.status,
  'Кількість': isPresenceRow(item) && !needsCount(item) ? '' : Number(item.quantity),
  'Од.': isPresenceRow(item) && !needsCount(item) ? '' : unitOf(item.item_name),
  // Рядок «Є / Немає» у «Потребі» у звіті показує «ПОТРЕБА», як і у застосунку
  'Наявність': isPresenceRow(item)
    ? (item.status === STATUS.NEED ? 'ПОТРЕБА' : (Number(item.quantity) > 0 ? 'Є' : 'НЕМАЄ'))
    : (Number(item.quantity) > 0 ? '' : 'НЕМАЄ'),
  'Імена дронів': '',
  'Примітки': item.notes || ''
})

// Рядок звіту для групи дронів однієї моделі: загальна кількість (вклюнно з іменними), імена — в окремій колонці
const droneGroupRow = group => {
  const first = group.items[0]
  const row = reportRow({ ...first, quantity: group.total, notes: group.notes }, itemParts(first))
  return {
    ...row,
    'Вид / модель / назва': group.model,
    'Імена дронів': group.names.join(', ')
  }
}

// Рядок звіту для однакового майна з кількома серійними номерами: кількість разом, номери через кому
const serialGroupRow = group => ({
  ...reportRow({ ...group.items[0], quantity: group.total, notes: group.notes }, itemParts(group.items[0])),
  'Серійний номер': serialsText(group)
})

// Рядки звіту: дрони однієї моделі (на кожній позиції й статусі), у яких є іменні, зводяться в один рядок;
// так само однакове майно з різними серійними номерами
export const buildReportRows = list =>
  groupItemRows(list, { byPosition: true })
    .map(entry => {
      if (entry.type === 'drones') {
        return { item: entry.items[0], p: { ...itemParts(entry.items[0]), detail: entry.model, serial: '' }, entry }
      }
      if (entry.type === 'serials') {
        return { item: entry.items[0], p: { ...itemParts(entry.items[0]), serial: entry.serials[0] }, entry }
      }
      return { item: entry.item, p: itemParts(entry.item), entry: null }
    })
    .sort((a, b) =>
      positionIndex(a.item.position_name) - positionIndex(b.item.position_name) ||
      statusIndex(a.item.status) - statusIndex(b.item.status) ||
      compareText(a.item.category, b.item.category) || compareText(a.p.base, b.p.base) ||
      compareText(a.p.detail, b.p.detail) || compareText(a.p.serial, b.p.serial) ||
      compareText(a.item.status, b.item.status))
    .map(({ item, p, entry }) => {
      if (!entry) return reportRow(item, p)
      return entry.type === 'drones' ? droneGroupRow(entry) : serialGroupRow(entry)
    })

// Підсумок: однакове майно рахується разом (KIT і серійні номери не розділяють групу).
// «Разом є» = На позиції + На ремонт (це майно, яке є); «Потреба» окремо, бо це не наявність.
export const buildSummaryRows = (list, withPosition) => {
  const groups = new Map()
  for (const item of list || []) {
    const p = itemParts(item)
    let label = [p.brand, p.detail].filter(Boolean).join(' ')
    const pr = presetOf(item.item_name)
    if (pr && pr.callsign) label = label.replace(/\s+"[^"]*"\s*$/, '')
    const key = [withPosition ? item.position_name : '', item.category, p.base, label].join('\u0001')
    if (!groups.has(key)) {
      groups.set(key, {
        pos: withPosition ? item.position_name : 'Усі позиції',
        cat: item.category,
        base: p.base,
        label,
        unit: unitOf(item.item_name),
        pres: true,
        needMark: false,
        ok: 0,
        rep: 0,
        need: 0
      })
    }
    const g = groups.get(key)
    // Група показується як «Є / Немає» лише коли всі її рядки без кількості; у мішаній — кількості сумуються
    g.pres = g.pres && isPresenceRow(item)
    if (item.status === STATUS.NEED && isPresenceRow(item)) g.needMark = true
    const q = Number(item.quantity) || 0
    if (item.status === STATUS.OK) g.ok = round2(g.ok + q)
    else if (item.status === STATUS.REPAIR) g.rep = round2(g.rep + q)
    else if (item.status === STATUS.NEED) g.need = round2(g.need + q)
  }
  return [...groups.values()]
    .sort((a, b) =>
      positionIndex(a.pos) - positionIndex(b.pos) || compareText(a.cat, b.cat) ||
      compareText(a.base, b.base) || compareText(a.label, b.label))
    .map(g => ({
      'Позиція': g.pos,
      'Категорія': g.cat,
      'Найменування': g.base,
      'Вид / марка': g.label,
      'На позиції': g.pres ? '' : g.ok,
      'На ремонт': g.pres ? '' : g.rep,
      'Разом є': g.pres ? '' : round2(g.ok + g.rep),
      'Потреба': g.pres ? (g.need > 0 ? g.need : '') : g.need,
      'Од.': g.pres ? '' : g.unit,
      // Група «Є / Немає», де нічого немає у наявності, а є рядок «Потреба», показує «ПОТРЕБА»
      'Наявність': g.pres
        ? (round2(g.ok + g.rep) > 0 ? 'Є' : (g.needMark ? 'ПОТРЕБА' : 'НЕМАЄ'))
        : (round2(g.ok + g.rep) > 0 ? '' : 'НЕМАЄ')
    }))
}

// «Позиція «Чіпс»» -> «Чіпс» (для підказок і імені файлу; без символів, заборонених в іменах файлів)
export const positionLabel = name =>
  String(name || '').replace(/^Позиція\s+/, '').replace(/[«»"\\/:*?<>|]/g, '').trim()
