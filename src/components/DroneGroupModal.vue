<script setup>
import { droneName } from '../domain/droneGroups.js'
import StatusOptions from './StatusOptions.vue'

defineProps({
  group: { type: Object, required: true }
})

defineEmits(['close', 'update-qty', 'update-status', 'edit', 'delete'])

const memberLabel = item => (droneName(item) ? `«${droneName(item)}»` : 'Без імені')
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-box">
      <h4>🛩 {{ group.title }}</h4>
      <div class="modal-sub">{{ group.position }} · {{ group.status }} · разом {{ group.total }} шт.</div>

      <div v-for="item in group.items" :key="item.id" class="group-member">
        <div class="group-member-name">{{ memberLabel(item) }}</div>
        <select :value="item.status" @change="e => $emit('update-status', item.id, e.target.value)" class="styled-select group-member-status">
          <StatusOptions />
        </select>
        <input v-if="!droneName(item)" type="number" min="0" step="1" :value="item.quantity" @change="e => $emit('update-qty', item.id, e.target.value)" class="styled-input qty-edit font-bold" />
        <span v-else class="group-member-qty">1 шт.</span>
        <button type="button" class="edit-btn" title="Редагувати" @click="$emit('edit', item)">✎</button>
        <button type="button" class="del-btn" @click="$emit('delete', item.id)">✕</button>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary modal-save" @click="$emit('close')">Закрити</button>
      </div>
    </div>
  </div>
</template>
