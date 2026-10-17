import { ref, computed, watch } from 'vue'
import { PRESET_ITEMS } from '../config/presets.js'
import { STATUS } from '../config/app.js'
import { findPreset } from '../domain/catalog.js'
import { addItem } from '../services/addItemService.js'
import { applyResult } from './applyResult.js'

// Форма «Додати майно зі списку»: поля, вибраний пункт каталогу і відправка.
export const useAddForm = (selectedPositionName, loadItems) => {
  const selectedPresetItem = ref(PRESET_ITEMS[0].name)
  const category = ref(PRESET_ITEMS[0].category)
  const status = ref(STATUS.OK)
  const quantity = ref(1)
  const notes = ref('')
  const brand = ref('')
  const serial = ref('')
  const variant = ref('')
  const deviceModel = ref('')
  const callsign = ref('')
  const customName = ref('')
  const kitNumbers = ref('')
  const lengthM = ref('')
  const extraQty = ref('')
  // Комбінований облік (Лопасті): true = «просто є / немає» без кількості
  const noCount = ref(false)

  const fields = {
    quantity, noCount, notes, brand, serial, variant, deviceModel, callsign, customName, kitNumbers, lengthM, extraQty
  }

  const currentPreset = computed(() => findPreset(selectedPresetItem.value))

  // Перехід у режим «просто є»: значення беремо 1 (є) або 0 (немає)
  watch(noCount, on => { if (on) quantity.value = Number(quantity.value) > 0 ? 1 : 0 })

  // Дрон з іменем завжди в одному екземплярі
  watch(callsign, v => { if (String(v || '').trim()) quantity.value = 1 })

  const onPresetChange = () => {
    const preset = findPreset(selectedPresetItem.value)
    if (preset) category.value = preset.category
    brand.value = ''
    serial.value = ''
    deviceModel.value = ''
    variant.value = ''
    customName.value = ''
    callsign.value = ''
    lengthM.value = ''
    kitNumbers.value = ''
    extraQty.value = ''
    noCount.value = false
    if (preset && (preset.needsSerial || preset.kit || preset.presence)) quantity.value = 1
  }

  const submit = async () => {
    const result = await addItem({
      presetName: selectedPresetItem.value,
      status: status.value,
      category: category.value,
      quantity: quantity.value,
      noCount: noCount.value,
      notes: notes.value,
      brand: brand.value,
      serial: serial.value,
      variant: variant.value,
      deviceModel: deviceModel.value,
      callsign: callsign.value,
      customName: customName.value,
      kitNumbers: kitNumbers.value,
      lengthM: lengthM.value,
      extraQty: extraQty.value
    }, { positionName: selectedPositionName.value })

    applyResult(result, { loadItems, setFields: patch => {
      for (const [key, value] of Object.entries(patch)) fields[key].value = value
    } })
  }

  return {
    selectedPresetItem, category, status, quantity, noCount, notes, brand, serial, variant, deviceModel,
    callsign, customName, kitNumbers, lengthM, extraQty, currentPreset, onPresetChange, submit
  }
}
