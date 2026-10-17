<script setup>
import { STATUS_OPTIONS } from '../config/app.js'

defineProps({
  counts: { type: Object, required: true }
})

// Вибраний статус списку
const active = defineModel({ type: String, required: true })
</script>

<template>
  <div class="status-tabs" role="tablist">
    <button
      v-for="opt in STATUS_OPTIONS"
      :key="opt.value"
      type="button"
      role="tab"
      class="status-tab"
      :class="{ active: active === opt.value, [opt.cssClass]: active === opt.value }"
      :aria-selected="active === opt.value"
      @click="active = opt.value"
    >
      <span class="status-tab-label">{{ opt.label }}</span>
      <span class="status-tab-count">{{ counts[opt.value] }}</span>
    </button>
  </div>
</template>
