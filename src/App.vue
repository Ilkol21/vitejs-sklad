<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as XLSX from 'xlsx'
import { supabase } from './supabase.js'

// Список обладнання на позиції.
// kit: номер KIT вручну (кожен Старлінк додається окремо);
// extra: необов'язкова додаткова позиція з кількістю (роутер до Старлінка, павук до рації), зберігається окремим записом
// variants: список видів (обов'язковий вибір); freeName: вільна назва; needsSerial: серійний номер (noBrand: без марки);
// unit: одиниця виміру ('л'; за замовчуванням шт.); lengthM: довжина одного відрізка в метрах + кількість відрізків
const PRESET_ITEMS = [
  { name: 'Старлінк', category: 'Зв\'язок', kit: true, extra: { name: 'Роутер Старлінк', label: 'Роутер', plural: 'роутерів' }, variantLabel: 'версію', variants: ['Міні', '2 версія', '3 версія'] },
  { name: 'Генератор', category: 'Живлення' },
  { name: 'Зарядні станції (EcoFlow)', category: 'Живлення', needsSerial: true },
  { name: 'Рація', category: 'Зв\'язок', needsSerial: true, extra: { name: 'Павук', label: 'Павук', plural: 'павуків' } },
  { name: 'Камера спостереження', category: 'Зв\'язок' },
  { name: 'Антена', category: 'Зв\'язок', freeName: true },
  { name: 'Репітор', category: 'Зв\'язок' },
  { name: 'Зарядні хаби', category: 'Живлення', variants: ['Для Матріс', 'Для 4 Pro', 'Для 3 серії'] },
  { name: 'Спарки', category: 'Живлення', variants: ['Tulip', 'Для Аутель', 'До Матріс 5S', 'Звичайна 5S', 'Справа 4S'] },
  { name: 'Зарядка "5S"', category: 'Живлення' },
  { name: 'Кабель RG8', category: 'Зв\'язок', lengthM: true },
  { name: 'ОЗМ', category: 'Боєприпаси' },
  { name: 'Кірка', category: 'Інструменти' },
  { name: 'Лопати', category: 'Інструменти' },
  { name: 'Газовий балон', category: 'Витратні матеріали' },
  { name: 'Бур', category: 'Живлення' },
  { name: 'Протигази', category: 'Спорядження' },
  { name: 'Вогнегасники', category: 'Спорядження' },
  { name: 'Пульти до дронів', category: 'БПЛА', variants: ['Для 4 Pro', 'Для Матріс', 'Для Outel', 'Для 3 серії'] },
  { name: 'Батарейки до дронів', category: 'БПЛА', variants: ['Аутель', 'Мавік 3', 'Матріс', 'Мавік 4 Pro'] },
  { name: 'Планшети', category: 'БПЛА', needsSerial: true },
  { name: 'Дрони', category: 'БПЛА', variantLabel: 'модель дрона', variants: ['Mavic 3 Pro', 'Mavic 3T', 'Mavic 3TA', 'Mavic 4 Pro "Панда"', 'Mavic 4 Pro "Лікар"', 'Matrice 4T', 'Outel', 'Matrice 4'] },
  { name: 'Перехідники', category: 'Інше', variants: ['Для 3 серії', 'Для 4 Pro', 'Для Outel'] },
  { name: 'БК', category: 'Боєприпаси', variants: ['ВОГ', 'Патрони 5.56'] },
  { name: 'Скиди', category: 'БПЛА', variants: ['Одинарний', 'Подвійний'] },
  { name: 'Рупор', category: 'Зв\'язок', variants: ['Для 3 серії', 'Для 4 Pro', 'Для Матріс'] },
  { name: 'Зарядка до рації', category: 'Зв\'язок', needsSerial: true, noBrand: true },
  { name: 'Маск-сітка', category: 'Спорядження' },
  { name: 'Сокира', category: 'Інструменти' },
  { name: 'Степлери', category: 'Інструменти' },
  { name: 'Цвяхи', category: 'Витратні матеріали' },
  { name: 'Переноски', category: 'Живлення', variants: ['Велика на котушці', 'Мала'] },
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
  { name: 'Бензин', category: 'Витратні матеріали', unit: 'л' },
  { name: 'Масло', category: 'Витратні матеріали', unit: 'л' },
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
// Для якої позиції формувати звіт: '' = усі позиції
const reportPosition = ref('')

const selectedPresetItem = ref(PRESET_ITEMS[0].name)
const category = ref(PRESET_ITEMS[0].category)
const status = ref('На позиції')
const quantity = ref(1)
const notes = ref('')
const brand = ref('')
const serial = ref('')
const variant = ref('')
const customName = ref('')
const kitNumbers = ref('')
const lengthM = ref('')
const extraQty = ref('')
const currentPreset = computed(() => PRESET_ITEMS.find(p => p.name === selectedPresetItem.value))
// Пункт за повною назвою запису: «Дрони — Mavic 3T» -> пресет «Дрони»
const presetOf = fullName => {
  const base = String(fullName || '').split(' — ')[0]
  return PRESET_ITEMS.find(x => x.name === base)
}
const unitOf = name => { const p = presetOf(name); return (p && p.unit) || 'шт.' }
// Літри й метри можуть бути дробовими, решта лише цілими
const allowsDecimal = name => unitOf(name) === 'л' || unitOf(name) === 'м'
const isLiters = name => unitOf(name) === 'л'
const round2 = n => Math.round(Number(n) * 100) / 100

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
  variant.value = ''
  customName.value = ''
  lengthM.value = ''
  kitNumbers.value = ''
  extraQty.value = ''
  if (preset && (preset.needsSerial || preset.kit)) quantity.value = 1
}

