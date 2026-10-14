<script setup>
import { ref } from 'vue';
import * as XLSX from 'xlsx';
import { db } from '../db.js';
import { unitName, showMsg, saveUnitName } from '../store.js';

const localUnitName = ref(unitName.value);

const handleSaveUnit = () => {
      saveUnitName(localUnitName.value);
        showMsg('Назву підрозділу збережено!');
};

const exportExcel = async () => {
      try {
            const wb = XLSX.utils.book_new();
                
                    const positions = await db.positions.toArray();
                        const items = await db.items.toArray();

                            const reportData = items.map(item => {
                                      const pos = positions.find(p => p.id === item.positionId);
                                            return {
                                                        'Позиція': pos ? pos.name : 'Невідомо',
                                                                'Категорія': item.category,
                                                                        'Назва / Дрон': item.itemName,
                                                                                'Статус': item.status,
                                                                                        'Кількість': item.quantity,
                                                                                                'Примітки': item.notes || ''
                                            };
                            });

                                const wsSklad = XLSX.utils.json_to_sheet(reportData);
                                    XLSX.utils.book_append_sheet(wb, wsSklad, 'Облік майна');

                                        const prefix = unitName.value ? `_${unitName.value.replace(/\s+/g, '')}` : '';
                                            const dateStr = new Date().toLocaleDateString('uk-UA').replace(/\./g, '-');
                                                XLSX.writeFile(wb, `Звіт_Склад_БПЛА${prefix}_${dateStr}.xlsx`);
                                                    showMsg('Файл Excel завантажено!');
      } catch (error) {
            showMsg('Помилка генерації Excel!', true);
      }
};
</script>

<template>
  <div class="bg-white p-5 rounded-2xl shadow-sm space-y-6">
      <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label class="block text-sm font-bold text-gray-600 mb-2">Ваш підрозділ / Позивний</label>
                  <div class="flex gap-2">
                          <input v-model="localUnitName" type="text" placeholder="Напр. 128 ОГШБр" class="flex-1 bg-white border border-gray-300 rounded-lg p-2 font-bold outline-none" />
                                  <button @click="handleSaveUnit" class="bg-slate-700 text-white px-4 rounded-lg font-bold text-sm">Зберегти</button>
                                        </div>
                                              <p class="text-xs text-gray-500 mt-2">Буде додано до назви Excel файлу.</p>
                                                  </div>
                                                      <hr class="border-gray-200" />
                                                          <div>
                                                                <button @click="exportExcel" class="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black py-4 rounded-xl text-lg shadow-lg flex items-center justify-center gap-2">📊 ВИГРУЗИТИ В EXCEL</button>
                                                                    </div>
                                                                      </div>
                                                                      </template>
      }
                                            }
                            })
      }
}
}