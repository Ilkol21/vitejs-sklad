<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as XLSX from 'xlsx'
import { supabase } from './supabase.js'

// Моделі дронів (вибір при додаванні пункту «Дрони»)
const DRONE_MODELS = ['Mavic 3 Pro', 'Mavic 3T', 'Mavic 3TA', 'Mavic 4 Pro', 'Matrice 4T', 'Outel', 'Matrice 4']

// Список обладнання на позиції: назва + категорія (підставляється автоматично)
const PRESET_ITEMS = [
  { name: 'Старлінк', category: 'Зв\'язок' },
  { name: 'Генератор', category: 'Живлення' },
  { name: 'Зарядні станції (EcoFlow)', category: 'Живлення', needsSerial: true },
  { name: 'Рація + павук', category: 'Зв\'язок', needsSerial: true },
  { name: 'Камера спостереження', category: 'Зв\'язок' },
  { name: 'Антена', category: 'Зв\'язок' },
  { name: 'Репітор', category: 'Зв\'язок' },
  { name: 'Зарядні хаби', category: 'Живлення' },
  { name: 'Зарядки 55"', category: 'Живлення' },
  { name: 'Кабелі "RGB"', category: 'Зв\'язок' },
  { name: 'ОЗМ', category: 'Боєприпаси' },
  { name: 'Кірка', category: 'Інструменти' },
  { name: 'Лопати', category: 'Інструменти' },
  { name: 'Газовий балон', category: 'Витратні матеріали' },
  { name: 'Бур', category: 'Живлення' },
  { name: 'Протигази', category: 'Спорядження' },
  { name: 'Вогнегасники', category: 'Спорядження' },
  { name: 'Пульти до дронів', category: 'БПЛА' },
  { name: 'Батарейки до дронів', category: 'БПЛА' },
  { name: 'Батарейки — старки', category: 'Зв\'язок' },
  { name: 'Планшети', category: 'БПЛА', needsSerial: true },
  { name: 'Дрони', category: 'БПЛА', models: DRONE_MODELS },
  { name: 'Перехідники', category: 'Інше' },
  { name: 'БК', category: 'Боєприпаси' },
  { name: 'Скиди', category: 'БПЛА' },
  { name: 'Рупор', category: 'Зв\'язок' },
  { name: 'Зарядка до рації', category: 'Зв\'язок' },
  { name: 'Маск-сітка', category: 'Спорядження' },
  { name: 'Сокира', category: 'Інструменти' },
  { name: 'Степлери', category: 'Інструменти' },
  { name: 'Цвяхи', category: 'Витратні матеріали' },
  { name: 'Переноски', category: 'Живлення' },
  { name: 'Зіп до генератора', category: 'Живлення' },
  { name: 'Трійники', category: 'Живлення' },
  { name: 'Світло', category: 'Живлення' },
  { name: 'Лопасті', category: 'БПЛА' },
  { name: 'Стяжки', category: 'Витратні матеріали' },
  { name: 'Ізолента', category: 'Витратні матеріали' },
  { name: 'Сітка від РПВ', category: 'Спорядження' },
  { name: 'Спальники', category: 'Спорядження' },
  { name: 'Каримати', category: 'Спорядження' },
  { name: 'Мішки', category: 'Витратні матеріали' },
  { name: 'Грілка', category: 'Спорядження' },
  { name: 'Пальник', category: 'Спорядження' },
  { name: 'Мультиметр', category: 'Інструменти' },
  { name: 'Жужик для ОЗМ', category: 'Боєприпаси' },
  { name: 'Датчик газу', category: 'Спорядження' },
  { name: 'Бензин', category: 'Витратні матеріали' },
  { name: 'Масло', category: 'Витратні матеріали' },
  { name: 'Розпорки для дронів', category: 'БПЛА' },
  { name: 'Кріплення на спирку', category: 'Інше' },
  { name: 'Ремінь на кріплення', category: 'Інше' },
  { name: 'Посуд', category: 'Спорядження' },
  { name: 'Мультитул', category: 'Інструменти' },
  { name: 'Ніж', category: 'Інструменти' },
  { name: 'Шестигранні ключі', category: 'Інструменти' }
]

const POSITIONS = ['Позиція «Чіпс»', 'Позиція «Зебра»', 'Позиція «Осло»', 'Позиція «Гарпун»']

const unitName = ref(localStorage.getItem('unit_name') || '128 ОГШБр')
const selectedPositionName = ref(POSITIONS[0])

