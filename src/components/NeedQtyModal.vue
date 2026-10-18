<script setup>
import { ref, computed } from 'vue'
import { isPresenceRow, allowsDecimal, unitOf } from '../domain/catalog.js'

const props = defineProps({
  item: { type: Object, required: true }
})

defineEmits(['confirm', 'cancel'])

// Для «Є / Немає» кількість необов'язкова, для майна з кількістю — обов'язкова (підставляється поточна)
const presence = computed(() => isPresenceRow(props.item))
const qty = ref(!presence.value && Number(props.item.quantity) > 0 ? props.item.quantity : '')
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('cancel')">
    <form class="modal-box" @submit.prevent="$emit('confirm', qty)">
      <h4>🟡 Перевести в «Потреба»</h4>
      <div class="modal-sub">{{ item.position_name }} · {{ item.item_name }}</div>

      <label class="modal-label">Скільки потрібно{{ presence ? ' (необов\'язково)' : ', ' + unitOf(item.item_name) + ' *' }}</label>
      <input
        v-model="qty"
        type="number"
        :min="presence ? 0 : (allowsDecimal(item.item_name) ? 0.1 : 1)"
        :step="!presence && allowsDecimal(item.item_name) ? '0.1' : '1'"
        :placeholder="presence ? 'Просто потрібно' : 'К-ть'"
        class="styled-input need-qty-input"
        autofocus
      />

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" @click="$emit('cancel')">Скасувати</button>
        <button type="submit" class="btn btn-success modal-save">Перевести</button>
      </div>
    </form>
  </div>
</template>
