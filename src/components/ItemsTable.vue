<script setup>
import { STATUS_OPTIONS } from '../config/app.js'
import { isPresence, allowsDecimal, unitOf } from '../domain/catalog.js'
import StatusOptions from './StatusOptions.vue'
import StatusTabs from './StatusTabs.vue'

defineProps({
  items: { type: Array, required: true },
  counts: { type: Object, required: true }
})

// Вибраний статус: таблиця показує лише його рядки
const status = defineModel('status', { type: String, required: true })

defineEmits(['update-qty', 'update-status', 'edit', 'delete'])

const statusClass = value => STATUS_OPTIONS.find(o => o.value === value)?.cssClass
</script>

<template>
  <div class="single-table-container">
    <h3>📋 Майно на обраній позиції</h3>
    <StatusTabs v-model="status" :counts="counts" />
    <div class="table-wrap">
      <table class="styled-table">
        <thead>
          <tr>
            <th>Назва / Обладнання</th>
            <th class="th-status">Статус</th>
            <th class="th-qty">К-ть</th>
            <th class="th-action">Дії</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <b>{{ item.item_name }}</b><br /><small class="item-meta">[{{ item.category }}] {{ item.notes }}</small>
            </td>
            <td class="td-status">
              <select :value="item.status" @change="e => $emit('update-status', item.id, e.target.value)" class="styled-select status-cell-select" :class="statusClass(item.status)">
                <StatusOptions />
              </select>
            </td>
            <td class="td-qty">
              <select v-if="isPresence(item.item_name)" :value="Number(item.quantity) > 0 ? '1' : '0'" @change="e => $emit('update-qty', item.id, e.target.value)" class="styled-select presence-select" :class="Number(item.quantity) > 0 ? 'status-green' : 'status-red'">
                <option value="1">Є</option>
                <option value="0">Немає</option>
              </select>
              <input v-else type="number" min="0" :step="allowsDecimal(item.item_name) ? '0.1' : '1'" :value="item.quantity" @change="e => $emit('update-qty', item.id, e.target.value)" class="styled-input qty-edit font-bold" />
              <div v-if="allowsDecimal(item.item_name)" class="qty-unit">{{ unitOf(item.item_name) }}</div>
              <div v-if="Number(item.quantity) === 0 && !isPresence(item.item_name)" class="no-stock">немає</div>
            </td>
            <td class="td-action">
              <button @click="$emit('edit', item)" class="edit-btn" title="Редагувати">✎</button>
              <button @click="$emit('delete', item.id)" class="del-btn">✕</button>
            </td>
          </tr>
          <tr v-if="items.length === 0">
            <td colspan="4" class="text-center text-gray-400 py-4">На цій позиції поки немає майна зі статусом «{{ status }}».</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
