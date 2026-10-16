import { ref } from 'vue'
import { TOAST_DURATION_MS } from '../config/app.js'

// Спільне повідомлення зверху екрана (зникає саме).
// Стан спільний для всього застосунку, тому створюється один раз на рівні модуля.
const toastMessage = ref('')

export const useToast = () => {
  const showMsg = msg => {
    toastMessage.value = msg
    setTimeout(() => { toastMessage.value = '' }, TOAST_DURATION_MS)
  }
  return { toastMessage, showMsg }
}
