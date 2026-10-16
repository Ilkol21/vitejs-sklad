import { ref } from 'vue'
import { POSITIONS, STORAGE_KEYS } from '../config/app.js'
import { readStorage, writeStorage } from '../utils/storage.js'

// Остання відкрита позиція зберігається в браузері, тож після оновлення сторінки вона не скидається на першу
const readSavedPosition = () => {
  const saved = readStorage(STORAGE_KEYS.selectedPosition)
  return POSITIONS.includes(saved) ? saved : POSITIONS[0]
}

export const usePosition = () => {
  const selectedPositionName = ref(readSavedPosition())
  // Для якої позиції формувати звіт: за замовчуванням для поточної; '' = усі позиції
  const reportPosition = ref(selectedPositionName.value)

  // Викликається при зміні вибраної позиції
  const onPositionChanged = pos => {
    reportPosition.value = pos
    writeStorage(STORAGE_KEYS.selectedPosition, pos)
  }

  return { selectedPositionName, reportPosition, onPositionChanged }
}
