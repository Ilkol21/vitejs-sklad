<script setup>
import { toRef } from 'vue'
import { PRESET_ITEMS } from '../config/presets.js'
import { useAddForm } from '../composables/useAddForm.js'
import StatusOptions from './StatusOptions.vue'
import SerialField from './SerialField.vue'

const props = defineProps({
  positionName: { type: String, required: true }
})
// Після успішного додавання список майна треба перезавантажити; аргумент — статус доданого рядка
const emit = defineEmits(['saved'])

const {
  selectedPresetItem, status, quantity, noCount, notes, brand, serial, variant, deviceModel, callsign,
  customName, kitNumbers, lengthM, extraQty, currentPreset, onPresetChange, submit
} = useAddForm(toRef(props, 'positionName'), () => emit('saved', status.value))
</script>

<template>
  <form @submit.prevent="submit" class="add-form">
    <h4 class="font-bold text-gray-700">➕ Додати майно зі списку</h4>
    <div class="grid-form">
      <select v-model="selectedPresetItem" @change="onPresetChange" class="styled-select item-select">
        <option v-for="preset in PRESET_ITEMS" :key="preset.name" :value="preset.name">{{ preset.name }}</option>
      </select>

      <div v-if="currentPreset && currentPreset.needsSerial" class="serial-row">
        <input v-if="!currentPreset.noBrand" v-model="brand" :placeholder="(currentPreset.brandLabel || 'Марка') + ' *'" class="styled-input notes-input" />
        <input v-if="currentPreset.hasModel" v-model="deviceModel" placeholder="Модель *" class="styled-input notes-input" />
        <SerialField v-model="serial" placeholder="Серійний номер *" />
      </div>

      <select v-if="currentPreset && currentPreset.variants" v-model="variant" class="styled-select item-select">
        <option value="" disabled>Оберіть {{ currentPreset.variantLabel || 'вид' }} *</option>
        <option v-for="m in currentPreset.variants" :key="m" :value="m">{{ m }}</option>
      </select>

      <input v-if="currentPreset && currentPreset.callsign" v-model="callsign" placeholder="Імена дронів через кому (необов'язково), напр. Панда, Лис" class="styled-input" />

      <input v-if="currentPreset && currentPreset.freeName" v-model="customName" placeholder="Назва *" class="styled-input" />

      <input v-if="currentPreset && currentPreset.lengthM" v-model="lengthM" type="number" min="0.1" step="0.1" placeholder="Довжина одного відрізка, м *" class="styled-input" />

      <div v-if="currentPreset && currentPreset.kit" class="serial-row">
        <SerialField v-model="kitNumbers" :prefix="currentPreset.serialPrefix" placeholder="S/N *" />
      </div>

      <div v-if="currentPreset && currentPreset.extra" class="router-row">
        <label class="router-label">{{ currentPreset.extra.label }} (необов'язково):</label>
        <input type="number" v-model="extraQty" min="0" step="1" :placeholder="'К-ть: ' + currentPreset.extra.plural" class="styled-input qty-input" />
      </div>

      <select v-model="status" class="styled-select status-select">
        <StatusOptions />
      </select>

      <select v-if="currentPreset && currentPreset.presenceOrCount" v-model="noCount" class="styled-select">
        <option :value="false">Облік: з кількістю</option>
        <option :value="true">Облік: просто є / немає</option>
      </select>

      <div class="qty-notes-row">
        <select v-if="currentPreset && (currentPreset.presence || (currentPreset.presenceOrCount && noCount))" v-model.number="quantity" class="styled-select qty-input presence-select">
          <option :value="1">Є</option>
          <option :value="0">Немає</option>
        </select>
        <input v-else type="number" v-model="quantity" :disabled="currentPreset && (currentPreset.needsSerial || currentPreset.kit)" min="0" :step="currentPreset && currentPreset.unit ? '0.1' : '1'" :placeholder="currentPreset && currentPreset.unit === 'л' ? 'Літри' : (currentPreset && currentPreset.unit === 'м' ? 'Метри' : (currentPreset && currentPreset.lengthM ? 'К-ть відрізків' : 'К-ть'))" class="styled-input qty-input font-bold" />
        <input v-model="notes" placeholder="Примітки / номер" class="styled-input notes-input" />
      </div>

      <button type="submit" class="btn btn-success">Додати на позицію</button>
    </div>
  </form>
</template>
