import { changeQuantity, changeStatus, removeItem } from '../services/itemActionsService.js'
import { exportExcel } from '../services/excelExportService.js'
import { applyResult } from './applyResult.js'

// Дії з рядками таблиці та вивантаження звіту.
export const useItemActions = (items, loadItems, { reportPosition, unitName }) => {
  const findItem = id => items.value.find(i => i.id === id)

  const updateItemQty = async (id, newQty) => {
    applyResult(await changeQuantity(id, findItem(id), newQty), { loadItems })
  }

  const updateItemStatus = async (id, newStatus) => {
    applyResult(await changeStatus(findItem(id), newStatus), { loadItems })
  }

  const deleteItem = async id => {
    applyResult(await removeItem(findItem(id), id), { loadItems })
  }

  const downloadReport = async () => {
    applyResult(await exportExcel({ reportPosition: reportPosition.value, unitName: unitName.value }))
  }

  return { updateItemQty, updateItemStatus, deleteItem, downloadReport }
}