// Повідомлення про помилку вставки (унікальний серійний номер / KIT або дублікат запису)
const insertErrorText = error => {
  if (error.code === '23505') {
    return String(error.message).includes('serial') ? 'Такий серійний номер / KIT уже є' : 'Такий запис уже є, оновіть сторінку'
  }
  return 'Помилка бази: ' + error.message
}

// Додаткова позиція до основної (роутер до Старлінка, павук до рації): окремий запис з власною кількістю,
// додається до наявного, якщо такий уже є з тим самим статусом
const addExtra = async (preset, n) => {
  const pos = selectedPositionName.value
  const name = preset.extra.name
  const { data: same, error: findErr } = await supabase.from('items').select('id, quantity')
    .eq('position_name', pos).eq('item_name', name).eq('status', status.value).limit(1)
  if (findErr) return findErr.message
  if (same && same.length) {
    const { error } = await supabase.from('items').update({ quantity: Number(same[0].quantity) + n }).eq('id', same[0].id)
    return error ? error.message : null
  }
  const { error } = await supabase.from('items').insert([
    { position_name: pos, category: category.value, item_name: name, status: status.value, quantity: n, notes: '' }
  ])
  return error ? error.message : null
}

// Кількість додаткової позиції з форми: 0 = не додавати, null = помилка введення
const parseExtraQty = preset => {
  if (!preset || !preset.extra) return 0
  const raw = String(extraQty.value === null || extraQty.value === undefined ? '' : extraQty.value).trim()
  if (raw === '') return 0
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) {
    showMsg(`Кількість ${preset.extra.plural} має бути цілим числом`, true)
    return null
  }
  return n
}

// Старлінк: версія + один номер KIT (кожен Старлінк додається окремо) + необов'язковий роутер
const addKitItems = async preset => {
  if (!variant.value) { showMsg(`Оберіть ${preset.variantLabel || 'вид'}`, true); return }

  const kit = kitNumbers.value.trim()
  if (!kit) { showMsg('Вкажіть номер KIT', true); return }
  if (/[,;\n]/.test(kit)) { showMsg('Вводьте один номер KIT: кожен Старлінк додається окремо', true); return }

  const extraN = parseExtraQty(preset)
  if (extraN === null) return

  // Номер KIT унікальний на всіх позиціях і версіях
  const { data: existing, error: exErr } = await supabase.from('items').select('item_name, position_name, variant, brand, serial').like('item_name', `${preset.name} — %`)
  if (exErr) { showMsg('Помилка перевірки: ' + exErr.message, true); return }
  const taken = (existing || []).find(row => itemParts(row).serial.toUpperCase() === kit.toUpperCase())
  if (taken) { showMsg(`Такий KIT уже є: ${kit} (${taken.position_name})`, true); return }

  const { error } = await supabase.from('items').insert([{
    position_name: selectedPositionName.value,
    category: category.value,
    item_name: `${preset.name} — ${variant.value}, KIT ${kit}`,
    variant: variant.value,
    serial: kit,
    status: status.value,
    quantity: 1,
    notes: notes.value
  }])
  if (error) {
    console.error('SUPABASE ERROR:', error)
    showMsg(insertErrorText(error), true)
    return
  }

  let extraMsg = ''
  let extraFailed = false
  if (extraN > 0) {
    const extraErr = await addExtra(preset, extraN)
    if (extraErr) { extraFailed = true; extraMsg = `. ${preset.extra.label} не додано: ${extraErr}` }
    else extraMsg = ` і ${preset.extra.plural}: ${extraN}`
  }
  notes.value = ''
  kitNumbers.value = ''
  extraQty.value = ''
  showMsg(`Додано «${preset.name} — ${variant.value}», KIT ${kit}${extraMsg}`, extraFailed)
  loadItems()
}


