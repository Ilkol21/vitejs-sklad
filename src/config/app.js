// Загальні налаштування застосунку.

export const POSITIONS = ['Позиція «Чіпс»', 'Позиція «Зебра»', 'Позиція «Осло»', 'Позиція «Гарпун»']

export const STATUS = {
  OK: 'На позиції',
  NEED: 'Потреба',
  REPAIR: 'На ремонт'
}

export const STATUS_OPTIONS = [
  { value: STATUS.OK, label: '🟢 На позиції', cssClass: 'status-green' },
  { value: STATUS.NEED, label: '🟡 Потреба', cssClass: 'status-orange' },
  { value: STATUS.REPAIR, label: '🔴 На ремонт', cssClass: 'status-red' }
]

export const NAME_SEPARATOR = ' — '

export const DEFAULT_UNIT_NAME = '128 ОГШБр'
export const DEFAULT_MEASURE_UNIT = 'шт.'

export const STORAGE_KEYS = {
  unitName: 'unit_name',
  selectedPosition: 'selected_position'
}

export const TOAST_DURATION_MS = 4000
export const MAX_CALLSIGN_LENGTH = 40
export const MAX_SEGMENT_LENGTH_M = 10000
