import { ref, onMounted, onUnmounted } from 'vue'
import * as itemsRepository from '../api/itemsRepository.js'
import { useToast } from './useToast.js'

// Список майна вибраної позиції: завантаження і підписка на зміни в реальному часі.
export const useItems = selectedPositionName => {
  const { showMsg } = useToast()
  const items = ref([])
  let unsubscribe = null

  const loadItems = async () => {
    const { data, error } = await itemsRepository.fetchByPosition(selectedPositionName.value)
    if (error) {
      console.error(error)
      showMsg('Помилка завантаження: ' + error.message, true)
    } else {
      items.value = data || []
    }
  }

  onMounted(() => {
    loadItems()
    unsubscribe = itemsRepository.subscribeToChanges(loadItems)
  })

  onUnmounted(() => {
    if (unsubscribe) unsubscribe()
  })

  return { items, loadItems }
}