// Додавання на позицію з виведенням точної помилки
const addItem = async () => {
  if (!selectedPresetItem.value) return

  const preset = currentPreset.value
  let fullName = selectedPresetItem.value
  let qty = round2(quantity.value === '' || quantity.value === null ? NaN : quantity.value)
  let cols = {}
  let extraN = 0

  if (preset && preset.kit) {
    await addKitItems(preset)
    return
  }

  if (preset && preset.needsSerial) {
    const b = preset.noBrand ? '' : brand.value.trim()
    const sn = serial.value.trim()
    if (!preset.noBrand && !b) { showMsg('Вкажіть марку', true); return }
    if (!sn) { showMsg('Вкажіть серійний номер', true); return }
    if (/[,;\n]/.test(b + sn)) { showMsg('Вводьте один серійний номер без ком: кожна одиниця додається окремо', true); return }
    fullName = preset.noBrand ? `${preset.name} — S/N ${sn}` : `${preset.name} — ${b}, S/N ${sn}`
    qty = 1
    cols = { brand: b || null, serial: sn }
    extraN = parseExtraQty(preset)
    if (extraN === null) return

    // Один серійний номер = один запис (на жодній з позицій)
    const { data: dup, error: dupErr } = await supabase.from('items').select('item_name, position_name, variant, brand, serial').like('item_name', `${preset.name} — %`)
    if (dupErr) {
      showMsg('Помилка перевірки: ' + dupErr.message, true)
      return
    }
    const dupRow = (dup || []).find(r => { const p = itemParts(r); return p.brand.toLowerCase() === b.toLowerCase() && p.serial.toLowerCase() === sn.toLowerCase() })
    if (dupRow) {
      showMsg('Такий серійний номер уже є: ' + dupRow.position_name, true)
      return
    }
  } else if (preset && preset.variants) {
    if (!variant.value) { showMsg(`Оберіть ${preset.variantLabel || 'вид'}`, true); return }
    fullName = `${preset.name} — ${variant.value}`
    cols = { variant: variant.value }
  } else if (preset && preset.freeName) {
    const n = customName.value.trim()
    if (!n) { showMsg('Вкажіть назву', true); return }
    fullName = `${preset.name} — ${n}`
    cols = { variant: n }
  } else if (preset && preset.lengthM) {
    const len = round2(String(lengthM.value).trim() === '' ? NaN : lengthM.value)
    if (!Number.isFinite(len) || len <= 0 || len > 10000) { showMsg('Вкажіть довжину відрізка в метрах (більше 0)', true); return }
    fullName = `${preset.name} — ${len} м`
    cols = { variant: `${len} м` }
  }

  if (!Number.isFinite(qty) || qty < 0) {
    showMsg('Вкажіть кількість (0 або більше)', true)
    return
  }
  if (!allowsDecimal(fullName) && !Number.isInteger(qty)) {
    showMsg('Кількість має бути цілим числом', true)
    return
  }

  // Таке саме майно на позиції з тим самим статусом не дублюємо: додаємо кількість до наявного рядка
  if (!(preset && preset.needsSerial)) {
    const { data: same, error: sameErr } = await supabase.from('items').select('id, quantity, notes')
      .eq('position_name', selectedPositionName.value).eq('item_name', fullName)
      .eq('status', status.value).limit(1)
    if (sameErr) {
      showMsg('Помилка перевірки: ' + sameErr.message, true)
      return
    }
    if (same && same.length) {
      const row = same[0]
      if (qty === 0) {
        showMsg(`Уже є: ${row.quantity} ${unitOf(fullName)}. Щоб позначити, що немає, змініть кількість у таблиці на 0`, true)
        return
      }
      const total = round2(Number(row.quantity) + qty)
      const extra = notes.value.trim()
      const mergedNotes = !extra ? (row.notes || '') : (row.notes ? (row.notes.includes(extra) ? row.notes : row.notes + '; ' + extra) : extra)
      const { error: updErr } = await supabase.from('items').update({ quantity: total, notes: mergedNotes }).eq('id', row.id)
      if (updErr) {
        showMsg('Помилка оновлення: ' + updErr.message, true)
        return
      }
      notes.value = ''
      quantity.value = 1
      showMsg(`Таке майно вже є: кількість збільшено, тепер ${total} ${unitOf(fullName)}`)
      loadItems()
      return
    }
  }

  const { error } = await supabase.from('items').insert([
    {
      position_name: selectedPositionName.value,
      category: category.value,
      item_name: fullName,
      status: status.value,
      quantity: qty,
      notes: notes.value,
      ...cols
    }
  ])

  if (error) {
    console.error('SUPABASE ERROR:', error)
    showMsg(insertErrorText(error), true)
  } else {
    notes.value = ''
    quantity.value = 1
    serial.value = ''
    customName.value = ''
    lengthM.value = ''
    extraQty.value = ''
    let extraMsg = ''
    let extraFailed = false
    if (extraN > 0) {
      const extraErr = await addExtra(preset, extraN)
      if (extraErr) { extraFailed = true; extraMsg = ` ${preset.extra.label} не додано: ${extraErr}` }
      else extraMsg = ` + ${preset.extra.plural}: ${extraN}`
    }
    showMsg(`Додано на позицію!${extraMsg}`, extraFailed)
    loadItems()
  }
}

