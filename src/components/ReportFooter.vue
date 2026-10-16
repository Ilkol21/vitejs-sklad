<script setup>
import { POSITIONS } from '../config/app.js'

const unitName = defineModel('unitName', { type: String, default: '' })
const reportPosition = defineModel('reportPosition', { type: String, default: '' })

defineEmits(['save-unit-name', 'export'])
</script>

<template>
  <div class="excel-footer-box">
    <div class="excel-inputs">
      <label class="block text-xs font-bold text-gray-600 mb-1">Підрозділ для звіту:</label>
      <div class="flex gap-2">
        <input v-model="unitName" type="text" placeholder="Напр. 128 ОГШБр" class="styled-input flex-1 font-bold" />
        <button @click="$emit('save-unit-name')" class="btn btn-secondary">Зберегти назву</button>
      </div>
    </div>
    <div class="report-scope">
      <label class="block text-xs font-bold text-gray-600 mb-1">Звіт для:</label>
      <select v-model="reportPosition" class="styled-select font-bold report-select">
        <option value="">Усі позиції</option>
        <option v-for="pos in POSITIONS" :key="pos" :value="pos">{{ pos }}</option>
      </select>
    </div>
    <button @click="$emit('export')" class="btn btn-excel">📊 СКАЧАТИ ЗВІТ В EXCEL</button>
  </div>
</template>
