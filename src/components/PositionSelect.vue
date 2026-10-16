<script setup>
import { POSITIONS } from '../config/app.js'

const position = defineModel({ type: String, required: true })
</script>

<template>
  <div class="pos-management">
    <label><b>Позиція:</b></label>
    <select v-model="position" class="styled-select font-bold">
      <option v-for="pos in POSITIONS" :key="pos" :value="pos">{{ pos }}</option>
    </select>
  </div>
</template>