const updateItemQty = async (id, newQty) => {
  if (newQty === '' || Number(newQty) < 0) { loadItems(); return }
  const current = items.value.find(i => i.id === id)
  const qty = round2(newQty)
  if (current && !allowsDecimal(current.item_name) && !Number.isInteger(qty)) {
    showMsg('Кількість має бути цілим числом', true)
    loadItems()
    return
  }
  const { error } = await supabase.from('items').update({ quantity: qty }).eq('id', id)
  if (error) showMsg('Помилка оновлення: ' + error.message, true)
}

const updateItemStatus = async (id, newStatus) => {
  const current = items.value.find(i => i.id === id)
  if (!current || current.status === newStatus) return

  // Такий самий рядок (позиція + назва + статус) не дублюємо: кількість зливається в наявний
  const { data: same, error: sameErr } = await supabase.from('items').select('id, quantity')
    .eq('position_name', current.position_name).eq('item_name', current.item_name)
    .eq('status', newStatus).neq('id', id).limit(1)
  if (sameErr) {
    showMsg('Помилка статусу: ' + sameErr.message, true)
    loadItems()
    return
  }
  if (same && same.length) {
    const target = same[0]
    const total = round2(Number(target.quantity) + Number(current.quantity))
    const { error: mergeErr } = await supabase.from('items').update({ quantity: total }).eq('id', target.id)
    if (mergeErr) {
      showMsg('Помилка об\'єднання: ' + mergeErr.message, true)
      loadItems()
      return
    }
    const { error: delErr } = await supabase.from('items').delete().eq('id', id)
    if (delErr) showMsg('Помилка видалення: ' + delErr.message, true)
    else showMsg(`Об'єднано з наявним рядком: тепер ${total} ${unitOf(current.item_name)}`)
    loadItems()
    return
  }

  const { error } = await supabase.from('items').update({ status: newStatus }).eq('id', id)
  if (error) {
    showMsg('Помилка статусу: ' + error.message, true)
  } else {
    loadItems()
  }
}

// Редагування запису: марка, серійний номер / KIT, вид, довжина відрізка, назва, примітки
// (кількість і статус міняються прямо в таблиці)
const editingId = ref(null)
const editForm = ref({ fullName: '', brand: '', serial: '', variant: '', name: '', length: '', notes: '' })
const editingItem = computed(() => items.value.find(i => i.id === editingId.value) || null)
const editPreset = computed(() => (editingItem.value ? presetOf(editingItem.value.item_name) : null))

const startEdit = item => {
  const p = itemParts(item)
  const preset = presetOf(item.item_name)
  editForm.value = {
    fullName: item.item_name,
    brand: p.brand,
    serial: p.serial,
    variant: p.detail,
    name: p.detail,
    length: preset && preset.lengthM ? String(parseFloat(p.detail) || '') : '',
    notes: item.notes || ''
  }
  editingId.value = item.id
}
const cancelEdit = () => { editingId.value = null }

