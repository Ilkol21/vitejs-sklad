import { ref, computed } from 'vue'
import { groupItemRows } from '../domain/serialGroups.js'

// Вікно групи (дрони однієї моделі або майно з кількома серійними номерами). Група знову рахується з усього списку
// за ключем, тому після зміни статусу або видалення рядка воно оновлюється саме, а коли група зникає — закривається.
export const useDroneGroup = items => {
  const openKey = ref(null)

  const group = computed(() => {
    if (!openKey.value) return null
    return groupItemRows(items.value).find(entry => entry.type !== 'row' && entry.key === openKey.value) || null
  })

  const openGroup = entry => { openKey.value = entry.key }
  const closeGroup = () => { openKey.value = null }

  return { group, openGroup, closeGroup }
}
