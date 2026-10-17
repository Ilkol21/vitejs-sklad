import { ref, computed } from 'vue'
import { STATUS, STATUS_OPTIONS } from '../config/app.js'
import { presetOf } from '../domain/catalog.js'

// Перемикач «На позиції / Потреба / На ремонт»: вибраний статус, лічильники та рядки таблиці цього статусу.
// Якщо у рядка змінюється статус, він сам переходить у іншу вкладку, бо список фільтрується за item.status.
export const useStatusFilter = items => {
  const activeStatus = ref(STATUS.OK)

  // Лічильник вкладки = кількість пунктів зі списку майна (каталогу), які є в цьому статусі в наявності:
  // моделі, номери та KIT однієї назви дають один пункт. Майно з кількістю 0 («немає», у «Є / Немає» — «Немає»)
  // не рахується. Додаткові позиції (Павук, Роутер Старлінк) у каталозі немає, тому не рахуються.
  const counts = computed(() => {
    const names = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, new Set()]))
    for (const item of items.value) {
      const preset = presetOf(item.item_name)
      if (preset && item.status in names && Number(item.quantity) > 0) names[item.status].add(preset.name)
    }
    return Object.fromEntries(Object.entries(names).map(([status, set]) => [status, set.size]))
  })

  const visibleItems = computed(() => items.value.filter(item => item.status === activeStatus.value))

  return { activeStatus, counts, visibleItems }
}
