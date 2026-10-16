import { ref } from 'vue'
import { DEFAULT_UNIT_NAME, STORAGE_KEYS } from '../config/app.js'
import { readStorage, writeStorage } from '../utils/storage.js'
import { useToast } from './useToast.js'

// Назва підрозділу для звіту (зберігається в браузері)
export const useUnitName = () => {
  const { showMsg } = useToast()
  const unitName = ref(readStorage(STORAGE_KEYS.unitName) || DEFAULT_UNIT_NAME)

  const saveUnitName = () => {
    writeStorage(STORAGE_KEYS.unitName, unitName.value)
    showMsg('Назву підрозділу збережено!')
  }

  return { unitName, saveUnitName }
}
