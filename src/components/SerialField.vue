<script setup>
import { computed } from 'vue'
import { SERIAL_PLACEHOLDERS } from '../config/app.js'

defineProps({
  placeholder: { type: String, default: '' }
})

// Серійний номер: або текст, або одна з позначок «Невідомо» / «Зафарбовано»
const serial = defineModel({ type: String, default: '' })

const isPlaceholder = computed(() => SERIAL_PLACEHOLDERS.includes(serial.value))

// '' = ввести номер вручну
const mode = computed({
  get: () => (isPlaceholder.value ? serial.value : ''),
  set: value => { serial.value = value }
})
</script>

<template>
  <select v-model="mode" class="styled-select serial-mode">
    <option value="">Ввести номер</option>
    <option v-for="p in SERIAL_PLACEHOLDERS" :key="p" :value="p">{{ p }}</option>
  </select>
  <input v-model="serial" :disabled="isPlaceholder" :placeholder="placeholder" class="styled-input notes-input" />
</template>
