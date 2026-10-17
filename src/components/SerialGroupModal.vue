<script setup>
import { isPresenceRow, allowsDecimal } from '../domain/catalog.js'
import { memberSerial } from '../domain/serialGroups.js'
import StatusOptions from './StatusOptions.vue'

defineProps({
  group: { type: Object, required: true }
})

defineEmits(['close', 'update-qty', 'update-status', 'edit', 'delete'])
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-box">
      <h4>🔢 {{ group.title }}</h4>
      <div class="modal-sub">
        {{ group.position }} · {{ group.status }}<template v-if="!group.presence"> · разом {{ group.total }} шт.</template>
      </div>

      <div v-for="item in group.items" :key="item.id" class="group-member">
        <div class="group-member-name">S/N {{ memberSerial(item) }}</div>
        <select :value="item.status" @change="e => $emit('update-status', item.id, e.target.value)" class="styled-select group-member-status">
          <StatusOptions />
        </select>
        <select v-if="isPresenceRow(item)" :value="Number(item.quantity) > 0 ? '1' : '0'" @change="e => $emit('update-qty', item.id, e.target.value)" class="styled-select presence-select">
          <option value="1">Є</option>
          <option value="0">Немає</option>
        </select>
        <input v-else type="number" min="0" :step="allowsDecimal(item.item_name) ? '0.1' : '1'" :value="item.quantity" @change="e => $emit('update-qty', item.id, e.target.value)" class="styled-input qty-edit font-bold" />
        <button type="button" class="edit-btn" title="Редагувати" @click="$emit('edit', item)">✎</button>
        <button type="button" class="del-btn" @click="$emit('delete', item.id)">✕</button>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary modal-save" @click="$emit('close')">Закрити</button>
      </div>
    </div>
  </div>
</template>
