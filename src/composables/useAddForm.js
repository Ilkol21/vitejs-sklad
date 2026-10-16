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

  const fields = {
    quantity, notes, brand, serial, variant, deviceModel, callsign, customName, kitNumbers, lengthM, extraQty
  }

  const currentPreset = computed(() => findPreset(selectedPresetItem.value))

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
    if (preset && (preset.needsSerial || preset.kit || preset.presence)) quantity.value = 1
  }

  const submit = async () => {
    const result = await addItem({
      presetName: selectedPresetItem.value,
      status: status.value,
      category: category.value,
      quantity: quantity.value,
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
    selectedPresetItem, category, status, quantity, notes, brand, serial, variant, deviceModel,
    callsign, customName, kitNumbers, lengthM, extraQty, currentPreset, onPresetChange, submit
  }
}
