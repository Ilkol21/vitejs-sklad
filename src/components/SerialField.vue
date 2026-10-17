<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { SERIAL_PLACEHOLDERS } from '../config/app.js'

defineProps({
  placeholder: { type: String, default: '' }
})

// Серійний номер / KIT одним полем: номер можна вписати вручну або вибрати зі списку «Невідомо» / «Зафарбовано»
const serial = defineModel({ type: String, default: '' })

const root = ref(null)
const open = ref(false)

const pick = value => {
  serial.value = value
  open.value = false
}

// Клік поза полем закриває список
const closeOnOutsideClick = event => {
  if (root.value && !root.value.contains(event.target)) open.value = false
}
onMounted(() => document.addEventListener('click', closeOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', closeOnOutsideClick))
</script>

<template>
  <div ref="root" class="serial-field">
    <input v-model="serial" :placeholder="placeholder" class="styled-input" @input="open = false" />
    <button type="button" class="serial-toggle" aria-label="Позначка: номер невідомий або зафарбований" @click="open = !open">▾</button>
    <ul v-if="open" class="serial-options">
      <li v-for="p in SERIAL_PLACEHOLDERS" :key="p">
        <button type="button" class="serial-option" @click="pick(p)">{{ p }}</button>
      </li>
    </ul>
  </div>
</template>
