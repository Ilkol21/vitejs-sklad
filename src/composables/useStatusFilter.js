import { ref, computed } from 'vue'
import { STATUS, STATUS_OPTIONS } from '../config/app.js'

// Перемикач «На позиції / Потреба / На ремонт»: вибраний статус, лічильники та рядки таблиці цього статусу.
// Якщо у рядка змінюється статус, він сам переходить у іншу вкладку, бо список фільтрується за item.status.
export const useStatusFilter = items => {
  const activeStatus = ref(STATUS.OK)

  const counts = computed(() => {
    const result = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, 0]))
    for (const item of items.value) {
      if (item.status in result) result[item.status] += 1
    }
    return result
  })

  const visibleItems = computed(() => items.value.filter(item => item.status === activeStatus.value))

  return { activeStatus, counts, visibleItems }
}
