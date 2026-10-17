<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { SERIAL_PLACEHOLDERS } from '../config/app.js'
import { isPlaceholderSerial, withSerialPrefix } from '../domain/serial.js'

const props = defineProps({
  placeholder: { type: String, default: '' },
  // Префікс, з якого завжди починається S/N (у Старлінка «KIT»): він уже вписаний в полі і його не можна стерти
  prefix: { type: String, default: '' }
})

// Серійний номер одним полем: номер можна вписати вручну або вибрати зі списку «Невідомо/Зафарбовано»
const serial = defineModel({ type: String, default: '' })

const root = ref(null)
const open = ref(false)
const isPlaceholder = computed(() => SERIAL_PLACEHOLDERS.includes(serial.value))

const pick = value => {
  serial.value = value
  open.value = false
}

// Повернутися до ручного вводу (після вибору позначки): поле повертається до префікса або порожнього
const enterManually = () => pick(props.prefix)

// Введення: префікс не зникає (при стиранні лишається «KIT»), а вставлений номер без префікса доповнюється
const onInput = event => {
  let value = event.target.value
  if (props.prefix && !isPlaceholderSerial(value)) {
    const typed = value.trim().toLowerCase()
    value = props.prefix.toLowerCase().startsWith(typed) ? props.prefix : withSerialPrefix(value, props.prefix)
    if (event.target.value !== value) event.target.value = value
  }
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
    <input :value="serial" :placeholder="placeholder" class="styled-input" @input="onInput" />
    <button type="button" class="serial-toggle" aria-label="Позначка: номер невідомий або зафарбований" @click="open = !open">▾</button>
    <ul v-if="open" class="serial-options">
      <li v-for="p in SERIAL_PLACEHOLDERS" :key="p">
        <button type="button" class="serial-option" @click="pick(p)">{{ p }}</button>
      </li>
      <li v-if="isPlaceholder">
        <button type="button" class="serial-option" @click="enterManually">Ввести номер вручну</button>
      </li>
    </ul>
  </div>
</template>
