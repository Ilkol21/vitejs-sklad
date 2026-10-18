import { ref } from 'vue'
import { STATUS } from '../config/app.js'
import { changeQuantity, changePresence, changeStatus, removeItem, asksNeedQty, moveToNeed } from '../services/itemActionsService.js'
import { exportExcel } from '../services/excelExportService.js'
import { applyResult } from './applyResult.js'

// Дії з рядками таблиці та вивантаження звіту.
export const useItemActions = (items, loadItems, { reportPosition, unitName }) => {
  const findItem = id => items.value.find(i => i.id === id)

  // Рядок, для якого відкрите вікно «Скільки потрібно?»: у «Потребу» він переходить лише після підтвердження
  const needItem = ref(null)

  const updateItemQty = async (id, newQty) => {
    applyResult(await changeQuantity(id, findItem(id), newQty), { loadItems })
  }

  const updateItemStatus = async (id, newStatus) => {
    const item = findItem(id)
    if (newStatus === STATUS.NEED && asksNeedQty(item)) {
      needItem.value = item
      return
    }
    applyResult(await changeStatus(item, newStatus), { loadItems })
  }

  const updateItemPresence = async (id, choice) => {
    if (choice === 'need') return updateItemStatus(id, STATUS.NEED)
    applyResult(await changePresence(findItem(id), choice), { loadItems })
  }

  const closeNeed = () => { needItem.value = null }

  const confirmNeed = async qty => {
    applyResult(await moveToNeed(needItem.value, qty), { loadItems, closeEdit: closeNeed })
  }

  // Список у рядку вже показує «Потреба»: перезавантаження повертає в ньому справжній статус
  const cancelNeed = () => {
    closeNeed()
    loadItems()
  }

  const deleteItem = async id => {
    applyResult(await removeItem(findItem(id), id), { loadItems })
  }

  const downloadReport = async () => {
    applyResult(await exportExcel({ reportPosition: reportPosition.value, unitName: unitName.value }))
  }

  return { updateItemQty, updateItemPresence, updateItemStatus, needItem, confirmNeed, cancelNeed, deleteItem, downloadReport }
}