const selectedPresetItem = ref(PRESET_ITEMS[0].name)
const category = ref(PRESET_ITEMS[0].category)
const status = ref('На позиції')
const quantity = ref(1)
const notes = ref('')
const brand = ref('')
const serial = ref('')
const droneModel = ref('')
const currentPreset = computed(() => PRESET_ITEMS.find(p => p.name === selectedPresetItem.value))

const items = ref([])
const toastMessage = ref('')
let realtimeChannel = null

const showMsg = (msg, isError = false) => {
      toastMessage.value = msg
        setTimeout(() => { toastMessage.value = '' }, 4000)
}

const saveUnitName = () => {
      localStorage.setItem('unit_name', unitName.value)
        showMsg('Назву підрозділу збережено!')
}

// Завантаження з хмари
const loadItems = async () => {
      const { data, error } = await supabase
          .from('items')
              .select('*')
                  .eq('position_name', selectedPositionName.value)

                    if (error) {
                            console.error(error)
                                showMsg('Помилка завантаження: ' + error.message, true)
                    } else {
                            items.value = data || []
                    }
}

// Підписка в реальному часі
const subscribeRealtime = () => {
      realtimeChannel = supabase
          .channel('public:items')
              .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
                      loadItems()
              })
                  .subscribe()
}

onMounted(() => {
      loadItems()
        subscribeRealtime()
})

onUnmounted(() => {
      if (realtimeChannel) supabase.removeChannel(realtimeChannel)
})

watch(selectedPositionName, () => {
      loadItems()
})

const onPresetChange = () => {
  const preset = PRESET_ITEMS.find(p => p.name === selectedPresetItem.value)
  if (preset) category.value = preset.category
  brand.value = ''
  serial.value = ''
  droneModel.value = ''
  if (preset && preset.needsSerial) quantity.value = 1
}

// Додавання в хмару з виведенням точної помилки
const addItem = async () => {
  if (!selectedPresetItem.value) return

  const preset = currentPreset.value
  let fullName = selectedPresetItem.value
  let qty = Number(quantity.value)

  if (preset && preset.needsSerial) {
    const b = brand.value.trim()
    const sn = serial.value.trim()
    if (!b) { showMsg('Вкажіть марку', true); return }
    if (!sn) { showMsg('Вкажіть серійний номер', true); return }
    fullName = `${preset.name} — ${b}, S/N ${sn}`
    qty = 1

    // Один серійний номер = один запис (на жодній з позицій)
    const { data: dup, error: dupErr } = await supabase.from('items').select('position_name').eq('item_name', fullName).limit(1)
    if (dupErr) {
      showMsg('Помилка перевірки: ' + dupErr.message, true)
      return
    }
    if (dup && dup.length) {
      showMsg('Такий серійний номер уже є: ' + dup[0].position_name, true)
      return
    }
  } else if (preset && preset.models) {
    if (!droneModel.value) { showMsg('Оберіть модель', true); return }
    fullName = `${preset.name} — ${droneModel.value}`
  }

        const { error } = await supabase.from('items').insert([
                {
                          position_name: selectedPositionName.value,
                                category: category.value,
item_name: fullName,
                                            status: status.value,
quantity: qty,
                                                        notes: notes.value
                }
        ])

          if (error) {
                console.error('SUPABASE ERROR:', error)
                    showMsg('Помилка бази: ' + error.message, true)
          } else {
                notes.value = ''
quantity.value = 1
                    serial.value = ''
                        showMsg('Збережено в хмару!')
                            loadItems()
          }
}

const updateItemQty = async (id, newQty) => {
      const { error } = await supabase.from('items').update({ quantity: Number(newQty) }).eq('id', id)
        if (error) showMsg('Помилка оновлення: ' + error.message, true)
}

const updateItemStatus = async (id, newStatus) => {
      const { error } = await supabase.from('items').update({ status: newStatus }).eq('id', id)
        if (error) {
                showMsg('Помилка статусу: ' + error.message, true)
        } else {
                loadItems()
        }
}

const deleteItem = async (id) => {
      const { error } = await supabase.from('items').delete().eq('id', id)
        if (error) {
                showMsg('Помилка видалення: ' + error.message, true)
        } else {
                loadItems()
                    showMsg('Видалено')
        }
}