const saveEdit = async () => {
  const item = editingItem.value
  if (!item) return
  const preset = editPreset.value
  const f = editForm.value
  const hasComma = s => /[,;\n]/.test(s)
  let newName = item.item_name
  let cols = {}

  if (preset && preset.kit) {
    const v = f.variant.trim()
    const kit = f.serial.trim()
    if (!v) { showMsg(`Оберіть ${preset.variantLabel || 'вид'}`, true); return }
    if (!kit) { showMsg('Вкажіть номер KIT', true); return }
    if (hasComma(kit)) { showMsg('Вводьте один номер KIT', true); return }
    newName = `${preset.name} — ${v}, KIT ${kit}`
    cols = { variant: v, brand: null, serial: kit }
  } else if (preset && preset.needsSerial) {
    const b = preset.noBrand ? '' : f.brand.trim()
    const sn = f.serial.trim()
    if (!preset.noBrand && !b) { showMsg('Вкажіть марку', true); return }
    if (!sn) { showMsg('Вкажіть серійний номер', true); return }
    if (hasComma(b + sn)) { showMsg('Вводьте один серійний номер без ком', true); return }
    newName = preset.noBrand ? `${preset.name} — S/N ${sn}` : `${preset.name} — ${b}, S/N ${sn}`
    cols = { variant: null, brand: b || null, serial: sn }
  } else if (preset && preset.variants) {
    const v = f.variant.trim()
    if (!v) { showMsg(`Оберіть ${preset.variantLabel || 'вид'}`, true); return }
    newName = `${preset.name} — ${v}`
    cols = { variant: v }
  } else if (preset && preset.freeName) {
    const n = f.name.trim()
    if (!n) { showMsg('Вкажіть назву', true); return }
    newName = `${preset.name} — ${n}`
    cols = { variant: n }
  } else if (preset && preset.lengthM) {
    const len = round2(String(f.length).trim() === '' ? NaN : f.length)
    if (!Number.isFinite(len) || len <= 0 || len > 10000) { showMsg('Вкажіть довжину відрізка в метрах (більше 0)', true); return }
    newName = `${preset.name} — ${len} м`
    cols = { variant: `${len} м` }
  } else if (!preset) {
    // Старий запис, якого немає в поточному списку: дозволяємо виправити назву повністю
    const n = f.fullName.trim()
    if (!n) { showMsg('Вкажіть назву', true); return }
    newName = n
  }

  // Серійний номер / KIT унікальний на всіх позиціях
  if (preset && (preset.kit || preset.needsSerial)) {
    const { data: others, error: exErr } = await supabase.from('items')
      .select('id, item_name, position_name, variant, brand, serial').like('item_name', `${preset.name} — %`)
    if (exErr) { showMsg('Помилка перевірки: ' + exErr.message, true); return }
    const sn = cols.serial.toLowerCase()
    const br = (cols.brand || '').toLowerCase()
    const clash = (others || []).find(r => {
      if (r.id === item.id) return false
      const p = itemParts(r)
      return p.serial.toLowerCase() === sn && (preset.kit || p.brand.toLowerCase() === br)
    })
    if (clash) { showMsg(`Такий ${preset.kit ? 'KIT' : 'серійний номер'} уже є: ${clash.position_name}`, true); return }
  }

  // Нова назва збіглася з наявним рядком (та сама позиція й статус): кількості зливаємо
  if (newName !== item.item_name && !(preset && (preset.kit || preset.needsSerial))) {
    const { data: same, error: sameErr } = await supabase.from('items').select('id, quantity, notes')
      .eq('position_name', item.position_name).eq('item_name', newName)
      .eq('status', item.status).neq('id', item.id).limit(1)
    if (sameErr) { showMsg('Помилка перевірки: ' + sameErr.message, true); return }
    if (same && same.length) {
      const target = same[0]
      const total = round2(Number(target.quantity) + Number(item.quantity))
      if (!window.confirm(`Запис «${newName}» уже є (${target.quantity} ${unitOf(newName)}).\nОб'єднати: буде ${total} ${unitOf(newName)}, а цей рядок зникне?`)) return
      const extra = f.notes.trim()
      const mergedNotes = !extra ? (target.notes || '') : (target.notes ? (target.notes.includes(extra) ? target.notes : target.notes + '; ' + extra) : extra)
      const { error: mergeErr } = await supabase.from('items').update({ quantity: total, notes: mergedNotes }).eq('id', target.id)
      if (mergeErr) { showMsg('Помилка об\'єднання: ' + mergeErr.message, true); return }
      const { error: delErr } = await supabase.from('items').delete().eq('id', item.id)
      if (delErr) { showMsg('Помилка видалення: ' + delErr.message, true); return }
      cancelEdit()
      showMsg(`Об'єднано з наявним рядком: тепер ${total} ${unitOf(newName)}`)
      loadItems()
      return
    }
  }

  const { error } = await supabase.from('items').update({ item_name: newName, notes: f.notes.trim(), ...cols }).eq('id', item.id)
  if (error) {
    console.error('SUPABASE ERROR:', error)
    showMsg(insertErrorText(error), true)
    return
  }
  cancelEdit()
  showMsg('Зміни збережено')
  loadItems()
}

const deleteItem = async (id) => {
      // Підтвердження: видалення безповоротне, а командир отримає про нього повідомлення в Telegram
      const item = items.value.find(i => i.id === id)
      const what = item
        ? `«${item.item_name}»\nПозиція: ${item.position_name}\nСтатус: ${item.status}\nКількість: ${item.quantity} ${unitOf(item.item_name)}`
        : 'цей запис'
      if (!window.confirm(`Видалити назавжди?\n\n${what}\n\nЦю дію не можна скасувати. Командир отримає повідомлення про видалення.`)) return

      const { error } = await supabase.from('items').delete().eq('id', id)
        if (error) {
                showMsg('Помилка видалення: ' + error.message, true)
        } else {
                loadItems()
                    showMsg('Видалено')
        }
}

// Розбір назви запису для звіту:
// «Рація + павук — Motorola, S/N 123» -> назва / марка / серійний номер
// «Дрони — Mavic 3T» -> назва / вид
const parseItemName = full => {
  const s = String(full || '')
  const i = s.indexOf(' — ')
  if (i < 0) return { base: s, detail: '', brand: '', serial: '' }
  const base = s.slice(0, i)
  const rest = s.slice(i + 3)
  const m = rest.match(/^(?:(.*?),\s*)?(S\/N|KIT)\s+(.+)$/)
  if (m && m[2] === 'KIT') return { base, detail: (m[1] || '').trim(), brand: '', serial: m[3].trim() }
  if (m) return { base, detail: '', brand: (m[1] || '').trim(), serial: m[3].trim() }
  return { base, detail: rest, brand: '', serial: '' }
}

