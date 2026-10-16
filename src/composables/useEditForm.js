import { ref, computed } from 'vue'
import { presetOf } from '../domain/catalog.js'
import { emptyEditForm, editFormFromItem } from '../services/editFormService.js'
import { saveEdit } from '../services/editItemService.js'
import { applyResult } from './applyResult.js'

// Окно редагування запису: марка, серійний номер / KIT, вид, довжина відрізка, назва, примітки
// (кількість і статус міняються прямо в таблиці).
export const useEditForm = (items, loadItems) => {
  const editingId = ref(null)
  const editForm = ref(emptyEditForm())
  const editingItem = computed(() => items.value.find(i => i.id === editingId.value) || null)
  const editPreset = computed(() => (editingItem.value ? presetOf(editingItem.value.item_name) : null))

  const startEdit = item => {
    editForm.value = editFormFromItem(item)
    editingId.value = item.id
  }

  const cancelEdit = () => { editingId.value = null }

  const submitEdit = async () => {
    const result = await saveEdit(editingItem.value, editPreset.value, editForm.value)
    applyResult(result, { loadItems, closeEdit: cancelEdit })
  }

  return { editForm, editingItem, editPreset, startEdit, cancelEdit, submitEdit }
}
