<script setup>
import { variantFieldLabel } from '../domain/catalog.js'
import SerialField from './SerialField.vue'

defineProps({
  item: { type: Object, required: true },
  preset: { type: Object, default: null }
})

const form = defineModel('form', { type: Object, required: true })

defineEmits(['save', 'cancel'])
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('cancel')">
    <form class="modal-box" @submit.prevent="$emit('save')">
      <h4>✎ Редагувати запис</h4>
      <div class="modal-sub">{{ item.position_name }} · {{ item.item_name }}</div>

      <template v-if="preset && preset.kit">
        <label class="modal-label">{{ variantFieldLabel(preset) }} *</label>
        <select v-model="form.variant" class="styled-select">
          <option v-if="form.variant && !preset.variants.includes(form.variant)" :value="form.variant">{{ form.variant }} (немає в списку)</option>
          <option v-for="m in preset.variants" :key="m" :value="m">{{ m }}</option>
        </select>
        <label class="modal-label">S/N *</label>
        <SerialField v-model="form.serial" :prefix="preset.serialPrefix" />
      </template>

      <template v-else-if="preset && preset.needsSerial">
        <label v-if="!preset.noBrand" class="modal-label">{{ preset.brandLabel || 'Марка' }} *</label>
        <input v-if="!preset.noBrand" v-model="form.brand" class="styled-input" />
        <label v-if="preset.hasModel" class="modal-label">Модель *</label>
        <input v-if="preset.hasModel" v-model="form.model" class="styled-input" />
        <label class="modal-label">Серійний номер{{ preset.serialOptional ? ' (необов\'язково)' : ' *' }}</label>
        <SerialField v-model="form.serial" />
      </template>

      <template v-else-if="preset && preset.variants">
        <label class="modal-label">{{ variantFieldLabel(preset) }}{{ preset.variantOptional ? ' (необов’язково)' : ' *' }}</label>
        <select v-model="form.variant" class="styled-select">
          <option v-if="preset.variantOptional" value="">Без виду</option>
          <option v-if="form.variant && !preset.variants.includes(form.variant)" :value="form.variant">{{ form.variant }} (немає в списку)</option>
          <option v-for="m in preset.variants" :key="m" :value="m">{{ m }}</option>
        </select>
        <label v-if="preset.callsign" class="modal-label">Ім'я дрона (необов'язково)</label>
        <input v-if="preset.callsign" v-model="form.callsign" maxlength="40" class="styled-input" />
        <label v-if="preset.presenceOrCount" class="modal-label">Облік</label>
        <select v-if="preset.presenceOrCount" v-model="form.noCount" class="styled-select">
          <option :value="false">З кількістю (штуки)</option>
          <option :value="true">Просто є / немає</option>
        </select>
      </template>

      <template v-else-if="preset && preset.freeName">
        <label class="modal-label">Назва *</label>
        <input v-model="form.name" class="styled-input" />
      </template>

      <template v-else-if="preset && preset.lengthM">
        <label class="modal-label">Довжина одного відрізка, м{{ preset.lengthOptional ? ' (необов\'язково)' : ' *' }}</label>
        <input v-model="form.length" type="number" min="0.1" step="0.1" class="styled-input" />
      </template>

      <template v-else-if="!preset">
        <label class="modal-label">Назва *</label>
        <input v-model="form.fullName" class="styled-input" />
      </template>

      <label class="modal-label">Примітки</label>
      <input v-model="form.notes" class="styled-input" />

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" @click="$emit('cancel')">Скасувати</button>
        <button type="submit" class="btn btn-success modal-save">Зберегти</button>
      </div>
    </form>
  </div>
</template>