// Складові запису: з колонок variant / brand / serial, а для старих записів (без колонок) розбираємо назву
const itemParts = item => {
  const parsed = parseItemName(item.item_name)
  if (!(item.variant || item.brand || item.serial)) return parsed
  return { base: parsed.base, detail: item.variant || '', brand: item.brand || '', serial: item.serial || '' }
}

// Рядки звіту: окремі колонки для виду, марки, серійного номера, кількості й одиниці виміру
const buildReportRows = list => {
  const posIndex = name => { const i = POSITIONS.indexOf(name); return i < 0 ? 999 : i }
  const cmp = (a, b) => String(a).localeCompare(String(b), 'uk', { numeric: true })
  return (list || [])
    .map(item => ({ item, p: itemParts(item) }))
    .sort((a, b) =>
      posIndex(a.item.position_name) - posIndex(b.item.position_name) ||
      cmp(a.item.category, b.item.category) || cmp(a.p.base, b.p.base) ||
      cmp(a.p.detail, b.p.detail) || cmp(a.p.serial, b.p.serial) || cmp(a.item.status, b.item.status))
    .map(({ item, p }) => ({
      'Позиція': item.position_name,
      'Категорія': item.category,
      'Найменування': p.base,
      'Вид / модель / назва': p.detail,
      'Марка': p.brand,
      'Серійний номер / KIT': p.serial,
      'Статус': item.status,
      'Кількість': Number(item.quantity),
      'Од.': unitOf(item.item_name),
      'Наявність': Number(item.quantity) > 0 ? '' : 'НЕМАЄ',
      'Примітки': item.notes || ''
    }))
}

