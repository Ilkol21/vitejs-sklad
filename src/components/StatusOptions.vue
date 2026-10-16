<script setup>
import { STATUS_OPTIONS } from '../config/app.js'
</script>

<template>
  <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
</template>