const exportExcel = async () => {
      try {
            const { data: allItems, error } = await supabase.from('items').select('*')
                if (error) throw error

                    const filteredItems = (allItems || []).filter(item => {
                              return item.quantity > 0 || item.status === 'Потреба' || item.status === 'На ремонт'
                    })

                        const reportData = filteredItems.map(item => ({
                                  'Позиція': item.position_name,
                                        'Категорія': item.category,
                                              'Назва / Обладнання': item.item_name,
                                                    'Статус': item.status,
                                                          'Кількість': item.quantity,
                                                                'Примітки': item.notes || ''
                        }))

                            const wb = XLSX.utils.book_new()
                                const ws = XLSX.utils.json_to_sheet(reportData)
                                    XLSX.utils.book_append_sheet(wb, ws, 'Облік майна')

                                        const prefix = unitName.value ? `_${unitName.value.replace(/\s+/g, '')}` : ''
                                            const dateStr = new Date().toLocaleDateString('uk-UA').replace(/\./g, '-')
                                                XLSX.writeFile(wb, `Звіт_Склад${prefix}_${dateStr}.xlsx`)
                                                    showMsg('Excel файл успішно завантажено!')
      } catch (err) {
            showMsg('Помилка вивантаження Excel!', true)
      }
}
</script>