// Підсумок: однакове майно рахується разом (KIT і серійні номери не розділяють групу).
// «Разом є» = На позиції + На ремонт (це майно, яке є); «Потреба» окремо, бо це не наявність.
const buildSummaryRows = (list, withPosition) => {
  const groups = new Map()
  for (const item of list || []) {
    const p = itemParts(item)
    const label = p.detail || p.brand
    const key = [withPosition ? item.position_name : '', item.category, p.base, label].join('\u0001')
    if (!groups.has(key)) {
      groups.set(key, { pos: withPosition ? item.position_name : 'Усі позиції', cat: item.category, base: p.base, label, unit: unitOf(item.item_name), ok: 0, rep: 0, need: 0 })
    }
    const g = groups.get(key)
    const q = Number(item.quantity) || 0
    if (item.status === 'На позиції') g.ok = round2(g.ok + q)
    else if (item.status === 'На ремонт') g.rep = round2(g.rep + q)
    else if (item.status === 'Потреба') g.need = round2(g.need + q)
  }
  const posIndex = name => { const i = POSITIONS.indexOf(name); return i < 0 ? 999 : i }
  const cmp = (a, b) => String(a).localeCompare(String(b), 'uk', { numeric: true })
  return [...groups.values()]
    .sort((a, b) => posIndex(a.pos) - posIndex(b.pos) || cmp(a.cat, b.cat) || cmp(a.base, b.base) || cmp(a.label, b.label))
    .map(g => ({
      'Позиція': g.pos,
      'Категорія': g.cat,
      'Найменування': g.base,
      'Вид / марка': g.label,
      'На позиції': g.ok,
      'На ремонт': g.rep,
      'Разом є': round2(g.ok + g.rep),
      'Потреба': g.need,
      'Од.': g.unit,
      'Наявність': round2(g.ok + g.rep) > 0 ? '' : 'НЕМАЄ'
    }))
}
// «Позиція «Чіпс»» -> «Чіпс» (для підказок і імені файлу; без символів, заборонених в іменах файлів)
const positionLabel = name => String(name || '').replace(/^Позиція\s+/, '').replace(/[«»"\\/:*?<>|]/g, '').trim()

const exportExcel = async () => {
  try {
    let query = supabase.from('items').select('*')
    if (reportPosition.value) query = query.eq('position_name', reportPosition.value)
    const { data: allItems, error } = await query
    if (error) throw error

    if (!allItems || !allItems.length) {
      showMsg(reportPosition.value ? `На позиції «${positionLabel(reportPosition.value)}» немає майна для звіту` : 'Немає майна для звіту', true)
      return
    }

    // У звіт потрапляють усі рядки, зокрема з кількістю 0 (це позначка «немає»)
    const reportData = buildReportRows(allItems)

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(reportData)
    ws['!cols'] = [18, 14, 28, 26, 16, 18, 12, 10, 6, 11, 28].map(wch => ({ wch }))
    XLSX.utils.book_append_sheet(wb, ws, 'Облік майна')

    // Підсумок: однакове майно разом (по позиціях), а для кількох позицій ще й загальний
    const wsSum = XLSX.utils.json_to_sheet(buildSummaryRows(allItems, true))
    wsSum['!cols'] = [18, 14, 28, 26, 11, 11, 10, 10, 6, 11].map(wch => ({ wch }))
    XLSX.utils.book_append_sheet(wb, wsSum, 'Підсумок')
    if (new Set(allItems.map(i => i.position_name)).size > 1) {
      const wsAll = XLSX.utils.json_to_sheet(buildSummaryRows(allItems, false))
      wsAll['!cols'] = [14, 14, 28, 26, 11, 11, 10, 10, 6, 11].map(wch => ({ wch }))
      XLSX.utils.book_append_sheet(wb, wsAll, 'Разом')
    }

    const prefix = unitName.value ? `_${unitName.value.replace(/\s+/g, '')}` : ''
    const dateStr = new Date().toLocaleDateString('uk-UA').replace(/\./g, '-')
    const posPart = reportPosition.value ? `_${positionLabel(reportPosition.value).replace(/\s+/g, '')}` : '_УсіПозиції'
    XLSX.writeFile(wb, `Звіт_Склад${prefix}${posPart}_${dateStr}.xlsx`)
    showMsg('Excel файл успішно завантажено!')
  } catch (err) {
    console.error('EXCEL ERROR:', err)
    showMsg('Помилка вивантаження Excel!', true)
  }
}

</script>

<template>
  <div class="app-container">
      <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>

      <div v-if="editingItem" class="modal-backdrop" @click.self="cancelEdit">
      <form class="modal-box" @submit.prevent="saveEdit">
      <h4>✎ Редагувати запис</h4>
      <div class="modal-sub">{{ editingItem.position_name }} · {{ editingItem.item_name }}</div>

      <template v-if="editPreset && editPreset.kit">
      <label class="modal-label">{{ editPreset.variantLabel ? editPreset.variantLabel.charAt(0).toUpperCase() + editPreset.variantLabel.slice(1) : 'Вид' }} *</label>
      <select v-model="editForm.variant" class="styled-select">
      <option v-if="editForm.variant && !editPreset.variants.includes(editForm.variant)" :value="editForm.variant">{{ editForm.variant }} (немає в списку)</option>
      <option v-for="m in editPreset.variants" :key="m" :value="m">{{ m }}</option>
      </select>
      <label class="modal-label">Номер KIT *</label>
      <input v-model="editForm.serial" class="styled-input" />
      </template>

      <template v-else-if="editPreset && editPreset.needsSerial">
      <label v-if="!editPreset.noBrand" class="modal-label">Марка *</label>
      <input v-if="!editPreset.noBrand" v-model="editForm.brand" class="styled-input" />
      <label class="modal-label">Серійний номер *</label>
      <input v-model="editForm.serial" class="styled-input" />
      </template>

      <template v-else-if="editPreset && editPreset.variants">
      <label class="modal-label">{{ editPreset.variantLabel ? editPreset.variantLabel.charAt(0).toUpperCase() + editPreset.variantLabel.slice(1) : 'Вид' }} *</label>
      <select v-model="editForm.variant" class="styled-select">
      <option v-if="editForm.variant && !editPreset.variants.includes(editForm.variant)" :value="editForm.variant">{{ editForm.variant }} (немає в списку)</option>
      <option v-for="m in editPreset.variants" :key="m" :value="m">{{ m }}</option>
      </select>
      </template>

      <template v-else-if="editPreset && editPreset.freeName">
      <label class="modal-label">Назва *</label>
      <input v-model="editForm.name" class="styled-input" />
      </template>

      <template v-else-if="editPreset && editPreset.lengthM">
      <label class="modal-label">Довжина одного відрізка, м *</label>
      <input v-model="editForm.length" type="number" min="0.1" step="0.1" class="styled-input" />
      </template>

      <template v-else-if="!editPreset">
      <label class="modal-label">Назва *</label>
      <input v-model="editForm.fullName" class="styled-input" />
      </template>

      <label class="modal-label">Примітки</label>
      <input v-model="editForm.notes" class="styled-input" />

      <div class="modal-actions">
      <button type="button" class="btn btn-secondary" @click="cancelEdit">Скасувати</button>
      <button type="submit" class="btn btn-success modal-save">Зберегти</button>
      </div>
      </form>
      </div>

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

          <select v-if="currentPreset && currentPreset.variants" v-model="variant" class="styled-select item-select">
            <option value="" disabled>Оберіть {{ currentPreset.variantLabel || 'вид' }} *</option>
            <option v-for="m in currentPreset.variants" :key="m" :value="m">{{ m }}</option>
          </select>

          <input v-if="currentPreset && currentPreset.freeName" v-model="customName" placeholder="Назва *" class="styled-input" />

<input v-if="currentPreset && currentPreset.lengthM" v-model="lengthM" type="number" min="0.1" step="0.1" placeholder="Довжина одного відрізка, м *" class="styled-input" />

<input v-if="currentPreset && currentPreset.kit" v-model="kitNumbers" placeholder="Номер KIT *" class="styled-input" />

<div v-if="currentPreset && currentPreset.extra" class="router-row">
<label class="router-label">{{ currentPreset.extra.label }} (необов'язково):</label>
<input type="number" v-model="extraQty" min="0" step="1" :placeholder="'К-ть: ' + currentPreset.extra.plural" class="styled-input qty-input" />
</div>

                                                                                                                <select v-model="status" class="styled-select status-select">
                                                                                                                            <option value="На позиції">🟢 На позиції</option>
                                                                                                                                        <option value="Потреба">🟡 Потреба</option>
                                                                                                                                                    <option value="На ремонт">🔴 На ремонт</option>
                                                                                                                                                              </select>

                                                                                                                                                                        <div class="qty-notes-row">
                                                                                                                                                                                    <input type="number" v-model="quantity" :disabled="currentPreset && (currentPreset.needsSerial || currentPreset.kit)" min="0" :step="currentPreset && currentPreset.unit ? '0.1' : '1'" :placeholder="currentPreset && currentPreset.unit === 'л' ? 'Літри' : (currentPreset && currentPreset.unit === 'м' ? 'Метри' : (currentPreset && currentPreset.lengthM ? 'К-ть відрізків' : 'К-ть'))" class="styled-input qty-input font-bold" />
                                                                                                                                                                                                <input v-model="notes" placeholder="Примітки / номер" class="styled-input notes-input" />
                                                                                                                                                                                                          </div>

                                                                                                                                                                                                                    <button type="submit" class="btn btn-success">Додати на позицію</button>
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
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    <input type="number" min="0" :step="allowsDecimal(item.item_name) ? '0.1' : '1'" :value="item.quantity" @change="e => updateItemQty(item.id, e.target.value)" class="styled-input qty-edit font-bold" />
<div v-if="allowsDecimal(item.item_name)" class="qty-unit">{{ unitOf(item.item_name) }}</div>
<div v-if="Number(item.quantity) === 0" class="no-stock">немає</div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    </td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    <td class="td-action">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      <button @click="startEdit(item)" class="edit-btn" title="Редагувати">✎</button>
<button @click="deleteItem(item.id)" class="del-btn">✕</button>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      </td>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    </tr>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <tr v-if="items.length === 0">
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  <td colspan="4" class="text-center text-gray-400 py-4">На цій позиції поки немає майна.</td>
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
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        <div class="report-scope">
<label class="block text-xs font-bold text-gray-600 mb-1">Звіт для:</label>
<select v-model="reportPosition" class="styled-select font-bold report-select">
<option value="">Усі позиції</option>
<option v-for="pos in POSITIONS" :key="pos" :value="pos">{{ pos }}</option>
</select>
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
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .th-action, .td-action { width: 90px; text-align: center; white-space: nowrap; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .status-cell-select { font-size: 12px; font-weight: bold; padding: 6px; border-radius: 6px; width: 100%; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .status-green { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .status-orange { background: #fffbeb; color: #92400e; border-color: #fde68a; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .status-red { background: #fef2f2; color: #991b1b; border-color: #fecaca; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .qty-edit { width: 65px; text-align: center; padding: 6px; font-size: 14px; }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .item-meta { color: #64748b; font-size: 11px; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .qty-unit { font-size: 11px; color: #64748b; margin-top: 2px; }
.no-stock { font-size: 11px; font-weight: 700; color: #991b1b; background: #fef2f2; border-radius: 4px; margin-top: 2px; padding: 1px 4px; }
.edit-btn { color: #1d4ed8; background: #dbeafe; border: none; cursor: pointer; font-weight: bold; font-size: 14px; padding: 6px 10px; border-radius: 6px; margin-right: 4px; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 12px; }
.modal-box { background: #fff; border-radius: 10px; padding: 16px; width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 6px; max-height: 92vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.modal-sub { font-size: 12px; color: #64748b; margin-bottom: 4px; word-break: break-word; }
.modal-label { font-size: 12px; font-weight: 700; color: #475569; margin-top: 4px; }
.modal-actions { display: flex; gap: 8px; margin-top: 10px; }
.modal-save { flex: 1; width: auto; padding: 10px 14px; font-size: 14px; }
.del-btn { color: #dc2626; background: #fee2e2; border: none; cursor: pointer; font-weight: bold; font-size: 13px; padding: 6px 10px; border-radius: 6px; }

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    .router-row { display: flex; align-items: center; gap: 8px; }
.router-label { font-size: 12px; font-weight: 600; color: #475569; }
.report-scope { margin-top: 10px; }
.report-select { width: 100%; }
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