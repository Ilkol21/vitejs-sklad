<script setup>
import { watch } from 'vue'
import { useToast } from './composables/useToast.js'
import { usePosition } from './composables/usePosition.js'
import { useUnitName } from './composables/useUnitName.js'
import { useItems } from './composables/useItems.js'
import { useEditForm } from './composables/useEditForm.js'
import { useItemActions } from './composables/useItemActions.js'
import { useStatusFilter } from './composables/useStatusFilter.js'
import ToastMessage from './components/ToastMessage.vue'
import PositionSelect from './components/PositionSelect.vue'
import AddItemForm from './components/AddItemForm.vue'
import ItemsTable from './components/ItemsTable.vue'
import EditItemModal from './components/EditItemModal.vue'
import ReportFooter from './components/ReportFooter.vue'

const { toastMessage } = useToast()
const { selectedPositionName, reportPosition, onPositionChanged } = usePosition()
const { unitName, saveUnitName } = useUnitName()
const { items, loadItems } = useItems(selectedPositionName)
const { activeStatus, counts, visibleItems } = useStatusFilter(items)
const { editForm, editingItem, editPreset, startEdit, cancelEdit, submitEdit } = useEditForm(items, loadItems)
const { updateItemQty, updateItemStatus, deleteItem, downloadReport } = useItemActions(items, loadItems, { reportPosition, unitName })

// Після додавання перемикач показує статус доданого рядка, щоб його було видно
const onSaved = status => {
  if (status) activeStatus.value = status
  loadItems()
}

// Звіт за замовчуванням іде для відкритої позиції: на Зебрі кнопка Excel дає звіт Зебри
watch(selectedPositionName, pos => {
  onPositionChanged(pos)
  loadItems()
})
</script>

<template>
  <div class="app-container">
    <ToastMessage :message="toastMessage" />

    <EditItemModal
      v-if="editingItem"
      v-model:form="editForm"
      :item="editingItem"
      :preset="editPreset"
      @save="submitEdit"
      @cancel="cancelEdit"
    />

    <h2>📦 Облік майна БПЛА (Онлайн / Реалтайм)</h2>

    <PositionSelect v-model="selectedPositionName" />

    <div class="content-box">
      <AddItemForm :position-name="selectedPositionName" @saved="onSaved" />

      <ItemsTable
        v-model:status="activeStatus"
        :items="visibleItems"
        :counts="counts"
        @update-qty="updateItemQty"
        @update-status="updateItemStatus"
        @edit="startEdit"
        @delete="deleteItem"
      />

      <ReportFooter
        v-model:unit-name="unitName"
        v-model:report-position="reportPosition"
        @save-unit-name="saveUnitName"
        @export="downloadReport"
      />
    </div>
  </div>
</template>
