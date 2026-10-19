<script setup>
import { ref } from 'vue'
import { allowsDecimal, unitOf } from '../domain/catalog.js'

const props = defineProps({
  item: { type: Object, required: true }
})

defineEmits(['confirm', 'cancel'])

// За замовчуванням — усе, що є на позиції
const qty = ref(props.item.quantity)
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('cancel')">
    <form class="modal-box" @submit.prevent="$emit('confirm', qty)">
      <h4>🔴 Відправити на ремонт</h4>
      <div class="modal-sub">{{ item.position_name }} · {{ item.item_name }} · на позиції {{ item.quantity }} {{ unitOf(item.item_name) }}</div>

      <label class="modal-label">Скільки на ремонт, {{ unitOf(item.item_name) }} *</label>
      <input
        v-model="qty"
        type="number"
        :min="allowsDecimal(item.item_name) ? 0.1 : 1"
        :max="item.quantity"
        :step="allowsDecimal(item.item_name) ? '0.1' : '1'"
        placeholder="К-ть"
        class="styled-input need-qty-input"
        autofocus
      />

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" @click="$emit('cancel')">Скасувати</button>
        <button type="submit" class="btn btn-success modal-save">На ремонт</button>
      </div>
    </form>
  </div>
</template>
