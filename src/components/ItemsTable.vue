<script setup>
import { STATUS_OPTIONS } from '../config/app.js'
import { computed } from 'vue'
import { isPresenceRow, allowsDecimal, unitOf } from '../domain/catalog.js'
import { groupItemRows, serialsText } from '../domain/serialGroups.js'
import StatusOptions from './StatusOptions.vue'
import StatusTabs from './StatusTabs.vue'

const props = defineProps({
  items: { type: Array, required: true },
  counts: { type: Object, required: true }
})

// Вибраний статус: таблиця показує лише його рядки
const status = defineModel('status', { type: String, required: true })

defineEmits(['update-qty', 'update-status', 'edit', 'delete', 'open-group'])

// Дрони однієї моделі, у яких є іменні, і однакове майно з різними серійними номерами
// показуються одним рядком з загальною кількістю
const entries = computed(() => groupItemRows(props.items))

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
          <template v-for="entry in entries" :key="entry.key">
          <tr v-if="entry.type === 'drones'" class="group-row">
            <td>
              <b>{{ entry.title }}</b>
              <div class="group-names">Імена: {{ entry.names.join(', ') }}</div>
              <small class="item-meta">[{{ entry.category }}] {{ entry.notes }}</small>
            </td>
            <td class="td-status"><span class="group-status" :class="statusClass(entry.status)">{{ entry.status }}</span></td>
            <td class="td-qty"><b>{{ entry.total }}</b><div class="qty-unit">шт.</div></td>
            <td class="td-action">
              <button @click="$emit('open-group', entry)" class="edit-btn" title="Керування дронами">✎</button>
            </td>
          </tr>
          <tr v-else-if="entry.type === 'serials'" class="group-row">
            <td>
              <b>{{ entry.title }}</b>
              <div class="group-names">S/N: {{ serialsText(entry) }}</div>
              <small class="item-meta">[{{ entry.category }}] {{ entry.notes }}</small>
            </td>
            <td class="td-status"><span class="group-status" :class="statusClass(entry.status)">{{ entry.status }}</span></td>
            <td class="td-qty">
              <b v-if="entry.presence">{{ entry.total > 0 ? 'Є' : 'Немає' }}</b>
              <template v-else><b>{{ entry.total }}</b><div class="qty-unit">{{ unitOf(entry.items[0].item_name) }}</div></template>
            </td>
            <td class="td-action">
              <button @click="$emit('open-group', entry)" class="edit-btn" title="Керування номерами">✎</button>
            </td>
          </tr>
          <tr v-else-if="entry.type === 'row'">
            <td>
              <b>{{ entry.item.item_name }}</b><br /><small class="item-meta">[{{ entry.item.category }}] {{ entry.item.notes }}</small>
            </td>
            <td class="td-status">
              <select :value="entry.item.status" @change="e => $emit('update-status', entry.item.id, e.target.value)" class="styled-select status-cell-select" :class="statusClass(entry.item.status)">
                <StatusOptions />
              </select>
            </td>
            <td class="td-qty">
              <select v-if="isPresenceRow(entry.item)" :value="Number(entry.item.quantity) > 0 ? '1' : '0'" @change="e => $emit('update-qty', entry.item.id, e.target.value)" class="styled-select presence-select" :class="Number(entry.item.quantity) > 0 ? 'status-green' : 'status-red'">
                <option value="1">Є</option>
                <option value="0">Немає</option>
              </select>
              <input v-else type="number" min="0" :step="allowsDecimal(entry.item.item_name) ? '0.1' : '1'" :value="entry.item.quantity" @change="e => $emit('update-qty', entry.item.id, e.target.value)" class="styled-input qty-edit font-bold" />
              <div v-if="allowsDecimal(entry.item.item_name)" class="qty-unit">{{ unitOf(entry.item.item_name) }}</div>
              <div v-if="Number(entry.item.quantity) === 0 && !isPresenceRow(entry.item)" class="no-stock">немає</div>
            </td>
            <td class="td-action">
              <button @click="$emit('edit', entry.item)" class="edit-btn" title="Редагувати">✎</button>
              <button @click="$emit('delete', entry.item.id)" class="del-btn">✕</button>
            </td>
          </tr>
          </template>
          <tr v-if="items.length === 0">
            <td colspan="4" class="text-center text-gray-400 py-4">На цій позиції поки немає майна зі статусом «{{ status }}».</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
