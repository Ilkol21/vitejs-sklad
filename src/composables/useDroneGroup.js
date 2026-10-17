import { ref, computed } from 'vue'
import { groupDroneRows } from '../domain/droneGroups.js'

// Вікно групи дронів однієї моделі. Група знову рахується з усього списку за ключем, тому після зміни статусу
// або видалення рядка воно оновлюється саме, а коли група зникає (іменних дронів не лишилось) — закривається.
export const useDroneGroup = items => {
  const openKey = ref(null)

  const group = computed(() => {
    if (!openKey.value) return null
    return groupDroneRows(items.value).find(entry => entry.type === 'drones' && entry.key === openKey.value) || null
  })

  const openGroup = entry => { openKey.value = entry.key }
  const closeGroup = () => { openKey.value = null }

  return { group, openGroup, closeGroup }
}