<template>
  <div class="app-container">
      <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>

          <h2>📦 Облік майна БПЛА (Онлайн / Реалтайм)</h2>

              <div class="pos-management">
                    <label><b>Позиція:</b></label>
                          <select v-model="selectedPositionName" class="styled-select font-bold">
                                  <option v-for="pos in POSITIONS" :key="pos" :value="pos">{{ pos }}</option>
                                        </select>
                                            </div>

                                                <div class="content-box">
                                                      <form @submit.prevent="addItem" class="add-form">
                                                              <h4 class="font-bold text-gray-700">➕ Додати майно зі списку</h4>
                                                                      <div class="grid-form">
                                                                                <select v-model="selectedPresetItem" @change="onPresetChange" class="styled-select item-select">
                                                                                            <option v-for="preset in PRESET_ITEMS" :key="preset.name" :value="preset.name">{{ preset.name }}</option>
                                                                                                      </select>

          <div v-if="currentPreset && currentPreset.needsSerial" class="qty-notes-row">
            <input v-model="brand" placeholder="Марка *" class="styled-input notes-input" />
            <input v-model="serial" placeholder="Серійний номер *" class="styled-input notes-input" />
          </div>

          <select v-if="currentPreset && currentPreset.models" v-model="droneModel" class="styled-select item-select">
            <option value="" disabled>Оберіть модель дрона *</option>
            <option v-for="m in currentPreset.models" :key="m" :value="m">{{ m }}</option>
          </select>

                                                                                                                <select v-model="status" class="styled-select status-select">
                                                                                                                            <option value="На позиції">🟢 На позиції</option>
                                                                                                                                        <option value="Потреба">🟡 Потреба</option>
                                                                                                                                                    <option value="На ремонт">🔴 На ремонт</option>
                                                                                                                                                              </select>

                                                                                                                                                                        <div class="qty-notes-row">
                                                                                                                                                                                    <input type="number" v-model="quantity" :disabled="currentPreset && currentPreset.needsSerial" min="1" placeholder="К-ть" class="styled-input qty-input font-bold" />
                                                                                                                                                                                                <input v-model="notes" placeholder="Примітки / номер" class="styled-input notes-input" />
                                                                                                                                                                                                          </div>

                                                                                                                                                                                                                    <button type="submit" class="btn btn-success">Зберегти в хмару</button>
                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                  </form>

                                                                                                                                                                                                                                        <div class="single-table-container">
                                                                                                                                                                                                                                                <h3>📋 Майно на обраній позиції</h3>
                                                                                                                                                                                                                                                        <div class="table-wrap">
                                                                                                                                                                                                                                                                  <table class="styled-table">
                                                                                                                                                                                                                                                                              <thead>
                                                                                                                                                                                                                                                                                            <tr>
                                                                                                                                                                                                                                                                                                            <th>Назва / Обладнання</th>
                                                                                                                                                                                                                                                                                                                            <th class="th-status">Статус</th>
                                                                                                                                                                                                                                                                                                                                            <th class="th-qty">К-ть</th>
                                                                                                                                                                                                                                                                                                                                                            <th class="th-action">Дії</th>
                                                                                                                                                                                                                                                                                                                                                                          </tr>
                                                                                                                                                                                                                                                                                                                                                                                      </thead>
                                                                                                                                                                                                                                                                                                                                                                                                  <tbody>
                                                                                                                                                                                                                                                                                                                                                                                                                <tr v-for="item in items" :key="item.id">
                                                                                                                                                                                                                                                                                                                                                                                                                                <td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                  <b>{{ item.item_name }}</b><br/><small class="item-meta">[{{ item.category }}] {{ item.notes }}</small>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                  </td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <td class="td-status">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    <select :value="item.status" @change="e => updateItemStatus(item.id, e.target.value)" class="styled-select status-cell-select" :class="{
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            'status-green': item.status === 'На позиції',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                'status-orange': item.status === 'Потреба',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    'status-red': item.status === 'На ремонт'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    }">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        <option value="На позиції">🟢 На позиції</option>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            <option value="Потреба">🟡 Потреба</option>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                <option value="На ремонт">🔴 На ремонт</option>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  </select>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  </td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <td class="td-qty">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    <input type="number" :value="item.quantity" @input="e => updateItemQty(item.id, e.target.value)" class="styled-input qty-edit font-bold" />
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    </td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    <td class="td-action">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <button @click="deleteItem(item.id)" class="del-btn">✕</button>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      </td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    </tr>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <tr v-if="items.length === 0">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <td colspan="4" class="text-center text-gray-400 py-4">На цій позиції поки немає майна в хмарі.</td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                </tr>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            </tbody>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      </table>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    </div>

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          <div class="excel-footer-box">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <div class="excel-inputs">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            <label class="block text-xs font-bold text-gray-600 mb-1">Підрозділ для звіту:</label>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <div class="flex gap-2">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <input v-model="unitName" type="text" placeholder="Напр. 128 ОГШБр" class="styled-input flex-1 font-bold" />
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              <button @click="saveUnitName" class="btn btn-secondary">Зберегти назву</button>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        <button @click="exportExcel" class="btn btn-excel">📊 СКАЧАТИ ЗВІТ В EXCEL</button>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              </div>

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    </template>

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    <style scoped>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .app-container { padding: 10px; font-family: system-ui, -apple-system, sans-serif; max-width: 1000px; margin: 0 auto; color: #333; box-sizing: border-box; width: 100%; padding-bottom: 60px; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    h2 { margin-bottom: 10px; font-size: 20px; color: #111; font-weight: 800; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    h3 { margin-bottom: 8px; font-size: 15px; color: #333; font-weight: 700; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    h4 { margin-bottom: 6px; font-size: 13px; color: #444; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .toast { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background: #1e293b; color: #fff; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: bold; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .pos-management { display: flex; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 12px; gap: 8px; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .styled-input, .styled-select { padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #fff; outline: none; box-sizing: border-box; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .btn { padding: 10px 14px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700; white-space: nowrap; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .btn-success { background: #16a34a; color: white; width: 100%; padding: 12px; font-size: 15px; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .btn-secondary { background: #475569; color: white; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .btn-excel { background: #0284c7; color: white; width: 100%; padding: 14px; font-size: 16px; margin-top: 10px; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .add-form { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .grid-form { display: flex; flex-direction: column; gap: 8px; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .qty-notes-row { display: flex; gap: 6px; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .qty-input { width: 90px; text-align: center; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .notes-input { flex-grow: 1; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .single-table-container { background: #fff; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .table-wrap { width: 100%; overflow-x: auto; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .styled-table { width: 100%; border-collapse: collapse; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    th { font-size: 12px; font-weight: 600; color: #555; text-align: left; padding: 8px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    td { font-size: 13px; padding: 8px; vertical-align: middle; border-bottom: 1px solid #f1f5f9; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .th-status, .td-status { width: 160px; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .th-qty, .td-qty { width: 75px; text-align: center; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .th-action, .td-action { width: 50px; text-align: center; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .status-cell-select { font-size: 12px; font-weight: bold; padding: 6px; border-radius: 6px; width: 100%; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .status-green { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .status-orange { background: #fffbeb; color: #92400e; border-color: #fde68a; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .status-red { background: #fef2f2; color: #991b1b; border-color: #fecaca; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .qty-edit { width: 65px; text-align: center; padding: 6px; font-size: 14px; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .item-meta { color: #64748b; font-size: 11px; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .del-btn { color: #dc2626; background: #fee2e2; border: none; cursor: pointer; font-weight: bold; font-size: 13px; padding: 6px 10px; border-radius: 6px; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .excel-footer-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 8px; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .text-center { text-align: center; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    </style>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    }
      }
                        }))
                    })
      }
}
        }
        }
}
        }
        }
}
}
          }
          }
                }
        ])
}
        }
        }
        }
}
})
})
})
              })
}
                    }
                    }
}
}
}
]